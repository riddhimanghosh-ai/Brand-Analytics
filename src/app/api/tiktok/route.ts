import { getBrand } from '@/lib/google-sheets-store';
import { getKPIs, getCampaigns } from '@/lib/services/tiktok';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const range = searchParams.get('range') || '30d';

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const brand = await getBrand(slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    if (!brand.tiktokAccessToken || !brand.tiktokAdvertiserId) {
      return NextResponse.json({ error: 'TikTok Ads not connected' }, { status: 400 });
    }

    const config = { accessToken: brand.tiktokAccessToken, advertiserId: brand.tiktokAdvertiserId };

    const [kpis, campaigns] = await Promise.allSettled([
      getKPIs(config, range),
      getCampaigns(config, range),
    ]);

    return NextResponse.json({
      kpis: kpis.status === 'fulfilled' ? kpis.value : null,
      campaigns: campaigns.status === 'fulfilled' ? campaigns.value : [],
      error: kpis.status === 'rejected' ? String(kpis.reason) : null,
    });
  } catch (err) {
    console.error('TikTok route error:', err);
    return NextResponse.json({ error: 'Failed to fetch TikTok data' }, { status: 500 });
  }
}
