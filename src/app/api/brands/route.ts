import { getBrands, createBrand } from '@/lib/google-sheets-store';
import { maskBrand, maskBrands } from '@/lib/mask-brand';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const brands = await getBrands();
    return NextResponse.json(maskBrands(brands));
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const brand = await createBrand({
      id: randomUUID(),
      name: body.name,
      slug,
      logoUrl: body.logoUrl || null,
      shopifyStoreUrl: body.shopifyStoreUrl || null,
      shopifyAccessToken: body.shopifyAccessToken || null,
      ga4PropertyId: body.ga4PropertyId || null,
      ga4ServiceAccountJson: body.ga4ServiceAccountJson || null,
      metaAppId: body.metaAppId || null,
      metaAppSecret: body.metaAppSecret || null,
      metaAccessToken: body.metaAccessToken || null,
      metaAdAccountId: body.metaAdAccountId || null,
      googleAdsDevToken: body.googleAdsDevToken || null,
      googleAdsClientId: body.googleAdsClientId || null,
      googleAdsClientSecret: body.googleAdsClientSecret || null,
      googleAdsRefreshToken: body.googleAdsRefreshToken || null,
      googleAdsCustomerId: body.googleAdsCustomerId || null,
      geminiApiKey: body.geminiApiKey || null,
    });

    // Never return raw secrets — return the masked brand
    return NextResponse.json(maskBrand(brand), { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
