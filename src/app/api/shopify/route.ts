import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as shopify from '@/lib/services/shopify';

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

// ── In-memory cache (1 hr TTL) ────────────────────────────────────────────────
const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheGet(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

function cacheClear(slug: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${slug}:`)) cache.delete(key);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

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
    const slug = searchParams.get('slug');
    const action = searchParams.get('action') || 'kpis';
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');
    const dateRange = searchParams.get('range') || '30d';

    if (!slug) {
      return NextResponse.json({ error: 'Brand slug required' }, { status: 400 });
    }

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

    // ── Refresh: clear in-memory cache AND MongoDB order cache for this brand ─
    if (action === 'refresh') {
      cacheClear(slug);
      // Also clear the MongoDB incremental order cache so fresh data is fetched
      try {
        const { clearCachedDays } = await import('@/lib/shopify-sync');
        await clearCachedDays(slug);
      } catch (e) {
        console.error('Failed to clear MongoDB order cache:', e);
      }
      return NextResponse.json({ ok: true, message: 'Cache cleared' });
    }

    // Cache key includes slug + action + date range
    const cacheKey = `${slug}:${action}:${fromParam ?? dateRange}:${toParam ?? ''}`;
    const cached = cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build effective date range string: custom "YYYY-MM-DD:YYYY-MM-DD" takes precedence
    const effectiveDateRange = fromParam && toParam ? `${fromParam}:${toParam}` : dateRange;

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

    // Don't cache 'test' or 'orders' (recent orders always fresh)
    if (action !== 'test' && action !== 'orders') {
      cacheSet(cacheKey, result);
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
