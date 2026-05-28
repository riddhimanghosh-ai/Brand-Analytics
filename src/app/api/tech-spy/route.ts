import { NextResponse } from 'next/server';
import type { DetectedTech } from '@/types';

export const maxDuration = 60;

// ── Fingerprint registry (platforms / analytics / ads / chat / payment only) ──
// Shopify *apps* are detected dynamically — no hardcoded app list.

interface Fingerprint {
  pattern: RegExp;
  name: string;
  category: DetectedTech['category'];
  icon: string;
  confidence: DetectedTech['confidence'];
}

const FINGERPRINTS: Fingerprint[] = [
  // ── Platform / Framework ──────────────────────────────────────────────────
  { pattern: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|ShopifyAnalytics|window\.Shopify\s*=|shopify-payment-button/i, name: 'Shopify', category: 'platform', icon: '🛍️', confidence: 'high' },
  { pattern: /\/_next\//i,                                name: 'Next.js',              category: 'platform',    icon: '▲',  confidence: 'high' },
  { pattern: /wp-content\/|wp-includes\//i,               name: 'WordPress',            category: 'platform',    icon: '🌐', confidence: 'high' },
  { pattern: /webflow\.com/i,                             name: 'Webflow',              category: 'platform',    icon: '🌊', confidence: 'high' },
  { pattern: /squarespace\.com/i,                         name: 'Squarespace',          category: 'platform',    icon: '⬛', confidence: 'high' },
  { pattern: /static\.wixstatic\.com/i,                   name: 'Wix',                  category: 'platform',    icon: '✳️', confidence: 'high' },
  { pattern: /window\.__nuxt|nuxtApp|_nuxt\//i,           name: 'Nuxt',                 category: 'platform',    icon: '💚', confidence: 'high' },
  { pattern: /gatsby-/i,                                  name: 'Gatsby',               category: 'platform',    icon: '🟣', confidence: 'medium' },

  // ── JS Frameworks / Libraries ─────────────────────────────────────────────
  { pattern: /vue(\.min)?\.js|vue-router|__vue_/i,        name: 'Vue.js',               category: 'other',       icon: '💚', confidence: 'high' },
  { pattern: /react(-dom)?\.production|react\.development|__REACT/i, name: 'React',    category: 'other',       icon: '⚛️', confidence: 'medium' },
  { pattern: /angular(\.min)?\.js|ng-version/i,           name: 'Angular',              category: 'other',       icon: '🔴', confidence: 'high' },
  { pattern: /jquery(\.min)?\.js|jquery-\d|\$\.fn\.jquery/i, name: 'jQuery',            category: 'other',       icon: '🔵', confidence: 'high' },
  { pattern: /alpine\.js|x-data=|AlpineJS/i,              name: 'Alpine.js',            category: 'other',       icon: '🏔️', confidence: 'high' },
  { pattern: /swiper(\.min)?\.js|Swiper\(/i,              name: 'Swiper',               category: 'other',       icon: '🎡', confidence: 'high' },
  { pattern: /gsap(\.min)?\.js|TweenMax|gsap\.to\(/i,    name: 'GSAP',                 category: 'other',       icon: '✨', confidence: 'high' },

  // ── UI Frameworks ─────────────────────────────────────────────────────────
  { pattern: /tailwind(css)?\.css|tailwind\.min/i,        name: 'Tailwind CSS',         category: 'other',       icon: '🎨', confidence: 'high' },
  { pattern: /bootstrap(\.min)?\.css|bootstrap\.bundle/i, name: 'Bootstrap',            category: 'other',       icon: '🅱️', confidence: 'high' },

  // ── Font / Icon Libraries ─────────────────────────────────────────────────
  { pattern: /fontawesome\.com|font-awesome|FontAwesome/i,name: 'Font Awesome',         category: 'other',       icon: '🔤', confidence: 'high' },
  { pattern: /fonts\.googleapis\.com/i,                   name: 'Google Fonts',         category: 'other',       icon: '🔤', confidence: 'high' },

  // ── CDN / Infrastructure ──────────────────────────────────────────────────
  { pattern: /cf-ray|cloudflare-nginx|__cf_bm|cdn\.cloudflare\.com|cloudflareinsights/i, name: 'Cloudflare', category: 'other', icon: '🟠', confidence: 'high' },
  { pattern: /fastly\.net/i,                              name: 'Fastly CDN',           category: 'other',       icon: '⚡', confidence: 'high' },
  { pattern: /akamai\.net|akamaized\.net/i,               name: 'Akamai CDN',           category: 'other',       icon: '🌐', confidence: 'high' },
  { pattern: /x-vercel-id|vercel\.com\/security|vercel-deployment/i, name: 'Vercel',    category: 'other',       icon: '▲',  confidence: 'high' },

  // ── Analytics ─────────────────────────────────────────────────────────────
  { pattern: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i, name: 'Google Tag Manager', category: 'analytics', icon: '📊', confidence: 'high' },
  { pattern: /gtag\/js\?id=G-|ga\('create',\s*'G-/i,     name: 'GA4',                  category: 'analytics',   icon: '📈', confidence: 'high' },
  { pattern: /google-analytics\.com\/analytics\.js|ga\('create',\s*'UA-/i, name: 'Google Analytics (UA)', category: 'analytics', icon: '📈', confidence: 'high' },
  { pattern: /hotjar\.com|window\.hj\s*=|hjSiteSettings/i, name: 'Hotjar',             category: 'analytics',   icon: '🔥', confidence: 'high' },
  { pattern: /clarity\.ms|window\.clarity\s*=/i,         name: 'Microsoft Clarity',    category: 'analytics',   icon: '🎯', confidence: 'high' },
  { pattern: /cdn\.mxpnl\.com|mixpanel\.com\/lib|window\.mixpanel/i, name: 'Mixpanel', category: 'analytics',   icon: '🔀', confidence: 'high' },
  { pattern: /cdn\.segment\.com|analytics\.segment\.com/i, name: 'Segment',            category: 'analytics',   icon: '🔵', confidence: 'high' },
  { pattern: /posthog\.com|window\.posthog/i,             name: 'PostHog',              category: 'analytics',   icon: '🦔', confidence: 'high' },
  { pattern: /mouseflow\.com/i,                           name: 'Mouseflow',            category: 'analytics',   icon: '🖱️', confidence: 'high' },
  { pattern: /webengage\.com|window\.webengage/i,         name: 'WebEngage',            category: 'analytics',   icon: '📲', confidence: 'high' },
  { pattern: /heap\.io|heap-\d|window\.heap/i,            name: 'Heap',                 category: 'analytics',   icon: '📊', confidence: 'high' },
  { pattern: /fullstory\.com|window\._fs_/i,              name: 'FullStory',            category: 'analytics',   icon: '🎬', confidence: 'high' },
  { pattern: /lucky\.orange|luckyorange/i,                name: 'Lucky Orange',         category: 'analytics',   icon: '🟠', confidence: 'high' },
  { pattern: /smartlook\.com/i,                           name: 'Smartlook',            category: 'analytics',   icon: '🔍', confidence: 'high' },
  { pattern: /matomo\.js|piwik\.js/i,                     name: 'Matomo',               category: 'analytics',   icon: '📊', confidence: 'high' },

  // ── Ad Pixels ─────────────────────────────────────────────────────────────
  { pattern: /connect\.facebook\.net.*fbevents|fbq\('init'|facebook\.com\/tr\?/i, name: 'Meta Pixel', category: 'ads', icon: '📘', confidence: 'high' },
  { pattern: /gtag\/js\?id=AW-|google_conversion_id|googleadservices\.com/i, name: 'Google Ads', category: 'ads', icon: '🟡', confidence: 'high' },
  { pattern: /analytics\.tiktok\.com|ttq\.load|tiktok.*pixel/i, name: 'TikTok Pixel',  category: 'ads',         icon: '🎵', confidence: 'high' },
  { pattern: /tr\.snapchat\.com|snaptr\('init'/i,         name: 'Snapchat Pixel',       category: 'ads',         icon: '👻', confidence: 'high' },
  { pattern: /pintrk|s\.pinimg\.com|pinterest.*tag/i,     name: 'Pinterest Pixel',      category: 'ads',         icon: '📌', confidence: 'high' },
  { pattern: /bat\.bing\.com|uet\.bing\.com|window\.uetq/i, name: 'Microsoft Ads',     category: 'ads',         icon: '🪟', confidence: 'high' },
  { pattern: /criteo\.net|criteo\.com/i,                  name: 'Criteo',               category: 'ads',         icon: '🎯', confidence: 'high' },
  { pattern: /taboola\.com/i,                             name: 'Taboola',              category: 'ads',         icon: '📰', confidence: 'high' },
  { pattern: /t\.co\/i\/adsct|static\.ads-twitter\.com/i, name: 'Twitter Ads',          category: 'ads',         icon: '🐦', confidence: 'high' },
  { pattern: /adyogi\.com/i,                              name: 'Adyogi',               category: 'ads',         icon: '🎯', confidence: 'high' },

  // ── Chat / Support ────────────────────────────────────────────────────────
  { pattern: /widget\.intercom\.io|intercomcdn\.com|window\.Intercom/i, name: 'Intercom', category: 'chat', icon: '💬', confidence: 'high' },
  { pattern: /static\.zdassets\.com|zopim\.com|zendesk\.com\/embeddable/i, name: 'Zendesk', category: 'chat', icon: '🎫', confidence: 'high' },
  { pattern: /freshchat\.com|freshdesk\.com/i,            name: 'Freshchat',            category: 'chat',        icon: '🌿', confidence: 'high' },
  { pattern: /tawk\.to/i,                                 name: 'tawk.to',              category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /crisp\.chat/i,                              name: 'Crisp',                category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /drift\.com|window\.drift/i,                 name: 'Drift',                category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /olark\.com/i,                               name: 'Olark',                category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /helpscout\.net|beacon-v2\.helpscout/i,      name: 'HelpScout',            category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /chatra\.io/i,                               name: 'Chatra',               category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /gorgias\.com|GorgiasChat/i,                 name: 'Gorgias',              category: 'chat',        icon: '🎧', confidence: 'high' },
  { pattern: /tidio\.com/i,                               name: 'Tidio',                category: 'chat',        icon: '💬', confidence: 'high' },

  // ── Payment ───────────────────────────────────────────────────────────────
  { pattern: /razorpay\.com/i,                            name: 'Razorpay',             category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /js\.stripe\.com/i,                          name: 'Stripe',               category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /cashfree\.com/i,                            name: 'Cashfree',             category: 'payment',     icon: '💰', confidence: 'high' },
  { pattern: /payu\.in|payu\.biz/i,                       name: 'PayU',                 category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /phonepe\.com/i,                             name: 'PhonePe',              category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /juspay\.in/i,                               name: 'Juspay',               category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /easebuzz\.in/i,                             name: 'Easebuzz',             category: 'payment',     icon: '💳', confidence: 'high' },
];

// ── Shopify-specific well-known app domains ────────────────────────────────────
// These are major apps with their own CDN / public domains that appear in HTML.
// This list covers apps whose scripts DON'T go through Shopify extension CDN.
const SHOPIFY_APP_DOMAINS: Array<{ pattern: RegExp; name: string; icon: string }> = [
  { pattern: /klaviyo\.com|_learnq/i,                     name: 'Klaviyo',   icon: '📧' },
  { pattern: /omnisend\.com/i,                            name: 'Omnisend',  icon: '📨' },
  { pattern: /yotpo\.com|yotpo-widget/i,                  name: 'Yotpo',     icon: '⭐' },
  { pattern: /loox\.io/i,                                 name: 'Loox',      icon: '📸' },
  { pattern: /okendo\.io/i,                               name: 'Okendo',    icon: '⭐' },
  { pattern: /stamped\.io/i,                              name: 'Stamped.io',icon: '🏅' },
  { pattern: /rechargeapps\.com/i,                        name: 'ReCharge',  icon: '🔁' },
  { pattern: /boost-sd\.app|boostcommerce\.net/i,         name: 'Boost Search & Filter', icon: '🔍' },
  { pattern: /searchanise\.com/i,                         name: 'Searchanise', icon: '🔍' },
  { pattern: /smile\.io/i,                                name: 'Smile.io',  icon: '😊' },
  { pattern: /loyaltylion\.com/i,                         name: 'LoyaltyLion', icon: '🦁' },
  { pattern: /growave\.io/i,                              name: 'Growave',   icon: '💎' },
  { pattern: /aftership\.com/i,                           name: 'AfterShip', icon: '📦' },
  { pattern: /loopreturns\.com/i,                         name: 'Loop Returns', icon: '🔄' },
  { pattern: /triplewhale\.com/i,                         name: 'Triple Whale', icon: '🐳' },
  { pattern: /elevar\.com|elevar-gtm/i,                   name: 'Elevar',    icon: '📡' },
  { pattern: /northbeam\.io/i,                            name: 'Northbeam', icon: '🧭' },
  { pattern: /gokwik\.co|pdp\.gokwik/i,                   name: 'GoKwik',    icon: '🚀' },
  { pattern: /shopflo\.com/i,                             name: 'Shopflo',   icon: '💳' },
  { pattern: /pushowl\.com/i,                             name: 'PushOwl',   icon: '🔔' },
  { pattern: /wisepops\.com/i,                            name: 'Wisepops',  icon: '💬' },
  { pattern: /justuno\.com/i,                             name: 'Justuno',   icon: '🎯' },
  { pattern: /privy\.com/i,                               name: 'Privy',     icon: '📩' },
  { pattern: /attentivemobile\.com/i,                     name: 'Attentive', icon: '📲' },
  { pattern: /goaffpro\.com/i,                            name: 'GoAffPro',  icon: '🤝' },
  { pattern: /refersion\.com/i,                           name: 'Refersion', icon: '🤝' },
  { pattern: /pagefly\.io/i,                              name: 'PageFly',   icon: '🧩' },
  { pattern: /gempages\.net/i,                            name: 'GemPages',  icon: '🧩' },
  { pattern: /cdn\.nector\.io/i,                          name: 'Nector',    icon: '⭐' },
  { pattern: /bitespeed\.co|cdn\.bitespeed/i,             name: 'BiteSpeed', icon: '💬' },
];

// ── SSRF guard ─────────────────────────────────────────────────────────────────

function isBlockedHost(hostname: string): boolean {
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
  if (blocked.includes(hostname)) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
  return false;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function safeFetch(url: string, timeoutMs = 8000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    return await res.text();
  } catch {
    return '';
  }
}

function extractScriptUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

function extractPreconnectUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<link[^>]+(?:preconnect|dns-prefetch)[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) urls.push(m[1]);
  const re2 = /<link[^>]+href=["']([^"']+)["'][^>]+(?:preconnect|dns-prefetch)/gi;
  while ((m = re2.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

function findShopifyThemeJsUrl(html: string, origin: string): string | null {
  const absRe = /https:\/\/cdn\.shopify\.com\/s\/files\/[^"' ]+\.js[^"' ]*/gi;
  const absMatches = html.match(absRe) ?? [];

  const relRe = /(?:https?:)?\/\/[^"' ]*\/cdn\/shop\/[^"' ]+\.js[^"' ]*/gi;
  const relMatches = (html.match(relRe) ?? []).map(u =>
    u.startsWith('//') ? `https:${u}` : u
  );

  const rootRe = /["'](\/cdn\/shop\/[^"']+\.js[^"']*)/gi;
  let m: RegExpExecArray | null;
  const rootMatches: string[] = [];
  while ((m = rootRe.exec(html)) !== null) rootMatches.push(`${origin}${m[1]}`);

  const all = [...absMatches, ...relMatches, ...rootMatches];
  if (!all.length) return null;
  all.sort((a, b) => b.length - a.length);
  return all[0];
}

/**
 * Dynamically extract Shopify apps from Shopify's extension CDN URLs.
 * URL format: cdn.shopify.com/extensions/{uuid}/{app-handle}-{version}/assets/...
 * The app-handle is the app's slug on the Shopify App Store.
 * seenLower = lowercase-normalised version of seen, to avoid duplicates.
 */
function extractAppsFromExtensionUrls(content: string, seenLower: Set<string>): DetectedTech[] {
  const apps: DetectedTech[] = [];
  const re = /cdn\.shopify\.com\/extensions\/[0-9a-f-]+\/([a-z0-9]+(?:-[a-z0-9]+)*?)-(\d+)\/assets/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const handle = m[1].toLowerCase(); // e.g. "judgeme", "reel-shopable", "kwikpass"
    if (seenLower.has(handle)) continue;
    // Also skip if the handle's first segment is already detected (e.g. "webengage-app-production" when "webengage" is seen)
    const firstSegment = handle.split('-')[0];
    if (seenLower.has(firstSegment)) continue;
    seenLower.add(handle);
    const name = handle
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    apps.push({ name, category: 'shopify_app', icon: '🧩', confidence: 'high' });
  }
  return apps;
}

/**
 * Dynamically extract Shopify apps from theme liquid app snippet comments.
 * Shopify injects: <!-- BEGIN app snippet: nector_auth -->
 * seenLower = lowercase-normalised version of seen, to avoid duplicates.
 */
function extractAppsFromSnippetComments(html: string, seenLower: Set<string>): DetectedTech[] {
  const apps: DetectedTech[] = [];
  const re = /<!--\s*(?:BEGIN\s+)?app snippet[:\s]+([a-z0-9_-]+)\s*(?:-->|$)/gi;
  // Skip generic/theme-level snippet names that aren't Shopify apps
  const SKIP = new Set([
    'widget_initializer', 'base', 'global', 'analytics', 'tracking', 'pixel', 'end',
    'theme', 'theme_fix', 'fix_tags', 'fix-tags', 'theme-fix', 'theme-fix-tags', 'theme_fix_tags',
    'header', 'footer', 'cart', 'product', 'collection', 'search', 'account',
  ]);
  // Also skip snippets that start with known theme prefixes
  const SKIP_PREFIXES = ['theme_', 'theme-', 'fix_', 'shopify_', 'beardo_', 'custom_'];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let snippet = m[1].toLowerCase().trim();
    if (SKIP.has(snippet)) continue;
    if (SKIP_PREFIXES.some(p => snippet.startsWith(p))) continue;
    // Strip common suffixes that are part of the snippet name but not the app name
    snippet = snippet.replace(/[_-](auth|widget|app|init|loader|tracker|script|main|core)$/, '');
    const handle = snippet.replace(/_/g, '-');
    if (seenLower.has(handle) || handle.length < 3) continue;
    seenLower.add(handle);
    const name = handle
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    apps.push({ name, category: 'shopify_app', icon: '🧩', confidence: 'medium' });
  }
  return apps;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Blocked URL' }, { status: 400 });
  }

  // ── Phase 1: Fetch main page ───────────────────────────────────────────────
  let html = '';
  let headerStr = '';

  try {
    const res = await fetch(parsed.href, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    });
    html = await res.text();
    headerStr = JSON.stringify(Object.fromEntries(res.headers.entries()));

    const isBotBlocked =
      /<title>.*?(just a moment|security check|vercel security checkpoint|attention required)/i.test(html) ||
      (res.status === 403 && html.length < 5000);

    if (isBotBlocked) {
      const seen = new Set<string>();
      const tech: DetectedTech[] = [];
      const target = html + '\n' + headerStr;
      for (const fp of FINGERPRINTS) {
        if (!seen.has(fp.name) && fp.pattern.test(target)) {
          seen.add(fp.name);
          tech.push({ name: fp.name, category: fp.category, icon: fp.icon, confidence: fp.confidence });
        }
      }
      return NextResponse.json({
        tech,
        error: 'Site has bot protection — results may be incomplete.',
      });
    }
  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error';
    const isTimeout = msg.includes('abort') || msg.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out — site may be blocking bots' : `Could not reach URL: ${msg}`, tech: [] },
      { status: isTimeout ? 504 : 502 }
    );
  }

  // ── Phase 2: Parallel secondary fetches ───────────────────────────────────
  const scriptUrls = extractScriptUrls(html);
  const preconnectUrls = extractPreconnectUrls(html);

  let searchTarget =
    html + '\n' +
    headerStr + '\n' +
    scriptUrls.join('\n') + '\n' +
    preconnectUrls.join('\n');

  const secondaryFetches: Promise<string>[] = [];

  // GTM container — reveals all tags configured inside GTM
  const gtmIds = [...new Set([...html.matchAll(/GTM-[A-Z0-9]+/g)].map(m => m[0]))];
  for (const gtmId of gtmIds.slice(0, 2)) {
    secondaryFetches.push(safeFetch(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`, 8000));
  }

  // Shopify theme JS bundle
  const isShopify = /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|window\.Shopify\s*=/i.test(searchTarget);
  if (isShopify) {
    const themeJsUrl = findShopifyThemeJsUrl(html, parsed.origin);
    if (themeJsUrl) {
      secondaryFetches.push(safeFetch(themeJsUrl, 8000).then(js => js.slice(0, 300_000)));
    }
    // Collection page often has more app scripts
    secondaryFetches.push(safeFetch(`${parsed.origin}/collections/all`, 6000));
  }

  if (secondaryFetches.length > 0) {
    const results = await Promise.allSettled(secondaryFetches);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) searchTarget += '\n' + r.value;
    }
  }

  // ── Phase 3: Run platform/analytics/ads/chat/payment fingerprints ─────────
  const seen = new Set<string>();      // display names (for fingerprints)
  const seenLower = new Set<string>(); // lowercase handles (for dynamic Shopify app detection)
  const tech: DetectedTech[] = [];

  for (const fp of FINGERPRINTS) {
    if (!seen.has(fp.name) && fp.pattern.test(searchTarget)) {
      seen.add(fp.name);
      seenLower.add(fp.name.toLowerCase());
      tech.push({ name: fp.name, category: fp.category, icon: fp.icon, confidence: fp.confidence });
    }
  }

  // ── Phase 4: Detect Shopify apps — no hardcoded individual app list ────────

  // 4a. Major apps with their own public CDN domains (Klaviyo, Yotpo, GoKwik, etc.)
  //     These have their own CDN so they won't appear in Shopify extension URLs
  for (const app of SHOPIFY_APP_DOMAINS) {
    const key = app.name.toLowerCase();
    if (!seenLower.has(key) && app.pattern.test(searchTarget)) {
      seenLower.add(key);
      tech.push({ name: app.name, category: 'shopify_app', icon: app.icon, confidence: 'high' });
    }
  }

  // 4b. Any Shopify app with a Shopify Extension CDN URL — fully automatic
  //     cdn.shopify.com/extensions/{uuid}/{app-handle}-{version}/assets/
  const extensionApps = extractAppsFromExtensionUrls(searchTarget, seenLower);
  tech.push(...extensionApps);

  // 4c. Any app that left a Shopify app snippet comment in the HTML — fully automatic
  //     <!-- BEGIN app snippet: nector_auth --> → "Nector"
  const snippetApps = extractAppsFromSnippetComments(html, seenLower);
  tech.push(...snippetApps);

  return NextResponse.json({ tech });
}
