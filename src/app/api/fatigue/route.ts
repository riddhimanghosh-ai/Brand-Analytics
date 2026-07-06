import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getCreativeFatigue, type MetaConfig } from '@/lib/services/meta';
import { demoFatigue } from '@/lib/demo-data';

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const dateRange = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') ?? '30d');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(demoFatigue);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.metaAccessToken || !brand.metaAdAccountId) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }

    const config: MetaConfig = {
      accessToken: brand.metaAccessToken,
      adAccountId: brand.metaAdAccountId,
    };

    const data = await getCreativeFatigue(config, dateRange);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[fatigue] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
