import { NextResponse } from 'next/server';
import type { DetectedTech } from '@/types';

export const maxDuration = 60;

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
  { pattern: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|ShopifyAnalytics|window\.Shopify\s*=|shopify-payment-button/i, name: 'Shopify', category: 'platform', icon: '🛍️', confidence: 'high' },
  { pattern: /\/_next\//i,                                name: 'Next.js',              category: 'platform',    icon: '▲',  confidence: 'high' },
  { pattern: /wp-content\/|wp-includes\//i,               name: 'WordPress',            category: 'platform',    icon: '🌐', confidence: 'high' },
  { pattern: /webflow\.com/i,                             name: 'Webflow',              category: 'platform',    icon: '🌊', confidence: 'high' },
  { pattern: /squarespace\.com/i,                         name: 'Squarespace',          category: 'platform',    icon: '⬛', confidence: 'high' },
  { pattern: /static\.wixstatic\.com/i,                   name: 'Wix',                  category: 'platform',    icon: '✳️', confidence: 'high' },
  { pattern: /window\.__nuxt|nuxtApp|_nuxt\//i,           name: 'Nuxt',                 category: 'platform',    icon: '💚', confidence: 'high' },
  { pattern: /gatsby-/i,                                  name: 'Gatsby',               category: 'platform',    icon: '🟣', confidence: 'medium' },

  // ── JS Frameworks / Libraries ─────────────────────────────────────────────
  { pattern: /vue(\.min)?\.js|vue-router|createApp\(|VueApp|__vue_/i, name: 'Vue.js',   category: 'other',       icon: '💚', confidence: 'high' },
  { pattern: /react(-dom)?\.production|react\.development|__REACT/i,  name: 'React',    category: 'other',       icon: '⚛️', confidence: 'medium' },
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
  { pattern: /x-vercel-id|vercel\.com\/security|vercel-deployment/i, name: 'Vercel',    category: 'other',       icon: '▲', confidence: 'high' },

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
  { pattern: /datachannel\.io/i,                          name: 'DataChannel',          category: 'analytics',   icon: '📡', confidence: 'high' },
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
  { pattern: /adyogi\.com/i,                              name: 'Adyogi',               category: 'ads',         icon: '🎯', confidence: 'high' },
  { pattern: /criteo\.net|criteo\.com/i,                  name: 'Criteo',               category: 'ads',         icon: '🎯', confidence: 'high' },
  { pattern: /taboola\.com/i,                             name: 'Taboola',              category: 'ads',         icon: '📰', confidence: 'high' },
  { pattern: /outbrain\.com/i,                            name: 'Outbrain',             category: 'ads',         icon: '📰', confidence: 'high' },
  { pattern: /t\.co\/i\/adsct|static\.ads-twitter\.com/i, name: 'Twitter Ads',          category: 'ads',         icon: '🐦', confidence: 'high' },

  // ── Shopify Apps — Email / SMS / Push ─────────────────────────────────────
  { pattern: /klaviyo\.com|_learnq|KlaviyoSubscribe/i,    name: 'Klaviyo',              category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /omnisend\.com/i,                            name: 'Omnisend',             category: 'shopify_app', icon: '📨', confidence: 'high' },
  { pattern: /privy\.com|PrivyApp/i,                      name: 'Privy',                category: 'shopify_app', icon: '📩', confidence: 'high' },
  { pattern: /mailmodo\.com/i,                            name: 'Mailmodo',             category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /bitespeed\.co/i,                            name: 'BiteSpeed',            category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /pushowl\.com/i,                             name: 'PushOwl',              category: 'shopify_app', icon: '🔔', confidence: 'high' },
  { pattern: /webpushr\.com/i,                            name: 'Webpushr',             category: 'shopify_app', icon: '🔔', confidence: 'high' },
  { pattern: /recart\.com/i,                              name: 'Recart',               category: 'shopify_app', icon: '📲', confidence: 'high' },
  { pattern: /sendlane\.com/i,                            name: 'Sendlane',             category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /drip\.com/i,                                name: 'Drip',                 category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /smsbump\.com|yotpoSms/i,                    name: 'SMSBump (Yotpo SMS)',  category: 'shopify_app', icon: '📲', confidence: 'high' },
  { pattern: /postscript\.io/i,                           name: 'Postscript',           category: 'shopify_app', icon: '📲', confidence: 'high' },
  { pattern: /attentivemobile\.com/i,                     name: 'Attentive',            category: 'shopify_app', icon: '📲', confidence: 'high' },
  { pattern: /notifyvisitors\.com/i,                      name: 'NotifyVisitors',       category: 'shopify_app', icon: '🔔', confidence: 'high' },

  // ── Shopify Apps — Reviews ─────────────────────────────────────────────────
  { pattern: /yotpo\.com|yotpo-widget|window\.yotpo/i,    name: 'Yotpo',                category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /judge\.me/i,                                name: 'Judge.me',             category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /loox\.io/i,                                 name: 'Loox',                 category: 'shopify_app', icon: '📸', confidence: 'high' },
  { pattern: /okendo\.io/i,                               name: 'Okendo',               category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /stamped\.io/i,                              name: 'Stamped.io',            category: 'shopify_app', icon: '🏅', confidence: 'high' },
  { pattern: /alireviews\.io|ali-reviews/i,               name: 'Ali Reviews',          category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /rivyo\.com/i,                               name: 'Rivyo Reviews',        category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /reviewbit\.app|reviewbit/i,                 name: 'Reviewbit',            category: 'shopify_app', icon: '⭐', confidence: 'high' },

  // ── Shopify Apps — Search ──────────────────────────────────────────────────
  { pattern: /searchtap\.net/i,                           name: 'SearchTap',            category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /searchpie\.com/i,                           name: 'SearchPie',            category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /boost-sd\.app|boostcommerce\.net/i,         name: 'Boost Search & Filter',category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /searchanise\.com/i,                         name: 'Searchanise',          category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /searchspring\.net/i,                        name: 'Searchspring',         category: 'shopify_app', icon: '🔍', confidence: 'high' },
  { pattern: /doofinder\.com/i,                           name: 'Doofinder',            category: 'shopify_app', icon: '🔍', confidence: 'high' },

  // ── Shopify Apps — Subscriptions ──────────────────────────────────────────
  { pattern: /rechargeapps\.com|recharge\.com/i,          name: 'ReCharge',             category: 'shopify_app', icon: '🔁', confidence: 'high' },
  { pattern: /bold-subscriptions|boldapps\.net/i,         name: 'Bold Subscriptions',   category: 'shopify_app', icon: '🔁', confidence: 'medium' },
  { pattern: /appstle\.com/i,                             name: 'Appstle',              category: 'shopify_app', icon: '🔁', confidence: 'high' },
  { pattern: /skio\.com/i,                                name: 'Skio',                 category: 'shopify_app', icon: '🔁', confidence: 'high' },

  // ── Shopify Apps — Page Builders ──────────────────────────────────────────
  { pattern: /pagefly\.io/i,                              name: 'PageFly',              category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /gempages\.net/i,                            name: 'GemPages',             category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /shogun-|shogun\.io/i,                       name: 'Shogun',               category: 'shopify_app', icon: '🧩', confidence: 'medium' },
  { pattern: /replo\.app/i,                               name: 'Replo',                category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /beae\.io/i,                                 name: 'Beae',                 category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /ecomposer\.io/i,                            name: 'EComposer',            category: 'shopify_app', icon: '🧩', confidence: 'high' },

  // ── Shopify Apps — Upsell / CRO / Popups ──────────────────────────────────
  { pattern: /reconvert\.com/i,                           name: 'ReConvert',            category: 'shopify_app', icon: '💰', confidence: 'high' },
  { pattern: /wisepops\.com/i,                            name: 'Wisepops',             category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /justuno\.com/i,                             name: 'Justuno',              category: 'shopify_app', icon: '🎯', confidence: 'high' },
  { pattern: /zipify\.com/i,                              name: 'Zipify',               category: 'shopify_app', icon: '⚡', confidence: 'high' },
  { pattern: /carthook\.com/i,                            name: 'CartHook',             category: 'shopify_app', icon: '🛒', confidence: 'high' },
  { pattern: /wheelio|spin-to-win/i,                      name: 'Wheelio',              category: 'shopify_app', icon: '🎡', confidence: 'medium' },
  { pattern: /frequently-bought|fbt-product|frequently_bought/i, name: 'Frequently Bought Together', category: 'shopify_app', icon: '🛍️', confidence: 'medium' },
  { pattern: /honeycomb-upsell|honeycomb\.io/i,           name: 'Honeycomb Upsell',     category: 'shopify_app', icon: '🍯', confidence: 'high' },
  { pattern: /candy\.shop|candyrack/i,                    name: 'Candy Rack',           category: 'shopify_app', icon: '🍬', confidence: 'high' },
  { pattern: /monster-upsells\.com/i,                     name: 'Monster Upsells',      category: 'shopify_app', icon: '👾', confidence: 'high' },
  { pattern: /poptin\.com/i,                              name: 'Poptin',               category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /sumo\.com|sumo-site-id/i,                   name: 'Sumo',                 category: 'shopify_app', icon: '🐼', confidence: 'high' },
  { pattern: /spin-a-sale|spinasale/i,                    name: 'Spin‑a‑Sale',          category: 'shopify_app', icon: '🎡', confidence: 'high' },

  // ── Shopify Apps — Support / Chat ─────────────────────────────────────────
  { pattern: /gorgias\.com|window\.gorgias|GorgiasChat/i, name: 'Gorgias',             category: 'shopify_app', icon: '🎧', confidence: 'high' },
  { pattern: /tidio\.com/i,                               name: 'Tidio',                category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /reamaze\.com/i,                             name: 'Reamaze',              category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /richpanel\.com/i,                           name: 'Richpanel',            category: 'shopify_app', icon: '🎧', confidence: 'high' },
  { pattern: /delightchat\.io/i,                          name: 'DelightChat',          category: 'shopify_app', icon: '💬', confidence: 'high' },

  // ── Shopify Apps — Attribution / Analytics ────────────────────────────────
  { pattern: /triplewhale\.com|window\.ttq_triplewhale/i, name: 'Triple Whale',        category: 'shopify_app', icon: '🐳', confidence: 'high' },
  { pattern: /northbeam\.io/i,                            name: 'Northbeam',            category: 'shopify_app', icon: '🧭', confidence: 'high' },
  { pattern: /elevar\.com|elevar-gtm|elevarmeasured/i,   name: 'Elevar',               category: 'shopify_app', icon: '📡', confidence: 'high' },
  { pattern: /tracify\.ai/i,                              name: 'Tracify',              category: 'shopify_app', icon: '📡', confidence: 'high' },
  { pattern: /hyros\.com/i,                               name: 'Hyros',                category: 'shopify_app', icon: '📡', confidence: 'high' },
  { pattern: /rockerbox\.com/i,                           name: 'Rockerbox',            category: 'shopify_app', icon: '🚀', confidence: 'high' },

  // ── Shopify Apps — Loyalty ────────────────────────────────────────────────
  { pattern: /growave\.io/i,                              name: 'Growave',              category: 'shopify_app', icon: '💎', confidence: 'high' },
  { pattern: /smile\.io|smile-io-widget/i,                name: 'Smile.io',             category: 'shopify_app', icon: '😊', confidence: 'high' },
  { pattern: /loyaltylion\.com/i,                         name: 'LoyaltyLion',          category: 'shopify_app', icon: '🦁', confidence: 'high' },
  { pattern: /wishlist-plus|wishlisthero/i,               name: 'Wishlist Plus',        category: 'shopify_app', icon: '❤️', confidence: 'medium' },
  { pattern: /wishlink\.app/i,                            name: 'Wishlink',             category: 'shopify_app', icon: '❤️', confidence: 'high' },
  { pattern: /bloop-loyalty|bloop\.app/i,                 name: 'Bloop',                category: 'shopify_app', icon: '🎮', confidence: 'high' },

  // ── Shopify Apps — Shipping / Returns ─────────────────────────────────────
  { pattern: /aftership\.com/i,                           name: 'AfterShip',            category: 'shopify_app', icon: '📦', confidence: 'high' },
  { pattern: /loopreturns\.com/i,                         name: 'Loop Returns',         category: 'shopify_app', icon: '🔄', confidence: 'high' },
  { pattern: /clickpost\.in/i,                            name: 'ClickPost',            category: 'shopify_app', icon: '📦', confidence: 'high' },
  { pattern: /shipway\.in|shipway\.com/i,                 name: 'Shipway',              category: 'shopify_app', icon: '🚚', confidence: 'high' },
  { pattern: /nimbuspost\.com/i,                          name: 'NimbusPost',           category: 'shopify_app', icon: '🚚', confidence: 'high' },
  { pattern: /returnprime\.com/i,                         name: 'Return Prime',         category: 'shopify_app', icon: '🔄', confidence: 'high' },
  { pattern: /eship\.express/i,                           name: 'eShipz',               category: 'shopify_app', icon: '📦', confidence: 'high' },

  // ── Shopify Apps — Video / Social / UGC ──────────────────────────────────
  { pattern: /reelup\.io|reel-shopable|reel_view\.min/i,  name: 'ReelUp',               category: 'shopify_app', icon: '🎬', confidence: 'high' },
  { pattern: /instafeed|instafeed\.js/i,                  name: 'Instafeed',            category: 'shopify_app', icon: '📸', confidence: 'medium' },
  { pattern: /goaffpro\.com/i,                            name: 'GoAffPro',             category: 'shopify_app', icon: '🤝', confidence: 'high' },
  { pattern: /refersion\.com/i,                           name: 'Refersion',            category: 'shopify_app', icon: '🤝', confidence: 'high' },
  { pattern: /vidjet\.io/i,                               name: 'Vidjet',               category: 'shopify_app', icon: '🎬', confidence: 'high' },
  { pattern: /tolstoy\.com/i,                             name: 'Tolstoy',              category: 'shopify_app', icon: '🎬', confidence: 'high' },
  { pattern: /taggbox\.com/i,                             name: 'Taggbox',              category: 'shopify_app', icon: '📸', confidence: 'high' },
  { pattern: /shop-minis|shop\.app\/minis/i,              name: 'Shop Minis',           category: 'shopify_app', icon: '🛒', confidence: 'high' },

  // ── Shopify Apps — Checkout / Payment ─────────────────────────────────────
  { pattern: /gokwik\.co|GoKwik|data-gokwik/i,            name: 'GoKwik',               category: 'shopify_app', icon: '🚀', confidence: 'high' },
  { pattern: /shopflo\.com/i,                             name: 'Shopflo',              category: 'shopify_app', icon: '💳', confidence: 'high' },
  { pattern: /bold-cashier|boldcheckout/i,                name: 'Bold Cashier',         category: 'shopify_app', icon: '💳', confidence: 'medium' },
  { pattern: /cowpay\.me/i,                               name: 'CowPay',               category: 'shopify_app', icon: '💳', confidence: 'high' },

  // ── Shopify Apps — Inventory / Feed ───────────────────────────────────────
  { pattern: /sufio\.com/i,                               name: 'Sufio Invoices',       category: 'shopify_app', icon: '🧾', confidence: 'high' },
  { pattern: /omnivore\.app|onlinestoreapp/i,             name: 'Omnivore',             category: 'shopify_app', icon: '🛒', confidence: 'medium' },
  { pattern: /socialhead\.io/i,                           name: 'SocialHead',           category: 'shopify_app', icon: '📱', confidence: 'high' },

  // ── Shopify Apps — Extension handle slugs (cdn.shopify.com/extensions/...) ──
  // These match the app handle part of the extension URL e.g. "judgeme-539" → judge.me
  { pattern: /\bjudgeme\b/i,                              name: 'Judge.me',             category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /\byotpo\b/i,                                name: 'Yotpo',                category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /\bloox\b/i,                                 name: 'Loox',                 category: 'shopify_app', icon: '📸', confidence: 'high' },
  { pattern: /\bokendo\b/i,                               name: 'Okendo',               category: 'shopify_app', icon: '⭐', confidence: 'high' },
  { pattern: /\bstamped\b/i,                              name: 'Stamped.io',           category: 'shopify_app', icon: '🏅', confidence: 'high' },
  { pattern: /\bsmile-loyalty|smileio\b/i,                name: 'Smile.io',             category: 'shopify_app', icon: '😊', confidence: 'high' },
  { pattern: /\bklavio\b|\bklaviyoapp\b/i,                name: 'Klaviyo',              category: 'shopify_app', icon: '📧', confidence: 'high' },
  { pattern: /\bgorgias\b/i,                              name: 'Gorgias',              category: 'shopify_app', icon: '🎧', confidence: 'high' },
  { pattern: /\bprivy\b/i,                                name: 'Privy',                category: 'shopify_app', icon: '📩', confidence: 'high' },
  { pattern: /\brecharge\b/i,                             name: 'ReCharge',             category: 'shopify_app', icon: '🔁', confidence: 'high' },
  { pattern: /\bappstle\b/i,                              name: 'Appstle',              category: 'shopify_app', icon: '🔁', confidence: 'high' },
  { pattern: /\bpagefly\b/i,                              name: 'PageFly',              category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /\bgempages\b/i,                             name: 'GemPages',             category: 'shopify_app', icon: '🧩', confidence: 'high' },
  { pattern: /\bgrowave\b/i,                              name: 'Growave',              category: 'shopify_app', icon: '💎', confidence: 'high' },
  { pattern: /\baftershi\b|\baftershipapp\b/i,            name: 'AfterShip',            category: 'shopify_app', icon: '📦', confidence: 'high' },
  { pattern: /\bloopreturns\b/i,                          name: 'Loop Returns',         category: 'shopify_app', icon: '🔄', confidence: 'high' },
  { pattern: /\btriplewhale\b/i,                          name: 'Triple Whale',         category: 'shopify_app', icon: '🐳', confidence: 'high' },
  { pattern: /\belevar\b/i,                               name: 'Elevar',               category: 'shopify_app', icon: '📡', confidence: 'high' },
  { pattern: /\bwisepops\b/i,                             name: 'Wisepops',             category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /\bjustuno\b/i,                              name: 'Justuno',              category: 'shopify_app', icon: '🎯', confidence: 'high' },
  { pattern: /\bgokwik\b/i,                               name: 'GoKwik',               category: 'shopify_app', icon: '🚀', confidence: 'high' },
  { pattern: /\bshopflo\b/i,                              name: 'Shopflo',              category: 'shopify_app', icon: '💳', confidence: 'high' },
  { pattern: /\bpushowl\b/i,                              name: 'PushOwl',              category: 'shopify_app', icon: '🔔', confidence: 'high' },
  { pattern: /\bbiteSpeed\b|\bbitespeed\b/i,              name: 'BiteSpeed',            category: 'shopify_app', icon: '💬', confidence: 'high' },
  { pattern: /\brecart\b/i,                               name: 'Recart',               category: 'shopify_app', icon: '📲', confidence: 'high' },
  { pattern: /\bpostscript\b/i,                           name: 'Postscript',           category: 'shopify_app', icon: '📲', confidence: 'high' },

  // ── Shopify Apps — Misc ───────────────────────────────────────────────────
  { pattern: /trafficly|trafficly\.io/i,                  name: 'Trafficly',            category: 'shopify_app', icon: '👁️', confidence: 'high' },
  { pattern: /simesy\.com/i,                              name: 'Simesy',               category: 'shopify_app', icon: '🛠️', confidence: 'high' },
  { pattern: /globo\.support|globotools/i,                name: 'Globo Tools',          category: 'shopify_app', icon: '🌐', confidence: 'high' },

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

  // ── Payment ───────────────────────────────────────────────────────────────
  { pattern: /razorpay\.com/i,                            name: 'Razorpay',             category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /js\.stripe\.com/i,                          name: 'Stripe',               category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /cashfree\.com/i,                            name: 'Cashfree',             category: 'payment',     icon: '💰', confidence: 'high' },
  { pattern: /payu\.in|payu\.biz/i,                       name: 'PayU',                 category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /phonepe\.com/i,                             name: 'PhonePe',              category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /juspay\.in/i,                               name: 'Juspay',               category: 'payment',     icon: '💳', confidence: 'high' },
  { pattern: /easebuzz\.in/i,                             name: 'Easebuzz',             category: 'payment',     icon: '💳', confidence: 'high' },
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

/**
 * Extract all external script src URLs from HTML.
 */
function extractScriptUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

/**
 * Extract preconnect / dns-prefetch hrefs from HTML — reveals services
 * even when they're loaded lazily via JS.
 */
function extractPreconnectUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<link[^>]+(?:preconnect|dns-prefetch)[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    urls.push(m[1]);
  }
  // Also match reversed attribute order
  const re2 = /<link[^>]+href=["']([^"']+)["'][^>]+(?:preconnect|dns-prefetch)/gi;
  while ((m = re2.exec(html)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

/**
 * Find first Shopify CDN JS bundle URL in the HTML and return it.
 * Handles both cdn.shopify.com and custom-domain CDNs (//storename.com/cdn/shop/...).
 */
function findShopifyThemeJsUrl(html: string, origin: string): string | null {
  // Match any JS file on cdn.shopify.com (absolute)
  const absRe = /https:\/\/cdn\.shopify\.com\/s\/files\/[^"' ]+\.js[^"' ]*/gi;
  const absMatches = html.match(absRe) ?? [];

  // Match protocol-relative or absolute URLs with /cdn/shop/ path (custom CDN domain)
  const relRe = /(?:https?:)?\/\/[^"' ]*\/cdn\/shop\/[^"' ]+\.js[^"' ]*/gi;
  const relMatches = (html.match(relRe) ?? []).map(u =>
    u.startsWith('//') ? `https:${u}` : u
  );

  // Match relative /cdn/shop/ URLs and resolve against origin
  const rootRe = /["'](\/cdn\/shop\/[^"']+\.js[^"']*)/gi;
  let m: RegExpExecArray | null;
  const rootMatches: string[] = [];
  while ((m = rootRe.exec(html)) !== null) {
    rootMatches.push(`${origin}${m[1]}`);
  }

  const all = [...absMatches, ...relMatches, ...rootMatches];
  if (!all.length) return null;

  // Sort by URL length (longer = more likely to be a bundled file)
  all.sort((a, b) => b.length - a.length);
  return all[0];
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

    // Detect bot-protection pages (Cloudflare, Vercel challenge, etc.)
    // We still run fingerprints since we can at least detect the protection layer
    const isBotBlocked =
      /<title>.*?(just a moment|security check|vercel security checkpoint|attention required)/i.test(html) ||
      (res.status === 403 && html.length < 5000);

    if (isBotBlocked) {
      // Still analyze what we have — may reveal CDN/Cloudflare/Vercel
      const partialTech: DetectedTech[] = [];
      const seen = new Set<string>();
      const partialTarget = html + '\n' + headerStr;
      for (const fp of FINGERPRINTS) {
        if (!seen.has(fp.name) && fp.pattern.test(partialTarget)) {
          seen.add(fp.name);
          partialTech.push({ name: fp.name, category: fp.category, icon: fp.icon, confidence: fp.confidence });
        }
      }
      return NextResponse.json({
        tech: partialTech,
        error: 'Site has bot protection — results may be incomplete. Try scanning a specific page URL.',
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

  // Extract script URLs and preconnect hints — these reveal lazy-loaded services
  const scriptUrls = extractScriptUrls(html);
  const preconnectUrls = extractPreconnectUrls(html);

  // Build initial search target: HTML + response headers + all script src URLs + preconnect URLs
  let searchTarget =
    html + '\n' +
    headerStr + '\n' +
    scriptUrls.join('\n') + '\n' +
    preconnectUrls.join('\n');

  // ── Phase 2: Parallel secondary fetches ───────────────────────────────────
  const secondaryFetches: Promise<string>[] = [];

  // 2a. GTM container — most impactful: contains ALL tags configured in GTM
  //     (Facebook Pixel IDs, GA4, custom HTML tags, etc.)
  const gtmIds = [...new Set(
    [...html.matchAll(/GTM-[A-Z0-9]+/g)].map(m => m[0])
  )];
  for (const gtmId of gtmIds.slice(0, 2)) {
    secondaryFetches.push(
      safeFetch(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`, 8000)
    );
  }

  // 2b. Shopify theme JS bundle — contains app initialization code
  const isShopify = /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|ShopifyAnalytics|window\.Shopify\s*=/i.test(searchTarget);
  if (isShopify) {
    const themeJsUrl = findShopifyThemeJsUrl(html, parsed.origin);
    if (themeJsUrl) {
      secondaryFetches.push(
        safeFetch(themeJsUrl, 8000).then(js => js.slice(0, 300_000)) // cap at 300 KB
      );
    }

    // Also check a product page which often has more app scripts
    try {
      const origin = new URL(parsed.href).origin;
      secondaryFetches.push(safeFetch(`${origin}/collections/all`, 6000));
    } catch { /* ignore */ }
  }

  // Wait for all secondary fetches in parallel
  if (secondaryFetches.length > 0) {
    const secondaryResults = await Promise.allSettled(secondaryFetches);
    for (const result of secondaryResults) {
      if (result.status === 'fulfilled' && result.value) {
        searchTarget += '\n' + result.value;
      }
    }
  }

  // ── Phase 2c: Extract Shopify app extension URLs for richer matching ──────
  // cdn.shopify.com/extensions/{uuid}/{app-handle-version}/assets/...
  // The app handle often contains recognizable keywords
  const extensionUrlRe = /cdn\.shopify\.com\/extensions\/[0-9a-f-]+\/([a-z0-9-]+)-\d+\/assets/gi;
  let extMatch: RegExpExecArray | null;
  const extensionHandles: string[] = [];
  while ((extMatch = extensionUrlRe.exec(searchTarget)) !== null) {
    extensionHandles.push(extMatch[1]);
  }
  if (extensionHandles.length > 0) {
    searchTarget += '\n' + extensionHandles.join('\n');
  }

  // ── Phase 3: Run fingerprints and deduplicate by name ─────────────────────
  const seen = new Set<string>();
  const tech: DetectedTech[] = [];

  for (const fp of FINGERPRINTS) {
    if (!seen.has(fp.name) && fp.pattern.test(searchTarget)) {
      seen.add(fp.name);
      tech.push({ name: fp.name, category: fp.category, icon: fp.icon, confidence: fp.confidence });
    }
  }

  return NextResponse.json({ tech });
}
