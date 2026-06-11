import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getSearchTerms } from '@/lib/services/ga4';
import { getProductTitles } from '@/lib/services/shopify';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 60;

function hasProductMatch(term: string, titles: string[]): boolean {
  const words = term.split(/\s+/).filter(w => w.length > 2);
  return titles.some(title => words.some(w => title.includes(w)));
}

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

    if (!brand.ga4PropertyId) {
      return NextResponse.json({ hasGA4: false, hasSearchData: false, terms: [] });
    }

    const cached = await cacheGet(slug!, 'search-gaps', dateRange);
    if (cached) return NextResponse.json(cached);

    const ga4Config = {
      propertyId: brand.ga4PropertyId,
      serviceAccountJson: (brand as Record<string, unknown>).ga4ServiceAccountJson as string | undefined,
      refreshToken: (brand as Record<string, unknown>).ga4RefreshToken as string | undefined,
    };

    const [terms, productTitles] = await Promise.all([
      getSearchTerms(ga4Config, dateRange),
      brand.shopifyStoreUrl && brand.shopifyAccessToken
        ? getProductTitles({ storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! })
        : Promise.resolve([] as string[]),
    ]);

    if (terms.length === 0) {
      const result = { hasGA4: true, hasSearchData: false, terms: [], totalSearches: 0 };
      await cacheSet(slug!, 'search-gaps', dateRange, result);
      return NextResponse.json(result);
    }

    const totalSearches = terms.reduce((s, t) => s + t.searches, 0);
    const result = {
      hasGA4: true,
      hasSearchData: true,
      totalSearches,
      terms: terms.map(t => ({
        term: t.term,
        searches: t.searches,
        share: totalSearches > 0 ? (t.searches / totalSearches) * 100 : 0,
        hasProductMatch: hasProductMatch(t.term, productTitles),
      })),
    };

    await cacheSet(slug!, 'search-gaps', dateRange, result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
