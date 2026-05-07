import { getBrand, updateBrand, deleteBrand } from '@/lib/mongodb-store';
import { maskBrand } from '@/lib/mask-brand';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brand = await getBrand(id);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    // Never return raw secrets to the client
    return NextResponse.json(maskBrand(brand));
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only forward fields that were explicitly provided in the request body.
    // This prevents overwriting secrets (e.g. shopifyAccessToken) that the
    // masked API response returns as null/undefined.
    const allowedFields = [
      'name', 'logoUrl', 'shopifyStoreUrl', 'shopifyAccessToken',
      'ga4PropertyId', 'ga4ServiceAccountJson',
      'metaAppId', 'metaAppSecret', 'metaAccessToken', 'metaAdAccountId',
      'googleAdsDevToken', 'googleAdsClientId', 'googleAdsClientSecret',
      'googleAdsRefreshToken', 'googleAdsCustomerId',
      'geminiApiKey',
      'tiktokAccessToken', 'tiktokAdvertiserId',
      'klaviyoApiKey',
      'pinterestAccessToken', 'pinterestAdAccountId',
      'customDashboard',
    ];
    const updates = Object.fromEntries(
      allowedFields
        .filter(f => f in body)
        .map(f => [f, body[f]])
    );

    const brand = await updateBrand(id, updates);

    // Never return raw secrets to the client
    return NextResponse.json(maskBrand(brand));
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteBrand(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
