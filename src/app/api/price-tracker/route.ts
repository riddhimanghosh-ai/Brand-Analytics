import { NextResponse } from 'next/server';
import type { TrackedProductSnapshot } from '@/types';

export const maxDuration = 60;

// Shopify stores expose their catalog publicly at /products.json — no auth
// or scraping needed. We pull up to 2 pages (500 products).

function isBlockedHost(hostname: string): boolean {
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
  if (blocked.includes(hostname)) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
  return false;
}

interface ShopifyPublicVariant {
  price: string;
  compare_at_price: string | null;
  available?: boolean;
}

interface ShopifyPublicProduct {
  id: number;
  title: string;
  handle: string;
  images?: Array<{ src: string }>;
  variants?: ShopifyPublicVariant[];
}

async function fetchProductsPage(origin: string, page: number): Promise<ShopifyPublicProduct[]> {
  const res = await fetch(`${origin}/products.json?limit=250&page=${page}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${origin}/products.json`);
  const data = await res.json() as { products?: ShopifyPublicProduct[] };
  return data.products ?? [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Blocked URL' }, { status: 400 });
  }

  try {
    // Page 1 always; page 2 only if page 1 was full
    const page1 = await fetchProductsPage(parsed.origin, 1);
    let all = page1;
    if (page1.length === 250) {
      try {
        const page2 = await fetchProductsPage(parsed.origin, 2);
        all = [...page1, ...page2];
      } catch { /* page 2 is best-effort */ }
    }

    if (all.length === 0) {
      return NextResponse.json({
        error: 'No products found — this may not be a Shopify store, or its catalog is hidden',
        products: [],
      }, { status: 422 });
    }

    const products: TrackedProductSnapshot[] = all.map(p => {
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
      };
    });

    return NextResponse.json({ storeUrl: parsed.origin, products });
  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error';
    const isTimeout = msg.includes('abort') || msg.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : `Could not fetch catalog: ${msg}`, products: [] },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
