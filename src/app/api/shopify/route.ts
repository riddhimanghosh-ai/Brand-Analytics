import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as shopify from '@/lib/services/shopify';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/analytics-cache';
import { requireBrandAccess } from '@/lib/auth-server';

// Tell Next.js / Amplify Lambda to allow up to 120s for this route.
// High-volume stores (10k+ orders/90d) need ~50s to paginate all orders
// with Shopify's 2000-point GraphQL rate-limit bucket (100pt/s restore).
export const maxDuration = 120;
import {
  demoShopifyKPIs,
  demoShopifyRevenue,
  demoShopifyProducts,
  demoShopifyOrders,
  demoShopifyCustomers,
  demoShopifyOrderStatus,
  demoShopifyCombined,
  demoShopifyAdvanced,
  demoShopifyConversionFunnel,
} from '@/lib/demo-data';

function getDateRangeForShopify(
  range: string,
  fromParam?: string | null,
  toParam?: string | null,
): { startDate: string; endDate: string } {
  const today = new Date().toISOString().split('T')[0];
  if (fromParam && toParam) return { startDate: fromParam, endDate: toParam };
  const now = new Date();
  const days = ({ '7d': 7, '30d': 30, '90d': 90, '1y': 365 } as Record<string, number>)[range] ?? 30;
  const start = new Date(now.getTime() - days * 86_400_000);
  return { startDate: start.toISOString().split('T')[0], endDate: today };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugParam = searchParams.get('slug');
    const action = searchParams.get('action') || 'kpis';
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');
    const dateRange = searchParams.get('range') || '30d';

    // ── Authorization: verify the user can access this brand ────────────────
    const { denied } = await requireBrandAccess(slugParam);
    if (denied) return denied;
    const slug: string = slugParam!; // non-null after requireBrandAccess

    const brand = await getBrand(slug);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // ── Demo mode ──────────────────────────────────────────────────────────
    if (slug === 'demo') {
      switch (action) {
        case 'kpis': return NextResponse.json(demoShopifyKPIs);
        case 'revenue': return NextResponse.json(demoShopifyRevenue);
        case 'products': return NextResponse.json(demoShopifyProducts);
        case 'orders': return NextResponse.json(demoShopifyOrders);
        case 'customers': return NextResponse.json(demoShopifyCustomers);
        case 'order-status': return NextResponse.json(demoShopifyOrderStatus);
        case 'combined': return NextResponse.json(demoShopifyCombined);
        case 'advanced': return NextResponse.json(demoShopifyAdvanced);
        case 'conversion-funnel': return NextResponse.json(demoShopifyConversionFunnel);
        case 'shop': return NextResponse.json({ name: 'Demo Store', currency: 'INR', domain: 'demo.myshopify.com' });
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const config = {
      storeUrl: brand.shopifyStoreUrl,
      accessToken: brand.shopifyAccessToken,
      slug, // enables incremental MongoDB order cache in getAllAnalytics
    };

    const { startDate, endDate } = getDateRangeForShopify(dateRange, fromParam, toParam);

    // ── Refresh: invalidate MongoDB cache for this brand ──────────────────────
    if (action === 'refresh') {
      const { clearCachedDays } = await import('@/lib/shopify-sync');
      await Promise.all([cacheInvalidate(slug), clearCachedDays(slug)]);
      return NextResponse.json({ ok: true, message: 'Cache cleared' });
    }

    // Actions that should never be cached
    const noCache = action === 'test' || action === 'orders' || action === 'shop';

    // Build effective date range string
    const effectiveDateRange = fromParam && toParam ? `${fromParam}:${toParam}` : dateRange;

    // ── Check MongoDB cache first ─────────────────────────────────────────────
    if (!noCache) {
      const cached = await cacheGet(slug, action, effectiveDateRange);
      if (cached) {
        console.log(`[shopify-cache] HIT ${slug}:${action}:${effectiveDateRange}`);
        return NextResponse.json(cached);
      }
      console.log(`[shopify-cache] MISS ${slug}:${action}:${effectiveDateRange} — fetching from Shopify`);
    }

    // ── Fetch fresh data ──────────────────────────────────────────────────────
    let result: unknown;

    switch (action) {
      case 'shop':
        result = await shopify.getShopInfo(config); break;
      case 'kpis':
        result = await shopify.getKPIs(config, effectiveDateRange); break;
      case 'revenue':
        result = await shopify.getRevenueOverTime(config, effectiveDateRange); break;
      case 'products':
        result = await shopify.getTopProducts(config, effectiveDateRange); break;
      case 'orders':
        result = await shopify.getRecentOrders(config); break;
      case 'customers':
        result = await shopify.getCustomerSegments(config, effectiveDateRange); break;
      case 'order-status':
        result = await shopify.getOrderStatusBreakdown(config, effectiveDateRange); break;
      case 'combined':
        result = await shopify.getAllAnalytics(config, effectiveDateRange); break;
      case 'advanced':
        result = await shopify.getAdvancedCROMetrics(config, effectiveDateRange); break;
      case 'conversion-funnel':
        result = await shopify.getOrderConversionFunnel(config, startDate, endDate); break;
      case 'test':
        result = await shopify.testConnection(config); break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Store result in MongoDB cache
    if (!noCache) {
      await cacheSet(slug, action, effectiveDateRange, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Shopify API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Shopify API error' },
      { status: 500 }
    );
  }
}
