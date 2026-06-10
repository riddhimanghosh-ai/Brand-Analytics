import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getInventoryStatus, getCustomerInsights } from '@/lib/services/shopify';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 300;

export interface RestockRow {
  title: string;
  stock: number;
  dailyRate: number;        // blended daily sales rate (last 35 days)
  daysOfCover: number;      // stock ÷ dailyRate
  status: 'critical' | 'low' | 'healthy' | 'overstocked' | 'dead';
  suggestedReorder: number; // units to cover leadTimeDays + bufferDays
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

    const BUFFER_DAYS = 7;
    const rows: RestockRow[] = inventory
      .filter(p => p.tracksInventory)
      .map(p => {
        const rate = rateByTitle.get(p.title);
        const dailyRate = rate?.dailyRate ?? 0;
        const daysOfCover = dailyRate > 0 ? p.totalInventory / dailyRate : Infinity;

        let status: RestockRow['status'];
        if (dailyRate === 0 && p.totalInventory > 0) status = 'dead';
        else if (daysOfCover < 7) status = 'critical';
        else if (daysOfCover < 21) status = 'low';
        else if (daysOfCover > 120 && dailyRate > 0) status = 'overstocked';
        else status = 'healthy';

        const targetUnits = dailyRate * (leadTimeDays + BUFFER_DAYS);
        const suggestedReorder = status === 'critical' || status === 'low'
          ? Math.max(0, Math.ceil(targetUnits - p.totalInventory))
          : 0;

        return {
          title: p.title,
          stock: p.totalInventory,
          dailyRate: +dailyRate.toFixed(2),
          daysOfCover: Number.isFinite(daysOfCover) ? +daysOfCover.toFixed(1) : 9999,
          status,
          suggestedReorder,
        };
      })
      // Most urgent first
      .sort((a, b) => a.daysOfCover - b.daysOfCover);

    return NextResponse.json({ rows, leadTimeDays, bufferDays: BUFFER_DAYS });
  } catch (error) {
    console.error('[restock] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
