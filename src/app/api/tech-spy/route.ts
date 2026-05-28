import { NextResponse } from 'next/server';
import type { DetectedTech } from '@/types';

export const maxDuration = 30;

// ── Fingerprint registry ───────────────────────────────────────────────────────

interface Fingerprint {
  pattern: RegExp;
  name: string;
  category: DetectedTech['category'];
  icon: string;
  confidence: DetectedTech['confidence'];
}

const FINGERPRINTS: Fingerprint[] = [
  // ── Platform / Framework ──────────────────────────────────────────────────
  { pattern: /cdn\.shopify\.com/i,                        name: 'Shopify',              category: 'platform',    icon: '🛍️', confidence: 'high' },
  { pattern: /myshopify\.com/i,                           name: 'Shopify',              category: 'platform',    icon: '🛍️', confidence: 'high' },
  { pattern: /Shopify\.theme|ShopifyAnalytics/i,          name: 'Shopify',              category: 'platform',    icon: '🛍️', confidence: 'high' },
  { pattern: /\/_next\//i,                                name: 'Next.js',              category: 'platform',    icon: '▲',  confidence: 'high' },
  { pattern: /wp-content\//i,                             name: 'WordPress',            category: 'platform',    icon: '🌐', confidence: 'high' },
  { pattern: /wp-includes\//i,                            name: 'WordPress',            category: 'platform',    icon: '🌐', confidence: 'high' },
  { pattern: /webflow\.com/i,                             name: 'Webflow',              category: 'platform',    icon: '🌊', confidence: 'high' },
  { pattern: /squarespace\.com/i,                         name: 'Squarespace',          category: 'platform',    icon: '⬛', confidence: 'high' },
  { pattern: /static\.wixstatic\.com/i,                   name: 'Wix',                  category: 'platform',    icon: '✳️', confidence: 'high' },
  { pattern: /window\.__nuxt|nuxtApp|_nuxt\//i,           name: 'Nuxt',                 category: 'platform',    icon: '💚', confidence: 'high' },
  { pattern: /gatsby-/i,                                  name: 'Gatsby',               category: 'platform',    icon: '🟣', confidence: 'medium' },

  // ── JS Frameworks / Libraries ─────────────────────────────────────────────
  { pattern: /vue(\.min)?\.js|vue-router|createApp\(|VueApp/i, name: 'Vue.js',          category: 'other',       icon: '💚', confidence: 'high' },
  { pattern: /react(-dom)?\.production|react\.development/i, name: 'React',             category: 'other',       icon: '⚛️', confidence: 'medium' },
  { pattern: /angular(\.min)?\.js|ng-version/i,           name: 'Angular',              category: 'other',       icon: '🔴', confidence: 'high' },
  { pattern: /jquery(\.min)?\.js|jquery-\d|\$\.fn\.jquery/i, name: 'jQuery',            category: 'other',       icon: '🔵', confidence: 'high' },
  { pattern: /alpine\.js|x-data=|AlpineJS/i,              name: 'Alpine.js',            category: 'other',       icon: '🏔️', confidence: 'high' },
  { pattern: /swiper(\.min)?\.js|Swiper\(/i,              name: 'Swiper',               category: 'other',       icon: '🎡', confidence: 'high' },
  { pattern: /gsap(\.min)?\.js|TweenMax|gsap\.to\(/i,    name: 'GSAP',                 category: 'other',       icon: '✨', confidence: 'high' },

  // ── UI Frameworks ─────────────────────────────────────────────────────────
  { pattern: /tailwind(css)?\.css|tailwind\.min|class="[^"]*(?:flex|grid|text-|bg-|px-|py-|mt-|mb-)[^"]*"/i, name: 'Tailwind CSS', category: 'other', icon: '🎨', confidence: 'medium' },
  { pattern: /bootstrap(\.min)?\.css|bootstrap\.bundle/i, name: 'Bootstrap',            category: 'other',       icon: '🅱️', confidence: 'high' },

  // ── Font / Icon Libraries ─────────────────────────────────────────────────
  { pattern: /fontawesome\.com|font-awesome|fa-[a-z]|FontAwesome/i, name: 'Font Awesome', category: 'other',    icon: '🔤', confidence: 'high' },
  { pattern: /fonts\.googleapis\.com/i,                   name: 'Google Fonts',         category: 'other',       icon: '🔤', confidence: 'high' },

  // ── CDN / Infrastructure ──────────────────────────────────────────────────
  { pattern: /cf-ray|cloudflare-nginx|__cf_bm|cdn\.cloudflare\.com/i, name: 'Cloudflare', category: 'other',    icon: '🟠', confidence: 'high' },

  // ── Analytics ─────────────────────────────────────────────────────────────
  { pattern: /googletagmanager\.com\/gtm\.js/i,           name: 'Google Tag Manager',   category: 'analytics',   icon: '📊', confidence: 'high' },
  { pattern: /gtag\/js\?id=G-/i,                          name: 'GA4',                  category: 'analytics',   icon: '📈', confidence: 'high' },
  { pattern: /google-analytics\.com\/analytics\.js/i,     name: 'Google Analytics (UA)',category: 'analytics',   icon: '📈', confidence: 'high' },
  { pattern: /hotjar\.com/i,                              name: 'Hotjar',               category: 'analytics',   icon: '🔥', confidence: 'high' },
  { pattern: /clarity\.ms/i,                              name: 'Microsoft Clarity',    category: 'analytics',   icon: '🎯', confidence: 'high' },
  { pattern: /cdn\.mxpnl\.com|mixpanel\.com\/lib/i,       name: 'Mixpanel',             category: 'analytics',   icon: '🔀', confidence: 'high' },
  { pattern: /cdn\.segment\.com/i,                        name: 'Segment',              category: 'analytics',   icon: '🔵', confidence: 'high' },
  { pattern: /posthog\.com/i,                             name: 'PostHog',              category: 'analytics',   icon: '🦔', confidence: 'high' },
  { pattern: /mouseflow\.com/i,                           name: 'Mouseflow',            category: 'analytics',   icon: '🖱️', confidence: 'high' },
  { pattern: /webengage\.com/i,                           name: 'WebEngage',            category: 'analytics',   icon: '📲', confidence: 'high' },
  { pattern: /datachannel\.io/i,                          name: 'DataChannel',          category: 'analytics',   icon: '📡', confidence: 'high' },
  { pattern: /heap\.io|heap-\d/i,                         name: 'Heap',                 category: 'analytics',   icon: '📊', confidence: 'high' },
  { pattern: /fullstory\.com/i,                           name: 'FullStory',            category: 'analytics',   icon: '🎬', confidence: 'high' },
  { pattern: /lucky\.orange|luckyorange/i,                name: 'Lucky Orange',         category: 'analytics',   icon: '🟠', confidence: 'high' },

  // ── Ad Pixels ─────────────────────────────────────────────────────────────
  { pattern: /connect\.facebook\.net.*fbevents\.js/i,     name: 'Meta Pixel',           category: 'ads',         icon: '📘', confidence: 'high' },
  { pattern: /gtag\/js\?id=AW-/i,                         name: 'Google Ads',           category: 'ads',         icon: '🟡', confidence: 'high' },
  { pattern: /analytics\.tiktok\.com/i,                   name: 'TikTok Pixel',         category: 'ads',         icon: '🎵', confidence: 'high' },
  { pattern: /tr\.snapchat\.com/i,                        name: 'Snapchat Pixel',       category: 'ads',         icon: '👻', confidence: 'high' },
  { pattern: /pintrk|s\.pinimg\.com/i,                    name: 'Pinterest Pixel',      category: 'ads',         icon: '📌', confidence: 'high' },
  { pattern: /bat\.bing\.com|uet\.bing\.com/i,            name: 'Microsoft Ads',        category: 'ads',         icon: '🪟', confidence: 'high' },
  { pattern: /adyogi\.com/i,                              name: 'Adyogi',               category: 'ads',         icon: '🎯', confidence: 'high' },

  // ── Shopify Apps — Email / SMS / Push ─────────────────────────────────────
  { pattern: /klaviyo\.com/i,                             name: 'Klaviyo',              category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /omnisend\.com/i,                            name: 'Omnisend',             category: 'shopify_app', icon: '📨', confidence: 'high' },
  { pattern: /privy\.com/i,                               name: 'Privy',                category: 'shopify_app', icon: '📩', confidence: 'high' },
  { pattern: /mailmodo\.com/i,                            name: 'Mailmodo',             category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /bitespeed\.co/i,                            name: 'BiteSpeed',            category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /pushowl\.com/i,                             name: 'PushOwl',              category: 'shopify_app', icon: '🔔', confidence: 'high' },
  { pattern: /webpushr\.com/i,                            name: 'Webpushr',             category: 'shopify_app', icon: '🔔', confidence: 'high' },
  { pattern: /recart\.com/i,                              name: 'Recart',               category: 'shopify_app', icon: '📲', confidence: 'high' },

  // ── Shopify Apps — Reviews ─────────────────────────────────────────────────
  { pattern: /yotpo\.com/i,                               name: 'Yotpo',                category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /judge\.me/i,                                name: 'Judge.me',             category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /loox\.io/i,                                 name: 'Loox',                 category: 'shopify_app', icon: '📸', confidence: 'high' },
  { pattern: /okendo\.io/i,                               name: 'Okendo',               category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /stamped\.io/i,                              name: 'Stamped.io',           category: 'shopify_app', icon: '🏅', confidence: 'high' },
  { pattern: /alireviews\.io|ali-reviews/i,               name: 'Ali Reviews',          category: 'shopify_app', icon: '⭐', confidence: 'high' },

  // ── Shopify Apps — Search ──────────────────────────────────────────────────
  { pattern: /searchtap\.net/i,                           name: 'SearchTap',            category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /searchpie\.com/i,                           name: 'SearchPie',            category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /boost-sd\.app|boostcommerce\.net/i,         name: 'Boost Search & Filter',category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /searchanise\.com/i,                         name: 'Searchanise',          category: 'shopify_app', icon: '🔍', confidence: 'high' },

  // ── Shopify Apps — Subscriptions ──────────────────────────────────────────
  { pattern: /rechargeapps\.com/i,                        name: 'ReCharge',             category: 'shopify_app', icon: '🔁', confidence: 'high' },
  { pattern: /bold-subscriptions|boldapps\.net.*subscrib/i, name: 'Bold Subscriptions', category: 'shopify_app', icon: '🔁', confidence: 'medium' },

  // ── Shopify Apps — Page Builders ──────────────────────────────────────────
  { pattern: /pagefly\.io/i,                              name: 'PageFly',              category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /gempages\.net/i,                            name: 'GemPages',             category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /shogun-/i,                                  name: 'Shogun',               category: 'shopify_app', icon: '🧩', confidence: 'medium' },

  // ── Shopify Apps — Upsell / CRO ───────────────────────────────────────────
  { pattern: /reconvert\.com/i,                           name: 'ReConvert',            category: 'shopify_app', icon: '💰', confidence: 'high' },
  { pattern: /wisepops\.com/i,                            name: 'Wisepops',             category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /justuno\.com/i,                             name: 'Justuno',              category: 'shopify_app', icon: '🎯', confidence: 'high' },
  { pattern: /zipify\.com/i,                              name: 'Zipify',               category: 'shopify_app', icon: '⚡', confidence: 'high' },
  { pattern: /carthook\.com/i,                            name: 'CartHook',             category: 'shopify_app', icon: '🛒', confidence: 'high' },
  { pattern: /wheelio|spin-to-win/i,                      name: 'Wheelio',              category: 'shopify_app', icon: '🎡', confidence: 'medium' },
  { pattern: /frequently-bought|fbt-product/i,            name: 'Frequently Bought Together', category: 'shopify_app', icon: '🛍️', confidence: 'medium' },

  // ── Shopify Apps — Support / Chat ─────────────────────────────────────────
  { pattern: /gorgias\.com/i,                             name: 'Gorgias',              category: 'shopify_app', icon: '🎧', confidence: 'high' },
  { pattern: /tidio\.com/i,                               name: 'Tidio',                category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /reamaze\.com/i,                             name: 'Reamaze',              category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /richpanel\.com/i,                           name: 'Richpanel',            category: 'shopify_app', icon: '🎧', confidence: 'high' },

  // ── Shopify Apps — Attribution / Analytics ────────────────────────────────
  { pattern: /triplewhale\.com/i,                         name: 'Triple Whale',         category: 'shopify_app', icon: '🐳', confidence: 'high' },
  { pattern: /northbeam\.io/i,                            name: 'Northbeam',            category: 'shopify_app', icon: '🧭', confidence: 'high' },
  { pattern: /elevar\.com/i,                              name: 'Elevar',               category: 'shopify_app', icon: '📡', confidence: 'high' },
  { pattern: /tracify\.ai/i,                              name: 'Tracify',              category: 'shopify_app', icon: '📡', confidence: 'high' },
  { pattern: /hyros\.com/i,                               name: 'Hyros',                category: 'shopify_app', icon: '📡', confidence: 'high' },

  // ── Shopify Apps — Loyalty ────────────────────────────────────────────────
  { pattern: /growave\.io/i,                              name: 'Growave',              category: 'shopify_app', icon: '💎', confidence: 'high' },
  { pattern: /smile\.io/i,                                name: 'Smile.io',             category: 'shopify_app', icon: '😊', confidence: 'high' },
  { pattern: /loyaltylion\.com/i,                         name: 'LoyaltyLion',          category: 'shopify_app', icon: '🦁', confidence: 'high' },
  { pattern: /wishlist-plus|wishlist\.hero/i,             name: 'Wishlist Plus',        category: 'shopify_app', icon: '❤️', confidence: 'medium' },
  { pattern: /wishlink\.app/i,                            name: 'Wishlink',             category: 'shopify_app', icon: '❤️', confidence: 'high' },

  // ── Shopify Apps — Shipping / Returns ─────────────────────────────────────
  { pattern: /aftership\.com/i,                           name: 'AfterShip',            category: 'shopify_app', icon: '📦', confidence: 'high' },
  { pattern: /loopreturns\.com/i,                         name: 'Loop Returns',         category: 'shopify_app', icon: '🔄', confidence: 'high' },
  { pattern: /clickpost\.in/i,                            name: 'ClickPost',            category: 'shopify_app', icon: '📦', confidence: 'high' },
  { pattern: /shipway\.in|shipway\.com/i,                 name: 'Shipway',              category: 'shopify_app', icon: '🚚', confidence: 'high' },
  { pattern: /nimbuspost\.com/i,                          name: 'NimbusPost',           category: 'shopify_app', icon: '🚚', confidence: 'high' },

  // ── Shopify Apps — Video / Social ─────────────────────────────────────────
  { pattern: /reelup\.io/i,                               name: 'ReelUp',               category: 'shopify_app', icon: '🎬', confidence: 'high' },
  { pattern: /instafeed/i,                                name: 'Instafeed',            category: 'shopify_app', icon: '📸', confidence: 'medium' },
  { pattern: /goaffpro\.com/i,                            name: 'GoAffPro',             category: 'shopify_app', icon: '🤝', confidence: 'high' },
  { pattern: /refersion\.com/i,                           name: 'Refersion',            category: 'shopify_app', icon: '🤝', confidence: 'high' },

  // ── Shopify Apps — Checkout / Payment ─────────────────────────────────────
  { pattern: /gokwik\.co/i,                               name: 'GoKwik',               category: 'shopify_app', icon: '🚀', confidence: 'high' },
  { pattern: /shopflo\.com/i,                             name: 'Shopflo',              category: 'shopify_app', icon: '💳', confidence: 'high' },
  { pattern: /bold-cashier|boldcheckout/i,                name: 'Bold Cashier',         category: 'shopify_app', icon: '💳', confidence: 'medium' },

  // ── Shopify Apps — Misc ───────────────────────────────────────────────────
  { pattern: /rechargeapps|recharge\.com/i,               name: 'ReCharge',             category: 'shopify_app', icon: '🔁', confidence: 'high' },
  { pattern: /trafficly|trafficly\.io/i,                  name: 'Trafficly',            category: 'shopify_app', icon: '👁️', confidence: 'high' },

  // ── Chat / Support ────────────────────────────────────────────────────────
  { pattern: /widget\.intercom\.io|intercomcdn\.com/i,    name: 'Intercom',             category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /static\.zdassets\.com|zopim\.com/i,         name: 'Zendesk',              category: 'chat',        icon: '🎫', confidence: 'high' },
  { pattern: /freshchat\.com|freshdesk\.com/i,            name: 'Freshchat',            category: 'chat',        icon: '🌿', confidence: 'high' },
  { pattern: /tawk\.to/i,                                 name: 'tawk.to',              category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /crisp\.chat/i,                              name: 'Crisp',                category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /drift\.com/i,                               name: 'Drift',                category: 'chat',        icon: '💬', confidence: 'high' },
  { pattern: /olark\.com/i,                               name: 'Olark',                category: 'chat',        icon: '💬', confidence: 'high' },

  // ── Payment ───────────────────────────────────────────────────────────────
  { pattern: /razorpay\.com/i,                            name: 'Razorpay',             category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /js\.stripe\.com/i,                          name: 'Stripe',               category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /cashfree\.com/i,                            name: 'Cashfree',             category: 'payment',     icon: '💰', confidence: 'high' },
  { pattern: /payu\.in|payu\.biz/i,                       name: 'PayU',                 category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /phonepe\.com/i,                             name: 'PhonePe',              category: 'payment',     icon: '💳', confidence: 'high' },
];

// ── SSRF guard ─────────────────────────────────────────────────────────────────

function isBlockedHost(hostname: string): boolean {
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
  if (blocked.includes(hostname)) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
  return false;
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

  try {
    const res = await fetch(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10_000),
    });

    const html = await res.text();
    const headerStr = JSON.stringify(Object.fromEntries(res.headers.entries()));
    const searchTarget = html + '\n' + headerStr;

    // Run fingerprints and deduplicate by name
    const seen = new Set<string>();
    const tech: DetectedTech[] = [];

    for (const fp of FINGERPRINTS) {
      if (!seen.has(fp.name) && fp.pattern.test(searchTarget)) {
        seen.add(fp.name);
        tech.push({ name: fp.name, category: fp.category, icon: fp.icon, confidence: fp.confidence });
      }
    }

    return NextResponse.json({ tech });
  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error';
    const isTimeout = msg.includes('abort') || msg.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out — site may be blocking bots' : `Could not reach URL: ${msg}`, tech: [] },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
