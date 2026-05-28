import { getBrand, updateBrand, deleteBrand } from '@/lib/mongodb-store';
import { maskBrand } from '@/lib/mask-brand';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, canAccessBrand, COOKIE_NAME } from '@/lib/auth';

async function getUser() {
  const cookieStore = await cookies();
  return await verifySession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!canAccessBrand(user, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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
    const user = await getUser();
    if (!canAccessBrand(user, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();

    // Only forward fields that were explicitly provided in the request body.
    // This prevents overwriting secrets (e.g. shopifyAccessToken) that the
    // masked API response returns as null/undefined.
    const allowedFields = [
      'name', 'logoUrl', 'shopifyStoreUrl', 'shopifyAccessToken',
      'ga4PropertyId', 'ga4ServiceAccountJson', 'ga4RefreshToken',
      'metaAppId', 'metaAppSecret', 'metaAccessToken', 'metaAdAccountId',
      'metaManagedPages', 'metaInstagramAccountIds',
      'googleAdsDevToken', 'googleAdsClientId', 'googleAdsClientSecret',
      'googleAdsRefreshToken', 'googleAdsCustomerId',
      'geminiApiKey',
      'tiktokAccessToken', 'tiktokAdvertiserId',
      'klaviyoApiKey',
      'pinterestAccessToken', 'pinterestAdAccountId',
      'customDashboard', 'savedMetrics', 'competitors',
      'cogsPercent', 'avgShippingCost', 'avgReturnRate',
      'alertRules',
      'events',
      'trackedWebsites',
      'windsorApiKey',
      'synterApiKey',
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
    const user = await getUser();
    // Only admins (allowedBrands === null) can delete brands
    if (!user || user.allowedBrands !== null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await deleteBrand(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
