import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as meta from '@/lib/services/meta';
import * as googleAds from '@/lib/services/google-ads';
import {
  demoMetaKPIs, demoMetaCampaigns, demoMetaSpend,
  demoGoogleAdsKPIs, demoGoogleAdsCampaigns, demoGoogleAdsSpend,
} from '@/lib/demo-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const platform = searchParams.get('platform') ?? 'meta';
    const action = searchParams.get('action') ?? 'kpis';
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');
    const dateRange = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') ?? '30d');

    if (!slug) {
      return NextResponse.json({ error: 'Brand slug required' }, { status: 400 });
    }

    const brand = await getBrand(slug);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // ── Demo mode ──────────────────────────────────────────────────────────
    if (slug === 'demo') {
      if (platform === 'meta') {
        switch (action) {
          case 'kpis': return NextResponse.json(demoMetaKPIs);
          case 'campaigns': return NextResponse.json(demoMetaCampaigns);
          case 'spend': return NextResponse.json(demoMetaSpend);
          default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
      }
      if (platform === 'google') {
        switch (action) {
          case 'kpis': return NextResponse.json(demoGoogleAdsKPIs);
          case 'campaigns': return NextResponse.json(demoGoogleAdsCampaigns);
          case 'spend': return NextResponse.json(demoGoogleAdsSpend);
          default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
      }
      return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
    }
    // ────────────────────────────────────────────────────────────────────────

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
