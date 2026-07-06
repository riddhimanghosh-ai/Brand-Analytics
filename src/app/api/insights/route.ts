import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getCustomerInsights } from '@/lib/services/shopify';
import { demoInsights } from '@/lib/demo-data';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    // Long-window analysis: 90d / 180d / 365d (default 180d)
    const rangeDays = ['90', '180', '365'].includes(searchParams.get('days') ?? '')
      ? Number(searchParams.get('days'))
      : 180;

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(demoInsights);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    // parseDateRange only knows fixed presets — build an explicit from:to range
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - rangeDays * 86_400_000).toISOString().split('T')[0];
    const dateRange = `${from}:${to}`;

    const cached = await cacheGet(slug!, 'customer-insights-v2', dateRange);
    if (cached) return NextResponse.json(cached);

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
    const data = await getCustomerInsights(config, dateRange);
    await cacheSet(slug!, 'customer-insights-v2', dateRange, data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[insights] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
