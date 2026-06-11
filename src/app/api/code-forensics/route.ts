import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getDiscountCodePerformance } from '@/lib/services/shopify';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 120;

export interface CodeForensicsRow {
  code: string;
  orders: number;
  revenue: number;
  aov: number;
  newCustomerShare: number;
  totalDiscount: number;
  avgDiscountPct: number;
  repeatCustomerShare: number;
  dealHunterScore: number;
  verdict: 'growth_driver' | 'deal_hunters' | 'mixed' | 'low_volume';
  verdictReason: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const dateRange = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') ?? '90d');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const cached = await cacheGet(slug!, 'code-forensics', dateRange);
    if (cached) return NextResponse.json(cached);

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
    // Use 90d minimum for customer-behaviour signal
    const wideRange = ['7d', '14d', '30d'].includes(dateRange) ? '90d' : dateRange;
    const discountData = await getDiscountCodePerformance(config, wideRange);

    const rows: CodeForensicsRow[] = discountData.codes
      .filter(c => c.orders >= 3)
      .map(c => {
        const repeatCustomerShare = Math.max(0, 100 - c.newCustomerShare);
        const discountPct = c.avgDiscountPct ?? 0;

        // Deal-hunter score 0–100: high new-customer share + high discount = deal hunters
        const dealHunterScore = Math.round(
          (c.newCustomerShare / 100) * 60 +
          Math.min(discountPct / 30, 1) * 40
        );

        let verdict: CodeForensicsRow['verdict'];
        let verdictReason: string;

        if (c.orders < 10) {
          verdict = 'low_volume';
          verdictReason = 'Too few orders to draw conclusions — check back once ≥10 orders';
        } else if (dealHunterScore >= 65) {
          verdict = 'deal_hunters';
          verdictReason = `${c.newCustomerShare.toFixed(0)}% first-time buyers, ${discountPct.toFixed(0)}% avg discount — mostly price-driven; consider capping or rotating`;
        } else if (dealHunterScore <= 35) {
          verdict = 'growth_driver';
          verdictReason = `${repeatCustomerShare.toFixed(0)}% repeat customers, low discount dependency — high-quality acquisition code`;
        } else {
          verdict = 'mixed';
          verdictReason = `Mix of new and returning customers — monitor over more orders`;
        }

        return {
          code: c.code,
          orders: c.orders,
          revenue: c.revenue,
          aov: c.aov,
          newCustomerShare: c.newCustomerShare,
          totalDiscount: c.totalDiscount,
          avgDiscountPct: discountPct,
          repeatCustomerShare,
          dealHunterScore,
          verdict,
          verdictReason,
        };
      })
      .sort((a, b) => b.orders - a.orders);

    const result = { rows, summary: discountData.summary, dateRange: wideRange };
    await cacheSet(slug!, 'code-forensics', dateRange, result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
