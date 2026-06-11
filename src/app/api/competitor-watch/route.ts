import { NextResponse } from 'next/server';
import type { TrackedProductSnapshot, SitemapEntry } from '@/types';

export const maxDuration = 60;

// Scans a competitor Shopify store's public surface:
//  - /products.json  → catalog with published_at (launches, stockouts)
//  - /sitemap.xml    → pages/collections/blogs sub-sitemaps (campaign watch)

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function isBlockedHost(hostname: string): boolean {
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
  if (blocked.includes(hostname)) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
  return false;
}

interface ShopifyPublicProduct {
  id: number;
  title: string;
  handle: string;
  published_at?: string | null;
  images?: Array<{ src: string }>;
  variants?: Array<{ price: string; compare_at_price: string | null; available?: boolean }>;
}

async function fetchProductsPage(origin: string, page: number): Promise<ShopifyPublicProduct[]> {
  const res = await fetch(`${origin}/products.json?limit=250&page=${page}`, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(12_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${origin}/products.json`);
  const data = await res.json() as { products?: ShopifyPublicProduct[] };
  return data.products ?? [];
}

async function fetchAllProducts(origin: string): Promise<TrackedProductSnapshot[]> {
  const page1 = await fetchProductsPage(origin, 1);
  let all = page1;
  if (page1.length === 250) {
    try { all = [...page1, ...await fetchProductsPage(origin, 2)]; } catch { /* best-effort */ }
  }
  return all.map(p => {
    const variants = p.variants ?? [];
    const prices = variants.map(v => parseFloat(v.price)).filter(n => !isNaN(n));
    const compareAts = variants
      .map(v => (v.compare_at_price ? parseFloat(v.compare_at_price) : NaN))
      .filter(n => !isNaN(n) && n > 0);
    return {
      id: String(p.id),
      title: p.title,
      handle: p.handle,
      price: prices.length ? Math.min(...prices) : 0,
      compareAtPrice: compareAts.length ? Math.min(...compareAts) : null,
      available: variants.some(v => v.available !== false),
      imageUrl: p.images?.[0]?.src ?? null,
      publishedAt: p.published_at ?? null,
    };
  });
}

// ── Sitemap ─────────────────────────────────────────────────────────────────

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/xml,text/xml,*/*' },
    signal: AbortSignal.timeout(12_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

function extractUrlEntries(xml: string): Array<{ loc: string; lastmod: string | null }> {
  const entries: Array<{ loc: string; lastmod: string | null }> = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  for (const block of urlBlocks) {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1] ?? null;
    entries.push({ loc, lastmod });
  }
  return entries;
}

function kindOf(sitemapUrl: string): SitemapEntry['kind'] | null {
  if (sitemapUrl.includes('_pages_')) return 'page';
  if (sitemapUrl.includes('_collections_')) return 'collection';
  if (sitemapUrl.includes('_blogs_')) return 'blog';
  return null; // skip products (covered by products.json) and unknown
}

async function fetchSitemap(origin: string): Promise<SitemapEntry[]> {
  const indexXml = await fetchXml(`${origin}/sitemap.xml`);
  // Sitemap index → sub-sitemap locations
  const subUrls = (indexXml.match(/<loc>\s*([^<]+?)\s*<\/loc>/g) ?? [])
    .map(m => m.replace(/<\/?loc>/g, '').trim());

  const entries: SitemapEntry[] = [];

  // Non-index sitemap (rare): treat URL entries directly as pages
  if (subUrls.length === 0 || indexXml.includes('<urlset')) {
    for (const e of extractUrlEntries(indexXml)) {
      if (/\/(pages|collections|blogs)\//.test(e.loc)) {
        const kind: SitemapEntry['kind'] = e.loc.includes('/collections/') ? 'collection' : e.loc.includes('/blogs/') ? 'blog' : 'page';
        entries.push({ ...e, kind });
      }
    }
    return entries;
  }

  const targets = subUrls
    .map(u => ({ url: u, kind: kindOf(u) }))
    .filter((t): t is { url: string; kind: SitemapEntry['kind'] } => t.kind !== null)
    .slice(0, 6); // safety cap

  const results = await Promise.allSettled(targets.map(async t => {
    const xml = await fetchXml(t.url);
    return extractUrlEntries(xml).map(e => ({ ...e, kind: t.kind }));
  }));
  for (const r of results) {
    if (r.status === 'fulfilled') entries.push(...r.value);
  }
  return entries;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  const what = searchParams.get('what') ?? 'both'; // products | sitemap | both

  if (!rawUrl) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Blocked URL' }, { status: 400 });
  }

  const out: {
    storeUrl: string;
    products?: TrackedProductSnapshot[];
    sitemap?: SitemapEntry[];
    productsError?: string;
    sitemapError?: string;
  } = { storeUrl: parsed.origin };

  const jobs: Promise<void>[] = [];
  if (what === 'products' || what === 'both') {
    jobs.push(fetchAllProducts(parsed.origin)
      .then(p => { out.products = p; })
      .catch(e => { out.productsError = (e as Error).message; }));
  }
  if (what === 'sitemap' || what === 'both') {
    jobs.push(fetchSitemap(parsed.origin)
      .then(s => { out.sitemap = s; })
      .catch(e => { out.sitemapError = (e as Error).message; }));
  }
  await Promise.all(jobs);

  if (!out.products?.length && !out.sitemap?.length) {
    return NextResponse.json({
      ...out,
      error: out.productsError ?? out.sitemapError ?? 'Nothing found — may not be a Shopify store',
    }, { status: 422 });
  }

  return NextResponse.json(out);
}
