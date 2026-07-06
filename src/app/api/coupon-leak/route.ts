import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getDiscountCodePerformance } from '@/lib/services/shopify';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';
import { demoCouponLeak } from '@/lib/demo-data';

export const maxDuration = 60;

const COUPON_SITES = [
  { name: 'GrabOn',       buildUrl: (b: string) => `https://www.grabon.in/search/?q=${encodeURIComponent(b)}` },
  { name: 'CouponDunia',  buildUrl: (b: string) => `https://www.coupondunia.in/search/${encodeURIComponent(b)}` },
  { name: 'CouponMoto',   buildUrl: (b: string) => `https://www.couponmoto.com/search/${encodeURIComponent(b)}` },
  { name: 'Savyour',      buildUrl: (b: string) => `https://savyour.com/search?query=${encodeURIComponent(b)}` },
  { name: 'CupoNation',   buildUrl: (b: string) => `https://www.cuponation.in/search?q=${encodeURIComponent(b)}` },
];

// Patterns that reliably appear around coupon codes in aggregator HTML/JSON
const CODE_PATTERNS = [
  /data-code=["']([A-Z0-9_\-]{4,20})["']/gi,
  /data-clipboard-text=["']([A-Z0-9_\-]{4,20})["']/gi,
  /data-coupon=["']([A-Z0-9_\-]{4,20})["']/gi,
  /"code"\s*:\s*"([A-Z0-9_\-]{4,20})"/gi,
  /"couponCode"\s*:\s*"([A-Z0-9_\-]{4,20})"/gi,
  /class="[^"]*coupon[^"]*code[^"]*"[^>]*>\s*([A-Z0-9_\-]{4,20})\s*</gi,
  /copy[^"]*">\s*([A-Z0-9_\-]{4,20})\s*</gi,
];

// Words that indicate the match is noise (not a coupon code)
const NOISE = new Set(['HTTPS', 'HTTP', 'HTML', 'HEAD', 'BODY', 'FORM', 'SPAN', 'HREF', 'TYPE', 'NULL', 'TRUE', 'FALSE']);

async function scanSite(url: string, siteName: string): Promise<{ site: string; codes: string[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    const html = await res.text();
    const found = new Set<string>();
    for (const pat of CODE_PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(html)) !== null) {
        const code = m[1].toUpperCase();
        if (!NOISE.has(code)) found.add(code);
      }
    }
    return { site: siteName, codes: [...found] };
  } catch (err) {
    return { site: siteName, codes: [], error: (err as Error).message.slice(0, 80) };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const dateRange = searchParams.get('range') ?? '30d';

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(demoCouponLeak);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    const cacheKey = `coupon-leak-${dateRange}`;
    const cached = await cacheGet(slug!, cacheKey, 'v1');
    if (cached) return NextResponse.json(cached);

    // Shopify discount performance
    let discountData = null;
    if (brand.shopifyStoreUrl && brand.shopifyAccessToken) {
      const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
      discountData = await getDiscountCodePerformance(config, dateRange);
    }
    const activeCodes = new Set((discountData?.codes ?? []).map(c => c.code.toUpperCase()));

    // Scan coupon sites in parallel
    const brandName = brand.name ?? slug!;
    const scanResults = await Promise.all(COUPON_SITES.map(s => scanSite(s.buildUrl(brandName), s.name)));

    // Cross-match found codes with active Shopify codes
    const leakMap = new Map<string, string[]>(); // code → sites
    for (const r of scanResults) {
      for (const code of r.codes) {
        if (activeCodes.has(code)) {
          const sites = leakMap.get(code) ?? [];
          sites.push(r.site);
          leakMap.set(code, sites);
        }
      }
    }

    const leaks = [...leakMap.entries()].map(([code, sites]) => {
      const stats = discountData?.codes.find(c => c.code.toUpperCase() === code);
      return {
        code,
        sites,
        orders: stats?.orders ?? 0,
        revenue: stats?.revenue ?? 0,
        totalDiscount: stats?.totalDiscount ?? 0,
        newCustomerShare: stats?.newCustomerShare ?? 0,
        aov: stats?.aov ?? 0,
      };
    }).sort((a, b) => b.orders - a.orders);

    const result = {
      leaks,
      allCodes: discountData?.codes ?? [],
      siteScans: scanResults.map(r => ({ site: r.site, codesFound: r.codes.length, error: r.error })),
      scannedAt: new Date().toISOString(),
    };

    await cacheSet(slug!, cacheKey, 'v1', result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
