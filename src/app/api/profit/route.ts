import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import * as meta from '@/lib/services/meta';
import * as googleAds from '@/lib/services/google-ads';
import * as synter from '@/lib/services/synter';
import * as windsor from '@/lib/services/windsor';
import * as shopifyService from '@/lib/services/shopify';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const dateRange = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') ?? '30d');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    // ── Shopify revenue ────────────────────────────────────────────────────────
    let shopifyRevenue = 0;
    let shopifyOrders = 0;
    let shopifyRevenueSeries: { date: string; revenue: number }[] = [];

    if (brand.shopifyStoreUrl && brand.shopifyAccessToken) {
      try {
        const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken };
        let combined = await cacheGet(slug!, 'combined', dateRange) as Awaited<ReturnType<typeof shopifyService.getAllAnalytics>> | null;
        if (!combined) {
          combined = await shopifyService.getAllAnalytics(config, dateRange);
          await cacheSet(slug!, 'combined', dateRange, combined);
        }
        shopifyRevenue = combined?.kpis?.totalRevenue ?? 0;
        shopifyOrders = combined?.kpis?.totalOrders ?? 0;
        shopifyRevenueSeries = (combined?.revenue ?? []).map(p => ({ date: p.date, revenue: p.revenue }));
      } catch (e) {
        console.warn('[profit] Shopify fetch failed:', e);
      }
    }

    // ── Meta ad spend ──────────────────────────────────────────────────────────
    let metaSpend = 0;
    let metaRevenue = 0;
    let metaSpendSeries: { date: string; spend: number }[] = [];

    if (brand.metaAccessToken && brand.metaAdAccountId) {
      try {
        const config: meta.MetaConfig = {
          accessToken: brand.metaAccessToken,
          adAccountId: brand.metaAdAccountId,
        };
        const [kpis, spendArr] = await Promise.all([
          meta.getKPIs(config, dateRange),
          meta.getSpendOverTime(config, dateRange),
        ]);
        metaSpend = kpis.spend ?? 0;
        metaRevenue = kpis.purchaseValue ?? 0;
        metaSpendSeries = spendArr.map((p) => ({ date: p.date, spend: p.spend }));
      } catch (e) {
        console.warn('[profit] Meta fetch failed:', e);
      }
    }

    // ── Google Ads spend ───────────────────────────────────────────────────────
    // Same source-priority chain as the ads API: Synter → Windsor → direct API
    let googleSpend = 0;
    let googleRevenue = 0;
    let googleSpendSeries: { date: string; spend: number }[] = [];
    let googleFetched = false;

    const synterKey = brand.synterApiKey || process.env.SYNTER_API_KEY;
    if (synterKey) {
      try {
        const [kpis, spendArr] = await Promise.all([
          synter.getKPIs(synterKey, dateRange),
          synter.getSpendOverTime(synterKey, dateRange),
        ]);
        googleSpend = kpis.spend ?? 0;
        googleRevenue = kpis.conversionValue ?? 0;
        googleSpendSeries = spendArr.map((p) => ({ date: p.date, spend: p.spend }));
        googleFetched = true;
      } catch (e) {
        console.warn('[profit] Synter fetch failed:', e);
      }
    }

    const windsorKey = brand.windsorApiKey || process.env.WINDSOR_API_KEY;
    if (!googleFetched && windsorKey) {
      try {
        const [kpis, spendArr] = await Promise.all([
          windsor.getKPIs(windsorKey, dateRange),
          windsor.getSpendOverTime(windsorKey, dateRange),
        ]);
        googleSpend = kpis.spend ?? 0;
        googleRevenue = kpis.conversionValue ?? 0;
        googleSpendSeries = spendArr.map((p) => ({ date: p.date, spend: p.spend }));
        googleFetched = true;
      } catch (e) {
        console.warn('[profit] Windsor fetch failed:', e);
      }
    }

    const devToken = brand.googleAdsDevToken || process.env.GOOGLE_ADS_DEV_TOKEN;
    const clientId = brand.googleAdsClientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = brand.googleAdsClientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!googleFetched && brand.googleAdsRefreshToken && brand.googleAdsCustomerId && devToken && clientId && clientSecret) {
      try {
        const config: googleAds.GoogleAdsConfig = {
          devToken, clientId, clientSecret,
          refreshToken: brand.googleAdsRefreshToken,
          customerId: brand.googleAdsCustomerId,
          loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
        };
        const [kpis, spendArr] = await Promise.all([
          googleAds.getKPIs(config, dateRange),
          googleAds.getSpendOverTime(config, dateRange),
        ]);
        googleSpend = kpis.spend ?? 0;
        googleRevenue = kpis.conversionValue ?? 0;
        googleSpendSeries = spendArr.map((p) => ({ date: p.date, spend: p.spend }));
      } catch (e) {
        console.warn('[profit] Google Ads fetch failed:', e);
      }
    }

    // ── P&L calculation ────────────────────────────────────────────────────────
    const cogsPercent = brand.cogsPercent ?? 0;       // % of revenue
    const avgShippingCost = brand.avgShippingCost ?? 0; // per order INR
    const avgReturnRate = brand.avgReturnRate ?? 0;    // % of revenue

    const totalAdSpend = metaSpend + googleSpend;
    const cogsCost = (cogsPercent / 100) * shopifyRevenue;
    const shippingCost = avgShippingCost * shopifyOrders;
    const returnCost = (avgReturnRate / 100) * shopifyRevenue;
    const netRevenue = shopifyRevenue - returnCost;
    const grossProfit = netRevenue - cogsCost;
    const contributionMargin = grossProfit - totalAdSpend - shippingCost;
    const mer = totalAdSpend > 0 ? shopifyRevenue / totalAdSpend : 0; // Marketing Efficiency Ratio
    const grossMarginPct = shopifyRevenue > 0 ? (grossProfit / shopifyRevenue) * 100 : 0;
    const netMarginPct = shopifyRevenue > 0 ? (contributionMargin / shopifyRevenue) * 100 : 0;
    // Break-even ROAS: what ROAS you need to cover COGS + shipping (no profit)
    const breakEvenRoas = cogsPercent > 0
      ? 1 / (1 - cogsPercent / 100 - (shopifyOrders > 0 ? (avgShippingCost * shopifyOrders) / shopifyRevenue : 0))
      : 0;

    // ── Build combined daily series ────────────────────────────────────────────
    const dateMap: Record<string, { revenue: number; adSpend: number }> = {};
    for (const p of shopifyRevenueSeries) {
      dateMap[p.date] = { revenue: p.revenue, adSpend: 0 };
    }
    for (const p of metaSpendSeries) {
      if (!dateMap[p.date]) dateMap[p.date] = { revenue: 0, adSpend: 0 };
      dateMap[p.date].adSpend += p.spend;
    }
    for (const p of googleSpendSeries) {
      if (!dateMap[p.date]) dateMap[p.date] = { revenue: 0, adSpend: 0 };
      dateMap[p.date].adSpend += p.spend;
    }
    const dailySeries = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const dayRevenue = d.revenue;
        const daySpend = d.adSpend;
        const dayCogs = (cogsPercent / 100) * dayRevenue;
        const dayProfit = dayRevenue - dayCogs - daySpend;
        return { date, revenue: dayRevenue, adSpend: daySpend, cogs: dayCogs, profit: dayProfit };
      });

    return NextResponse.json({
      // Summary KPIs
      shopifyRevenue,
      shopifyOrders,
      metaSpend,
      metaRevenue,
      googleSpend,
      googleRevenue,
      totalAdSpend,
      cogsCost,
      shippingCost,
      returnCost,
      netRevenue,
      grossProfit,
      contributionMargin,
      mer,
      grossMarginPct,
      netMarginPct,
      breakEvenRoas,
      // Settings used
      cogsPercent,
      avgShippingCost,
      avgReturnRate,
      // Series
      dailySeries,
    });
  } catch (error) {
    console.error('[profit] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
