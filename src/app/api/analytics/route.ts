import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as ga4 from '@/lib/services/ga4';
import {
  demoGA4KPIs, demoGA4Sessions, demoGA4Channels, demoGA4Devices,
  demoGA4Pages, demoGA4Countries, demoGA4LandingPages, demoGA4Events,
  demoGA4ConversionFunnel, demoGA4ProductFunnel,
} from '@/lib/demo-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
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
      switch (action) {
        case 'kpis': return NextResponse.json(demoGA4KPIs);
        case 'sessions': return NextResponse.json(demoGA4Sessions);
        case 'channels': return NextResponse.json(demoGA4Channels);
        case 'devices': return NextResponse.json(demoGA4Devices);
        case 'pages': return NextResponse.json(demoGA4Pages);
        case 'countries': return NextResponse.json(demoGA4Countries);
        case 'landing-pages': return NextResponse.json(demoGA4LandingPages);
        case 'events': return NextResponse.json(demoGA4Events);
        case 'conversion-funnel': return NextResponse.json(demoGA4ConversionFunnel);
        case 'product-funnel': return NextResponse.json(demoGA4ProductFunnel);
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!brand.ga4PropertyId || !brand.ga4ServiceAccountJson) {
      return NextResponse.json({ error: 'Google Analytics not connected' }, { status: 400 });
    }

    const config: ga4.GA4Config = {
      propertyId: brand.ga4PropertyId,
      serviceAccountJson: brand.ga4ServiceAccountJson,
    };

    switch (action) {
      case 'kpis':
        return NextResponse.json(await ga4.getKPIs(config, dateRange));
      case 'sessions':
        return NextResponse.json(await ga4.getSessionsOverTime(config, dateRange));
      case 'channels':
        return NextResponse.json(await ga4.getTrafficChannels(config, dateRange));
      case 'devices':
        return NextResponse.json(await ga4.getDeviceBreakdown(config, dateRange));
      case 'pages':
        return NextResponse.json(await ga4.getTopPages(config, dateRange));
      case 'countries':
        return NextResponse.json(await ga4.getTopCountries(config, dateRange));
      case 'landing-pages':
        return NextResponse.json(await ga4.getLandingPages(config, dateRange));
      case 'events':
        return NextResponse.json(await ga4.getKeyEvents(config, dateRange));
      case 'conversion-funnel':
        return NextResponse.json(await ga4.getConversionFunnel(config, dateRange));
      case 'product-funnel':
        return NextResponse.json(await ga4.getProductConversionFunnel(config, dateRange));
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
