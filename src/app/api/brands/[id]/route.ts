import { getBrand, updateBrand, deleteBrand, getBrands } from '@/lib/google-sheets-store';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // The [id] param is actually the slug in our case
    const brand = await getBrand(id);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json(brand);
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

    const brand = await updateBrand(id, {
      name: body.name,
      logoUrl: body.logoUrl,
      shopifyStoreUrl: body.shopifyStoreUrl,
      shopifyAccessToken: body.shopifyAccessToken,
      ga4PropertyId: body.ga4PropertyId,
      ga4ServiceAccountJson: body.ga4ServiceAccountJson,
      metaAppId: body.metaAppId,
      metaAppSecret: body.metaAppSecret,
      metaAccessToken: body.metaAccessToken,
      metaAdAccountId: body.metaAdAccountId,
      googleAdsDevToken: body.googleAdsDevToken,
      googleAdsClientId: body.googleAdsClientId,
      googleAdsClientSecret: body.googleAdsClientSecret,
      googleAdsRefreshToken: body.googleAdsRefreshToken,
      googleAdsCustomerId: body.googleAdsCustomerId,
      geminiApiKey: body.geminiApiKey,
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
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
