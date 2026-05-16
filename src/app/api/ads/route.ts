import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as meta from '@/lib/services/meta';
import * as googleAds from '@/lib/services/google-ads';
import { requireBrandAccess } from '@/lib/auth-server';
import {
  demoMetaKPIs, demoMetaCampaigns, demoMetaSpend,
  demoMetaFunnel, demoMetaAdSets, demoMetaAds,
  demoMetaDemographics, demoMetaPlacements, demoMetaDevices,
  demoGoogleAdsKPIs, demoGoogleAdsCampaigns, demoGoogleAdsSpend,
} from '@/lib/demo-data';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const platform = searchParams.get('platform') ?? 'meta';
    const action = searchParams.get('action') ?? 'kpis';
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');
    const dateRange = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') ?? '30d');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug!);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // ── Demo mode ──────────────────────────────────────────────────────────
    if (slug === 'demo') {
      if (platform === 'meta') {
        switch (action) {
          case 'kpis': return NextResponse.json(demoMetaKPIs);
          case 'campaigns': return NextResponse.json(demoMetaCampaigns);
          case 'adsets': return NextResponse.json(demoMetaAdSets);
          case 'ads': return NextResponse.json(demoMetaAds);
          case 'spend': return NextResponse.json(demoMetaSpend);
          case 'funnel': return NextResponse.json(demoMetaFunnel);
          case 'demographics': return NextResponse.json(demoMetaDemographics);
          case 'placements': return NextResponse.json(demoMetaPlacements);
          case 'devices': return NextResponse.json(demoMetaDevices);
          case 'permissions': return NextResponse.json({ granted: ['ads_read','ads_management','pages_show_list','pages_read_engagement','instagram_basic'], declined: [], expired: [], hasPageAccess: true, hasInstagramAccess: true, pagesCount: 1, adAccountCount: 1 });
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
        case 'adsets':
          return NextResponse.json(await meta.getAdSets(config, dateRange));
        case 'ads':
          return NextResponse.json(await meta.getAds(config, dateRange));
        case 'spend':
          return NextResponse.json(await meta.getSpendOverTime(config, dateRange));
        case 'funnel':
          return NextResponse.json(await meta.getFunnel(config, dateRange));
        case 'demographics':
          return NextResponse.json(await meta.getDemographics(config, dateRange));
        case 'placements':
          return NextResponse.json(await meta.getPlacements(config, dateRange));
        case 'devices':
          return NextResponse.json(await meta.getDevices(config, dateRange));
        case 'countries':
          return NextResponse.json(await meta.getCountries(config, dateRange));
        case 'permissions':
          return NextResponse.json(await meta.getPermissions(config.accessToken));
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    // ---- Google Ads ----
    if (platform === 'google') {
      // devToken / clientId / clientSecret live in env vars (shared across all brands)
      const devToken     = brand.googleAdsDevToken     || process.env.GOOGLE_ADS_DEV_TOKEN;
      const clientId     = brand.googleAdsClientId     || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = brand.googleAdsClientSecret || process.env.GOOGLE_CLIENT_SECRET;

      // OAuth state — what the user controls via the Connect button
      if (!brand.googleAdsRefreshToken || !brand.googleAdsCustomerId) {
        return NextResponse.json({ error: 'Google Ads not connected' }, { status: 400 });
      }
      // Server config — what the deployer controls via env vars
      const missing: string[] = [];
      if (!devToken)     missing.push('GOOGLE_ADS_DEV_TOKEN');
      if (!clientId)     missing.push('GOOGLE_CLIENT_ID');
      if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
      if (missing.length > 0) {
        return NextResponse.json({
          error: `Google Ads server config incomplete — missing env vars: ${missing.join(', ')}`,
        }, { status: 500 });
      }

      const config: googleAds.GoogleAdsConfig = {
        devToken,
        clientId,
        clientSecret,
        // Manager Account ID — required when dev token belongs to an MCC
        // and customerId is a client under it. Set GOOGLE_ADS_LOGIN_CUSTOMER_ID
        // env var to your MCC ID (digits only, no hyphens).
        loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
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
