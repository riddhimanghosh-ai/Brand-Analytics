import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as shopify from '@/lib/services/shopify';
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
    };

    const { startDate, endDate } = getDateRangeForShopify(dateRange, fromParam, toParam);

    switch (action) {
      case 'shop':
        return NextResponse.json(await shopify.getShopInfo(config));

      case 'kpis':
        return NextResponse.json(await shopify.getKPIs(config, dateRange));

      case 'revenue':
        return NextResponse.json(await shopify.getRevenueOverTime(config, dateRange));

      case 'products':
        return NextResponse.json(await shopify.getTopProducts(config, dateRange));

      case 'orders':
        return NextResponse.json(await shopify.getRecentOrders(config));

      case 'customers':
        return NextResponse.json(await shopify.getCustomerSegments(config, dateRange));

      case 'order-status':
        return NextResponse.json(await shopify.getOrderStatusBreakdown(config, dateRange));

      case 'combined':
        return NextResponse.json(await shopify.getAllAnalytics(config, dateRange));

      case 'advanced':
        return NextResponse.json(await shopify.getAdvancedCROMetrics(config, dateRange));

      case 'conversion-funnel':
        return NextResponse.json(await shopify.getOrderConversionFunnel(config, startDate, endDate));

      case 'test':
        return NextResponse.json(await shopify.testConnection(config));

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Shopify API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Shopify API error' },
      { status: 500 }
    );
  }
}
