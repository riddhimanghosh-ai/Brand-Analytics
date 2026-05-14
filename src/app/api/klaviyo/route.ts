import { getBrand } from '@/lib/mongodb-store';
import { getKPIs, getCampaigns, getFlows } from '@/lib/services/klaviyo';
import { NextResponse } from 'next/server';
import { demoKlaviyoKPIs, demoKlaviyoCampaigns, demoKlaviyoFlows } from '@/lib/demo-data';
import { requireBrandAccess } from '@/lib/auth';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    // ── Demo mode ──────────────────────────────────────────────────────────
    if (slug === 'demo') {
      return NextResponse.json({ kpis: demoKlaviyoKPIs, campaigns: demoKlaviyoCampaigns, flows: demoKlaviyoFlows, error: null });
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!brand.klaviyoApiKey) {
      return NextResponse.json({ error: 'Klaviyo not connected' }, { status: 400 });
    }

    const config = { apiKey: brand.klaviyoApiKey };

    const [kpis, campaigns, flows] = await Promise.allSettled([
      getKPIs(config),
      getCampaigns(config),
      getFlows(config),
    ]);

    return NextResponse.json({
      kpis: kpis.status === 'fulfilled' ? kpis.value : null,
      campaigns: campaigns.status === 'fulfilled' ? campaigns.value : [],
      flows: flows.status === 'fulfilled' ? flows.value : [],
      error: kpis.status === 'rejected' ? String(kpis.reason) : null,
    });
  } catch (err) {
    console.error('Klaviyo route error:', err);
    return NextResponse.json({ error: 'Failed to fetch Klaviyo data' }, { status: 500 });
  }
}
