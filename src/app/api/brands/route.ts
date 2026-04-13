import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        shopifyStoreUrl: true,
        shopifyAccessToken: true,
        ga4PropertyId: true,
        metaAccessToken: true,
        googleAdsCustomerId: true,
        geminiApiKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Mask sensitive tokens in response
    const maskedBrands = brands.map((b) => ({
      ...b,
      shopifyAccessToken: b.shopifyAccessToken ? '••••' + b.shopifyAccessToken.slice(-4) : null,
      metaAccessToken: b.metaAccessToken ? '••••' + b.metaAccessToken.slice(-4) : null,
      geminiApiKey: b.geminiApiKey ? '••••' + b.geminiApiKey.slice(-4) : null,
    }));

    return NextResponse.json(maskedBrands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const brand = await prisma.brand.create({
      data: {
        userId: user.id,
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
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
