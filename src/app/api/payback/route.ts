import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getCustomerInsights } from '@/lib/services/shopify';
import * as meta from '@/lib/services/meta';
import { demoPayback } from '@/lib/demo-data';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 300;

export interface PaybackCohort {
  cohort: string;            // "YYYY-MM"
  newCustomers: number;
  adSpend: number;           // Meta spend that month
  cac: number;               // adSpend ÷ newCustomers
  cumRevenuePerCustomer: number[];      // M0, M+1…
  cumGrossPerCustomer: number[];        // after COGS
  paybackMonth: number | null;          // first offset where gross ≥ CAC
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const days = ['180', '365'].includes(searchParams.get('days') ?? '') ? Number(searchParams.get('days')) : 180;

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(demoPayback);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }
    if (!brand.metaAccessToken || !brand.metaAdAccountId) {
      return NextResponse.json({ error: 'Meta Ads not connected — CAC needs ad spend data' }, { status: 400 });
    }

    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
    const dateRange = `${from}:${to}`;

    // Customer cohorts (cached, shared with segments/cohorts/velocity pages)
    let insights = await cacheGet(slug!, 'customer-insights-v2', dateRange) as Awaited<ReturnType<typeof getCustomerInsights>> | null;
    if (!insights) {
      const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
      insights = await getCustomerInsights(config, dateRange);
      await cacheSet(slug!, 'customer-insights-v2', dateRange, insights);
    }

    // Meta daily spend → monthly buckets
    const metaConfig: meta.MetaConfig = { accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId };
    const spendSeries = await meta.getSpendOverTime(metaConfig, dateRange);
    const spendByMonth = new Map<string, number>();
    for (const p of spendSeries) {
      const m = p.date.slice(0, 7);
      spendByMonth.set(m, (spendByMonth.get(m) ?? 0) + p.spend);
    }

    const cogsPercent = brand.cogsPercent ?? 0;
    const grossMargin = cogsPercent > 0 ? 1 - cogsPercent / 100 : 1; // 1 = revenue payback if COGS unset

    const cohorts: PaybackCohort[] = (insights.cohortLtv ?? [])
      .filter(c => spendByMonth.has(c.cohort) && c.customers > 0)
      .map(c => {
        const adSpend = spendByMonth.get(c.cohort)!;
        const cac = adSpend / c.customers;
        const cumGross = c.cumRevenuePerCustomer.map(r => +(r * grossMargin).toFixed(0));
        let paybackMonth: number | null = null;
        for (let i = 0; i < cumGross.length; i++) {
          if (cumGross[i] >= cac) { paybackMonth = i; break; }
        }
        return {
          cohort: c.cohort,
          newCustomers: c.customers,
          adSpend: Math.round(adSpend),
          cac: Math.round(cac),
          cumRevenuePerCustomer: c.cumRevenuePerCustomer,
          cumGrossPerCustomer: cumGross,
          paybackMonth,
        };
      });

    // Headline stats over mature cohorts (exclude current month)
    const currentMonth = to.slice(0, 7);
    const mature = cohorts.filter(c => c.cohort !== currentMonth);
    const avgCac = mature.length ? mature.reduce((s, c) => s + c.cac, 0) / mature.length : 0;
    const m0Recovery = mature.length
      ? mature.reduce((s, c) => s + (c.cac > 0 ? (c.cumGrossPerCustomer[0] ?? 0) / c.cac : 0), 0) / mature.length * 100
      : 0;
    const paybacks = mature.filter(c => c.paybackMonth !== null);

    return NextResponse.json({
      cohorts,
      avgCac: Math.round(avgCac),
      m0RecoveryPct: +m0Recovery.toFixed(1),
      paidBackCohorts: paybacks.length,
      matureCohorts: mature.length,
      grossMarginUsed: +(grossMargin * 100).toFixed(0),
      cogsConfigured: cogsPercent > 0,
      spendSource: 'meta',
      rangeDays: days,
    });
  } catch (error) {
    console.error('[payback] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
