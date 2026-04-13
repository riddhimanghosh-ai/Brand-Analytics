import { getBrand } from '@/lib/github-store';
import { NextResponse } from 'next/server';
import * as meta from '@/lib/services/meta';
import * as googleAds from '@/lib/services/google-ads';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const platform = searchParams.get('platform') ?? 'meta';
    const action = searchParams.get('action') ?? 'kpis';
    const dateRange = searchParams.get('range') ?? '30d';

    if (!slug) {
      return NextResponse.json({ error: 'Brand slug required' }, { status: 400 });
    }

    const brand = await getBrand(slug);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // ---- Meta Ads ----
    if (platform === 'meta') {
      if (!brand.metaAccessToken || !brand.metaAdAccountId) {
        return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
      }

      const config: meta.MetaConfig = {
        accessToken: brand.metaAccessToken,
        adAccountId: brand.metaAdAccountId,
      };

      switch (action) {
        case 'kpis':
          return NextResponse.json(await meta.getKPIs(config, dateRange));
        case 'campaigns':
          return NextResponse.json(await meta.getCampaigns(config, dateRange));
        case 'spend':
          return NextResponse.json(await meta.getSpendOverTime(config, dateRange));
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    // ---- Google Ads ----
    if (platform === 'google') {
      if (
        !brand.googleAdsDevToken ||
        !brand.googleAdsCustomerId ||
        !brand.googleAdsRefreshToken ||
        !brand.googleAdsClientId ||
        !brand.googleAdsClientSecret
      ) {
        return NextResponse.json({ error: 'Google Ads not connected' }, { status: 400 });
      }

      const config: googleAds.GoogleAdsConfig = {
        devToken: brand.googleAdsDevToken,
        clientId: brand.googleAdsClientId,
        clientSecret: brand.googleAdsClientSecret,
        refreshToken: brand.googleAdsRefreshToken,
        customerId: brand.googleAdsCustomerId,
      };

      switch (action) {
        case 'kpis':
          return NextResponse.json(await googleAds.getKPIs(config, dateRange));
        case 'campaigns':
          return NextResponse.json(await googleAds.getCampaigns(config, dateRange));
        case 'spend':
          return NextResponse.json(await googleAds.getSpendOverTime(config, dateRange));
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  } catch (error) {
    console.error('Ads API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
