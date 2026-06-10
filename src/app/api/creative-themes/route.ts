import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getCreativeFatigue, type MetaConfig } from '@/lib/services/meta';

export const maxDuration = 120;

// Theme dictionary — matched against ad names (most specific first).
// Ad naming conventions like "DC_SmellsLike_MotionGraphic_UGC" make this work.
const THEMES: Array<{ key: string; label: string; icon: string; pattern: RegExp }> = [
  { key: 'ugc',         label: 'UGC',            icon: '🤳', pattern: /ugc/i },
  { key: 'influencer',  label: 'Influencer',     icon: '⭐', pattern: /influencer|creator|collab/i },
  { key: 'testimonial', label: 'Testimonial',    icon: '💬', pattern: /testimonial|review/i },
  { key: 'motion',      label: 'Motion Graphic', icon: '✨', pattern: /motion ?graph|mograph/i },
  { key: 'video',       label: 'Video',          icon: '🎬', pattern: /video|reel(?!up)/i },
  { key: 'carousel',    label: 'Carousel',       icon: '🎠', pattern: /carousel/i },
  { key: 'static',      label: 'Static Image',   icon: '🖼️', pattern: /static|image/i },
  { key: 'dco',         label: 'DCO / Dynamic',  icon: '🤖', pattern: /\bdco\b|\bdpa\b|dynamic/i },
  { key: 'offer',       label: 'Offer-led',      icon: '🏷️', pattern: /bogo|b\dg\d|buy ?\d|@ ?\d|offer|sale|discount|\d+ ?%|deal|free/i },
  { key: 'hook',        label: 'Hook / Thumbstop', icon: '🪝', pattern: /thumbscroll|thumbstop|hook/i },
];

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
    if (!brand.metaAccessToken || !brand.metaAdAccountId) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }

    const config: MetaConfig = {
      accessToken: brand.metaAccessToken,
      adAccountId: brand.metaAdAccountId,
    };

    // Reuse the fatigue fetch — ad-level metrics for up to 500 ads
    const { ads } = await getCreativeFatigue(config, dateRange);
    if (ads.length === 0) {
      return NextResponse.json({ error: 'No ads with spend in this period' }, { status: 422 });
    }

    type Agg = {
      ads: number; spend: number; revenue: number; purchases: number;
      impressions: number; ctrWeighted: number; topAds: Array<{ name: string; spend: number; roas: number }>;
    };
    const agg = new Map<string, Agg>();
    const bump = (key: string, ad: typeof ads[number]) => {
      const a = agg.get(key) ?? { ads: 0, spend: 0, revenue: 0, purchases: 0, impressions: 0, ctrWeighted: 0, topAds: [] };
      a.ads++;
      a.spend += ad.spend;
      a.revenue += ad.roas * ad.spend;
      a.purchases += ad.purchases;
      a.impressions += ad.impressions;
      a.ctrWeighted += ad.ctr * ad.impressions;
      a.topAds.push({ name: ad.name, spend: ad.spend, roas: ad.roas });
      agg.set(key, a);
    };

    for (const ad of ads) {
      const matched = THEMES.filter(t => t.pattern.test(ad.name));
      if (matched.length === 0) bump('unclassified', ad);
      else for (const t of matched) bump(t.key, ad);
    }

    const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
    const totalRevenue = ads.reduce((s, a) => s + a.roas * a.spend, 0);

    const themes = [...agg.entries()]
      .map(([key, a]) => {
        const def = THEMES.find(t => t.key === key);
        return {
          key,
          label: def?.label ?? 'Unclassified',
          icon: def?.icon ?? '❓',
          ads: a.ads,
          spend: Math.round(a.spend),
          revenue: Math.round(a.revenue),
          roas: a.spend > 0 ? +(a.revenue / a.spend).toFixed(2) : 0,
          ctr: a.impressions > 0 ? +(a.ctrWeighted / a.impressions).toFixed(2) : 0,
          purchases: a.purchases,
          spendShare: totalSpend > 0 ? +((a.spend / totalSpend) * 100).toFixed(1) : 0,
          revenueShare: totalRevenue > 0 ? +((a.revenue / totalRevenue) * 100).toFixed(1) : 0,
          topAds: a.topAds.sort((x, y) => y.spend - x.spend).slice(0, 3),
        };
      })
      .sort((a, b) => b.spend - a.spend);

    return NextResponse.json({
      themes,
      totalAds: ads.length,
      totalSpend: Math.round(totalSpend),
      totalRevenue: Math.round(totalRevenue),
      note: 'Ads can match multiple themes, so theme spend can overlap.',
    });
  } catch (error) {
    console.error('[creative-themes] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
