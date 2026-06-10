import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getInventoryStatus, getCustomerInsights } from '@/lib/services/shopify';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 300;

export interface RestockRow {
  title: string;
  stock: number;            // live (ACTIVE listing) stock
  reserveStock: number;     // stock parked on draft "(backup)"/"- Test" duplicates
  listingEmpty: boolean;    // live listing at 0 while reserve exists — restock the listing!
  dailyRate: number;        // blended daily sales rate (last 35 days)
  daysOfCover: number;      // (live + reserve) ÷ dailyRate
  status: 'critical' | 'low' | 'healthy' | 'overstocked' | 'dead';
  suggestedReorder: number; // units to cover leadTimeDays + bufferDays beyond physical stock
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const leadTimeDays = Math.min(120, Math.max(7, Number(searchParams.get('leadTime') ?? 30)));

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };

    // Velocity comes from the shared customer-insights computation (cached);
    // inventory is a fast products query.
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0];
    const insightsRange = `${from}:${to}`;

    let insights = await cacheGet(slug!, 'customer-insights-v2', insightsRange) as Awaited<ReturnType<typeof getCustomerInsights>> | null;
    const [inventory, freshInsights] = await Promise.all([
      getInventoryStatus(config),
      insights ? Promise.resolve(null) : getCustomerInsights(config, insightsRange),
    ]);
    if (!insights && freshInsights) {
      insights = freshInsights;
      await cacheSet(slug!, 'customer-insights-v2', insightsRange, freshInsights);
    }

    // Blend last-7 and prior-28 daily rates (weighted toward recent)
    const rateByTitle = new Map<string, { dailyRate: number; lastSoldDate: string | null }>();
    for (const v of insights?.velocity ?? []) {
      const blended = v.dailyAvgLast7 * 0.6 + v.dailyAvgPrior28 * 0.4;
      rateByTitle.set(v.title, { dailyRate: blended, lastSoldDate: v.lastSoldDate });
    }

    // This store parks reserve stock on DRAFT duplicates of live products,
    // e.g. "Oak & Smoke – 50ml (backup)" / "… - Test". Match drafts to their
    // live product by normalised base title and count them as reserve.
    const normalize = (t: string) =>
      t.toLowerCase()
        .replace(/[–—]/g, '-')
        .replace(/\s*\(backup\)\s*$/i, '')
        .replace(/\s*-\s*test\s*$/i, '')
        .replace(/\s*\(test\)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    const active = inventory.filter(p => p.tracksInventory && p.status === 'ACTIVE');
    const reserveByBase = new Map<string, number>();
    for (const p of inventory) {
      if (p.status === 'ACTIVE' || !p.tracksInventory || p.totalInventory <= 0) continue;
      const base = normalize(p.title);
      reserveByBase.set(base, (reserveByBase.get(base) ?? 0) + p.totalInventory);
    }

    const BUFFER_DAYS = 7;
    const rows: RestockRow[] = active
      .map(p => {
        const rate = rateByTitle.get(p.title);
        const dailyRate = rate?.dailyRate ?? 0;
        const reserveStock = reserveByBase.get(normalize(p.title)) ?? 0;
        const physicalStock = p.totalInventory + reserveStock;
        const daysOfCover = dailyRate > 0 ? physicalStock / dailyRate : Infinity;

        let status: RestockRow['status'];
        if (dailyRate === 0 && physicalStock > 0) status = 'dead';
        else if (p.totalInventory <= 0 && dailyRate > 0) status = 'critical'; // live listing empty = sales stopped
        else if (daysOfCover < 7) status = 'critical';
        else if (daysOfCover < 21) status = 'low';
        else if (daysOfCover > 120 && dailyRate > 0) status = 'overstocked';
        else status = 'healthy';

        const targetUnits = dailyRate * (leadTimeDays + BUFFER_DAYS);
        const suggestedReorder = status === 'critical' || status === 'low'
          ? Math.max(0, Math.ceil(targetUnits - physicalStock))
          : 0;

        return {
          title: p.title,
          stock: p.totalInventory,
          reserveStock,
          listingEmpty: p.totalInventory <= 0 && reserveStock > 0 && dailyRate > 0,
          dailyRate: +dailyRate.toFixed(2),
          daysOfCover: Number.isFinite(daysOfCover) ? +daysOfCover.toFixed(1) : 9999,
          status,
          suggestedReorder,
        };
      })
      // Most urgent first: status severity, then fewest days of cover
      .sort((a, b) => {
        const rank: Record<RestockRow['status'], number> = { critical: 0, low: 1, healthy: 2, overstocked: 3, dead: 4 };
        return rank[a.status] - rank[b.status] || a.daysOfCover - b.daysOfCover;
      });

    return NextResponse.json({ rows, leadTimeDays, bufferDays: BUFFER_DAYS });
  } catch (error) {
    console.error('[restock] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
