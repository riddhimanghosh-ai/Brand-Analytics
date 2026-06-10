import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getDiscountCodePerformance } from '@/lib/services/shopify';
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
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const cached = await cacheGet(slug!, 'discounts', dateRange);
    if (cached) return NextResponse.json(cached);

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
    const data = await getDiscountCodePerformance(config, dateRange);
    await cacheSet(slug!, 'discounts', dateRange, data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[discounts] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
