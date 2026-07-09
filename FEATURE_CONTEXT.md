# Brand Analytics Dashboard — Feature Context & Build Spec

This document describes the architecture, data flows, and implementation patterns used to build six key features in this Next.js analytics dashboard. Use it as a reference to replicate or extend these features in another project.

---

## Stack

- **Framework**: Next.js (App Router, TypeScript)
- **Database**: MongoDB via `src/lib/mongodb-store.ts` — stores brand config (`Brand` document) and competitor catalog snapshots (`trackedStores` array on the Brand document)
- **Auth**: Cookie-based session (`src/lib/auth.ts`, `src/lib/auth-server.ts`) — every API route calls `requireBrandAccess(slug)` before doing anything
- **Data sources**: Shopify Admin GraphQL, Shopify public `/products.json`, Shopify public `/sitemap.xml`, Meta Marketing API, Google Analytics 4 Data API
- **AI**: Anthropic Claude Haiku (`claude-haiku-4-5`) via direct REST for sentiment analysis; `ANTHROPIC_API_KEY` from env
- **Deployment**: AWS Amplify (auto-deploys from GitHub `main`)
- **Demo mode**: Every API route checks `if (slug === 'demo') return NextResponse.json(demoXxx)` immediately after auth, before any real API call. Demo data lives in `src/lib/demo-data.ts`.

---

## Global Patterns

### API route shape
```typescript
// src/app/api/[feature]/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const { denied } = await requireBrandAccess(slug);
  if (denied) return denied;

  // Demo short-circuit — always before real API calls
  if (slug === 'demo') return NextResponse.json(demoFeatureData);

  const brand = await getBrand(slug);
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  // ... real data fetching
  return NextResponse.json(result);
}
```

### Client page shape
```typescript
// src/app/dashboard/[slug]/[feature]/page.tsx
'use client';
export default function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange(); // global date state via localStorage + CustomEvent
  const [data, setData] = useState<FeatureData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/feature?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);
  // ... render
}
```

### Date range
- Global date state: `setGlobalDateRange(from, to)` / `useGlobalDateRange()` in `src/lib/use-date-range.ts`
- Persisted to `localStorage`, broadcast via `CustomEvent('globalDateRangeChange')`
- API routes accept `?from=YYYY-MM-DD&to=YYYY-MM-DD` or `?range=30d`
- Presets: Today, Yesterday, Last 7/14/30/90/365 days, Last X days (free input)

---

## Feature 1: Events & Campaigns

### What it does
Users log brand events (sales, influencer campaigns, collection drops, flash discounts) with a start/end date, type, and optional revenue target. The page shows each event's actual revenue during the event period vs a pre-event daily baseline, computing lift percentage and target achievement.

### Data model
Events are stored in MongoDB on the `Brand` document:
```typescript
interface BrandEvent {
  id: string;           // nanoid
  title: string;
  type: 'sale' | 'campaign' | 'launch' | 'collab' | 'other';
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  revenueTarget?: number;
  notes?: string;
}
```

### API route: `src/app/api/event-roi/route.ts`
- Fetches all events from `brand.events`
- For each event, fetches Shopify orders during the event period and the 14 days prior (baseline window)
- Computes `dailyBaseline = sum(pre-event revenue) / 14`
- Computes `dailyDuring = sum(during revenue) / eventDays`
- `liftPct = ((dailyDuring - dailyBaseline) / dailyBaseline) * 100`
- Returns:
```typescript
{
  events: EventRoiRow[];   // sorted by startDate desc
  byType: { type: string; count: number; avgLiftPct: number; totalRevenue: number }[];
}

interface EventRoiRow {
  id: string; title: string; type: string;
  startDate: string; endDate: string;
  status: 'ended' | 'ongoing' | 'upcoming';
  days: number;
  revenueDuring: number; ordersDuring: number; dailyDuring: number;
  dailyBaseline: number;
  liftPct: number | null;           // null if upcoming
  revenueTarget: number | null;
  targetAchievedPct: number | null; // null if upcoming
}
```

### Events CRUD: `src/app/api/events/route.ts`
- GET: returns `brand.events`
- POST: appends a new event (generates `id` with `nanoid`)
- DELETE: removes event by `id`

### Page: `src/app/dashboard/[slug]/event-roi/page.tsx`
- Two sections: event log table (from `/api/events`) + ROI analysis (from `/api/event-roi`)
- Status badge: upcoming (blue) / ongoing (green pulse) / ended (grey)
- Lift shown as `+58.3%` green or `-12.0%` red
- `byType` summary shows which event type historically performs best

---

## Feature 2: Social Comments

### What it does
Pulls real comment text from every active Meta ad creative, runs Claude Haiku sentiment analysis, and surfaces the full inbox with purchase-intent flags. Covers Instagram ad comments (via `/{effective_instagram_media_id}/comments`) and attempts Facebook page-post comments.

### Key insight
Meta's `/{ig_media_id}/comments` endpoint works for comments on organic IG posts when you have `instagram_manage_comments`. For comments on ad-linked posts (including influencer Partnership ads), use `effective_instagram_media_id` from the ad creative — this is what makes it possible to read comments on ads running from influencer accounts you don't own.

### Data flow
1. `getAdCommentAnalytics()` in `src/lib/services/meta.ts`:
   - Fetches up to 60 ads from the ad account (last N days)
   - For each ad, resolves `effective_instagram_media_id` from `object_story_spec` or ad creative
   - Fetches comments with pagination (up to 4 pages × 50 = 200 comments per post)
   - Runs 10 ads in parallel (`COMMENT_FETCH_CONCURRENCY = 10`) to avoid timeout
2. `analyzeSentiment()` in `src/lib/services/social.ts`:
   - Batches comments in groups of 25
   - All batches run in parallel (`Promise.all`)
   - Claude Haiku primary, Gemini fallback
   - Prompt handles English/Hindi/Hinglish, flags sarcasm as negative
3. Result returned as `SocialInboxItem[]`

### SocialInboxItem shape
```typescript
interface SocialInboxItem {
  id: string;
  platform: 'facebook' | 'instagram';
  sourceType: 'ad_comment' | 'page_comment' | 'ig_comment' | 'page_tag' | 'ig_mention';
  contentObjectId: string;    // post/media ID
  postPreview: string;        // first 60 chars of ad copy
  message: string;            // comment text
  authorName: string;         // @username for IG, name for FB
  authorPlatformId: string;
  createdAt: string;          // ISO
  adId?: string | null;
  adName?: string | null;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;    // 0-1 confidence
}
```

### Purchase intent detection
```typescript
const INTENT_RE = /\b(link|price|kitna|kitne|cost|buy|kaha|kahan|where|how much|order|available|website|dm)\b/i;
```
Applied client-side — no extra API call needed.

### API route: `src/app/api/social/route.ts`
- `maxDuration = 120` (Vercel/Amplify function timeout)
- All three comment sources run in `Promise.allSettled` (ad comments + FB page inbox + IG organic inbox)
- Deduplication by `${id}:${sourceType}` key
- `?sentiment=true` triggers sentiment analysis
- `?diagnostics=1` adds permissions check and page coverage
- Brand config must have `metaInstagramAccountIds` set to avoid test-page pollution

### Important: IG account ID isolation
```typescript
// In brand MongoDB doc:
metaInstagramAccountIds: ['17841425197197098']  // hardcoded to real brand IG, not test pages
```
Without this, `me/accounts` may return wrong pages connected to the same OAuth token.

### Sentiment prompt
```
Analyze the sentiment of each customer comment below (they may be in English, Hindi, or Hinglish).
Respond ONLY with a JSON array: [{"id":"...","sentiment":"positive|neutral|negative","score":0.0-1.0}]
Score is confidence 0-1. Sarcasm and mockery count as negative.
```

---

## Feature 3: Competitor Price Tracker

### What it does
Tracks competitor Shopify stores' product catalogs — prices, stock, new products — using only public endpoints (no auth required). Shows price change events, stockouts, and new launches across all tracked competitors.

### How competitor data is stored
```typescript
// On Brand document in MongoDB:
trackedStores: TrackedStore[]

interface TrackedStore {
  url: string;                    // e.g. "https://brand.myshopify.com"
  name: string;
  lastScannedAt?: string;
  products?: TrackedProductSnapshot[];
  sitemap?: SitemapEntry[];
  sitemapScannedAt?: string;
  sitemapChanges?: SitemapChangeEvent[];
}

interface TrackedProductSnapshot {
  id: string;           // product handle or ID
  title: string;
  handle: string;
  price: number;        // in INR or store currency
  compareAtPrice?: number | null;
  available: boolean;   // in stock
  imageUrl?: string;
  publishedAt?: string; // when product first appeared — powers New Launch Detector
  variants?: Array<{ title: string; price: number; available: boolean }>;
}
```

### Public Shopify endpoints used
```
GET https://{store}.myshopify.com/products.json?limit=250&page=1
GET https://{store}.myshopify.com/sitemap.xml
GET https://{store}.myshopify.com/sitemap_collections_1.xml  (sub-sitemap)
GET https://{store}.myshopify.com/sitemap_pages_1.xml
GET https://{store}.myshopify.com/sitemap_blogs_1.xml
```
No API key needed. Rate limit: ~2 req/s is safe.

### API route: `src/app/api/competitor-watch/route.ts`
- `GET ?url=https://store.myshopify.com&what=products|sitemap|both`
- Products: fetches 2 pages of `/products.json`, maps to `TrackedProductSnapshot`
- Sitemap: fetches `/sitemap.xml` index → resolves sub-sitemaps → extracts `<loc>` + `<lastmod>` per entry
- Returns raw snapshot — diffing happens client-side

### Client-side diff logic: `src/lib/competitor-scan.ts`
```typescript
// Product diff events:
type ProductChangeEvent =
  | { type: 'new_product'; product: TrackedProductSnapshot }
  | { type: 'price_up'; product; from: number; to: number }
  | { type: 'price_down'; product; from: number; to: number }
  | { type: 'out_of_stock'; product }
  | { type: 'back_in_stock'; product }
  | { type: 'removed'; product }

function diffProducts(prev: TrackedProductSnapshot[], next: TrackedProductSnapshot[]): ProductChangeEvent[]

// Sitemap diff events:
type SitemapChangeEvent = { date: string; loc: string; kind: 'page'|'collection'|'blog'; type: 'added'|'removed' }

function diffSitemap(prev: SitemapEntry[], next: SitemapEntry[]): SitemapChangeEvent[]
```

### Persisting after scan
```typescript
// After scan + diff, save updated store back to brand:
await fetch(`/api/brands/${slug}`, {
  method: 'PUT',
  body: JSON.stringify({ trackedStores: updatedStores })
});
```

### Page: `src/app/dashboard/[slug]/price-tracker/page.tsx`
- Server component — fetches `brand.trackedStores` from MongoDB
- Passes `initialStores` to client component
- Client component: "Scan all" button triggers parallel scans, shows diff events in a feed
- All 4 competitor pages (Price Tracker, New Launch Detector, Stockout Sniper, Campaign Watch) share the same `trackedStores` list — scan once, all pages update

---

## Feature 4: New Launch Detector

### What it does
Surfaces products that appeared in a competitor's catalog after the last scan, sorted by `publishedAt` date. Tells you a competitor launched something new the same day their Shopify store goes live — before their Instagram post, before their email blast.

### How it works
- Uses `publishedAt` from Shopify's `products.json` — this is the date the product was made visible on the storefront
- On first scan: baseline established (no "new" products shown, all treated as existing)
- On subsequent scans: any product with `publishedAt` after `store.lastScannedAt` is flagged as a new launch
- Also flags: products that appear in the `next` snapshot but were absent from `prev` (even if `publishedAt` is old — could be a restock of a previously hidden product)

### Component: `src/components/LaunchDetector.tsx`
```typescript
// Props
interface LaunchDetectorProps {
  initialStores: TrackedStore[];
  slug: string;
}

// Scan logic
async function scanStore(url: string, what: 'products' | 'sitemap' | 'both') {
  const res = await fetch(`/api/competitor-watch?url=${encodeURIComponent(url)}&what=${what}`);
  return res.json();
}

// A "new launch" = product in next scan not in prev scan (by handle)
const newProducts = nextProducts.filter(p =>
  !prevProducts.some(pp => pp.handle === p.handle)
);
```

### Page: `src/app/dashboard/[slug]/launches/page.tsx`
- Server component, passes `initialStores` to `<LaunchDetector>`
- Shows table: competitor name, product title, price, launch date, days since launch
- Filter: "Last 7 days" / "Last 30 days" / "All time"
- Empty state: "Scan your tracked stores to detect new launches"

---

## Feature 5: Stockout Sniper

### What it does
Detects when a competitor's product goes out of stock and flags it as an opportunity window. Their demand has nowhere to go — target their customers with your equivalent product.

### Detection logic
From the product diff:
```typescript
// A stockout = was available: true, now available: false
const stockouts = changeEvents.filter(e => e.type === 'out_of_stock');
// A recovery = was available: false, now available: true
const recoveries = changeEvents.filter(e => e.type === 'back_in_stock');
```

The sniper also tracks how long a product has been out of stock:
```typescript
// Store the stockout timestamp on the snapshot:
if (prev.available && !next.available) {
  next.stockedOutAt = new Date().toISOString();
}
// Days out of stock:
const daysOut = stockedOutAt
  ? Math.floor((Date.now() - new Date(stockedOutAt).getTime()) / 86_400_000)
  : null;
```

### Component: `src/components/StockoutSniper.tsx`
- Shows active stockouts (still out of stock) sorted by `daysOut` desc — longest outages first
- Shows recovered products (back in stock) with how long the window lasted
- Opportunity badge: "Window open X days"
- Action prompt: "Run a comparison ad targeting [product name] searches"

### Page: `src/app/dashboard/[slug]/stockout-sniper/page.tsx`
- Same server + client pattern as other competitor pages
- Shares `trackedStores` — no separate scan needed

---

## Feature 6: Campaign Watch (Sitemap Diff)

### What it does
Watches competitors' sitemap for new pages, new collections, and new blog posts. A new collection appearing = likely a campaign launch or product category expansion. A new blog post = content marketing play. Shows added/removed URLs with their `<lastmod>` date.

### Sitemap parsing: `src/app/api/competitor-watch/route.ts`
```typescript
// 1. Fetch /sitemap.xml index
// 2. Find sub-sitemap URLs: sitemap_pages_1.xml, sitemap_collections_1.xml, sitemap_blogs_1.xml
// 3. For each sub-sitemap, extract all <url><loc>...</loc><lastmod>...</lastmod></url> entries
// 4. Classify by URL pattern:
function classifyUrl(loc: string): 'page' | 'collection' | 'blog' {
  if (loc.includes('/collections/')) return 'collection';
  if (loc.includes('/blogs/')) return 'blog';
  return 'page';
}
```

### SitemapEntry shape
```typescript
interface SitemapEntry {
  loc: string;          // full URL
  lastmod: string | null;
  kind: 'page' | 'collection' | 'blog';
}
```

### Component: `src/components/CampaignWatch.tsx`
- Change feed: shows added/removed URLs with icon per kind
  - 📄 page, 🗂️ collection, 📝 blog
- Filter by kind
- "Added" = green, "Removed" = red (with strikethrough URL)
- Sort by `lastmod` date desc

---

## Shared: Adding a new competitor store

All 4 competitor pages share the same add/remove UI (in Price Tracker page):
```typescript
// Add store:
const updated = [...stores, { url, name, products: [], sitemap: [] }];
await fetch(`/api/brands/${slug}`, { method: 'PUT', body: JSON.stringify({ trackedStores: updated }) });

// Remove store:
const updated = stores.filter(s => s.url !== url);
await fetch(`/api/brands/${slug}`, { method: 'PUT', body: JSON.stringify({ trackedStores: updated }) });
```

The `/api/brands/[slug]` PUT route merges the payload into the brand document (partial update).

---

## Demo Data Pattern

All features have demo data in `src/lib/demo-data.ts`. Each API route checks:
```typescript
if (slug === 'demo') return NextResponse.json(demoFeatureData);
```

Demo brand: Indian tech accessories — Premium Wireless Earbuds, Smart Watch Series 5, Bluetooth Speaker Mini, Phone Case Pro, USB-C Hub. Monthly revenue ~₹2,84,750, ~1,847 orders. Four Meta ad campaigns: Earbuds Feature Reel (IG), Summer Sale FB Carousel, Smart Watch Launch (IG), UGC Testimonial (FB).

Demo competitor stores (for Price Tracker / New Launch / Stockout / Campaign Watch): populated as mock `TrackedStore[]` objects in `demoTrackedStores` export — no real scan needed for demo mode since the server pages pass `initialStores` from the brand document, and the demo brand document has mock stores pre-populated in MongoDB.

---

## File Structure Reference

```
src/
  app/
    api/
      actions/route.ts          — Action Center daily brief
      budget-moves/route.ts     — Budget reallocation recommendations
      code-forensics/route.ts   — Discount code classification (growth/deal-hunters)
      competitor-watch/route.ts — Public Shopify catalog + sitemap fetcher
      coupon-leak/route.ts      — Scan coupon sites for leaked discount codes
      event-roi/route.ts        — Event lift vs baseline
      events/route.ts           — CRUD for brand events
      fatigue/route.ts          — Creative fatigue detector
      goals/route.ts            — Revenue goal tracking
      insights/route.ts         — RFM segments, cohorts, velocity
      payback/route.ts          — CAC payback cohorts
      profit/route.ts           — P&L / blended MER
      purchase-patterns/route.ts — Bundle Builder + Replenishment
      restock/route.ts          — Inventory × velocity
      search-gaps/route.ts      — GA4 search terms with no product match
      social/route.ts           — Meta ad + IG + FB comments with sentiment
    dashboard/[slug]/
      actions/page.tsx
      bundles/page.tsx
      campaign-watch/page.tsx
      code-forensics/page.tsx
      cohorts/page.tsx
      coupon-leak/page.tsx
      event-roi/page.tsx
      events/page.tsx
      fatigue/page.tsx
      launches/page.tsx
      price-tracker/page.tsx
      replenishment/page.tsx
      restock/page.tsx
      search-gaps/page.tsx
      segments/page.tsx
      social/page.tsx
      stockout-sniper/page.tsx
      velocity/page.tsx
  components/
    CampaignWatch.tsx
    LaunchDetector.tsx
    StockoutSniper.tsx
    DateRangeDropdown.tsx       — Global date picker with Today/Yesterday/Last X days
    NavLink.tsx
  lib/
    competitor-scan.ts          — Client helpers: scanStore, diffProducts, diffSitemap, persistStores
    demo-data.ts                — All demo data exports
    mongodb-store.ts            — getBrand, getBrands, updateBrand
    services/
      meta.ts                   — Meta Marketing API: ads, comments, creative fatigue
      shopify.ts                — Shopify GraphQL + REST: orders, inventory, discounts, insights
      social.ts                 — Organic FB/IG inbox + analyzeSentiment (Claude + Gemini)
      ga4.ts                    — GA4 Data API: sessions, events, search terms
    use-date-range.ts           — useGlobalDateRange, setGlobalDateRange, useDateRangeLabel
    auth.ts                     — User list, verifySession, canAccessBrand
    auth-server.ts              — requireBrandAccess (server-side)
```
