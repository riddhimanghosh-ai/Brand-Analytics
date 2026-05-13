import { NextResponse } from 'next/server';
import { getBrand } from '@/lib/mongodb-store';
import * as meta from '@/lib/services/meta';
import {
  getAdsByPageIds,
  searchAdsByKeyword,
  E_COMM_BENCHMARKS,
  type CompetitorConfig,
} from '@/lib/services/competitor-ads';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug     = searchParams.get('slug');
    const action   = searchParams.get('action') ?? 'ads';
    const pageIds  = searchParams.get('pageIds') ?? '';
    const q        = searchParams.get('q') ?? '';
    const status   = (searchParams.get('status') ?? 'ALL') as 'ACTIVE' | 'INACTIVE' | 'ALL';
    const range    = searchParams.get('range') ?? '30d';

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const brand = await getBrand(slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    // ── Benchmarks — no Meta connection required ───────────────────────────
    if (action === 'benchmarks') {
      let brandMetaKPIs = null;
      let brandGoogleKPIs = null;

      // Try to fetch brand's real KPIs if connected
      if (brand.metaAccessToken && brand.metaAdAccountId) {
        try {
          brandMetaKPIs = await meta.getKPIs(
            { accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId },
            range
          );
        } catch { /* silently skip if token expired */ }
      }

      return NextResponse.json({
        benchmarks: E_COMM_BENCHMARKS,
        brandMeta: brandMetaKPIs,
        brandGoogle: brandGoogleKPIs,
      });
    }

    // ── All other actions require Meta access token ────────────────────────
    if (!brand.metaAccessToken) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }

    const config: CompetitorConfig = { accessToken: brand.metaAccessToken };

    switch (action) {
      case 'ads': {
        // Fetch by saved page IDs
        const ids = pageIds.split(',').map((s) => s.trim()).filter(Boolean);
        if (ids.length === 0) {
          return NextResponse.json([]);
        }
        const ads = await getAdsByPageIds(config, ids, status);
        return NextResponse.json(ads);
      }

      case 'search': {
        if (!q.trim()) return NextResponse.json([]);
        const ads = await searchAdsByKeyword(config, q, status);
        return NextResponse.json(ads);
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Competitor ads API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Competitor ads API error' },
      { status: 500 }
    );
  }
}
