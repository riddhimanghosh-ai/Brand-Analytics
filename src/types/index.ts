export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  shopifyStoreUrl: string | null;
  shopifyAccessToken: string | null;
  ga4PropertyId: string | null;
  ga4ServiceAccountJson: string | null;
  metaAppId: string | null;
  metaAppSecret: string | null;
  metaAccessToken: string | null;
  metaAdAccountId: string | null;
  googleAdsDevToken: string | null;
  googleAdsClientId: string | null;
  googleAdsClientSecret: string | null;
  googleAdsRefreshToken: string | null;
  googleAdsCustomerId: string | null;
  geminiApiKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyKPIs {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  repeatCustomerRate: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  refundRate: number;
  averageItemsPerOrder: number;
  totalDiscountsGiven: number;
  // CRO metrics
  returningCustomerRevenue: number;
  newCustomerRevenue: number;
  topSellingProduct: string;
  averageFulfillmentDays: number;
  // Comparison
  prevTotalRevenue: number;
  prevTotalOrders: number;
  prevAverageOrderValue: number;
  prevTotalCustomers: number;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  totalPrice: number;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  lineItemsCount: number;
  customerName: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  totalRevenue: number;
  totalUnitsSold: number;
  totalOrders: number;
  averagePrice: number;
  imageUrl: string | null;
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
  tags: string[];
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TrafficSource {
  source: string;
  sessions: number;
  percentage: number;
}

export interface CampaignData {
  id: string;
  name: string;
  platform: 'meta' | 'google';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ConnectionStatus {
  shopify: boolean;
  ga4: boolean;
  metaAds: boolean;
  googleAds: boolean;
  gemini: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface DetectedTech {
  name: string;
  category: 'platform' | 'analytics' | 'ads' | 'shopify_app' | 'chat' | 'payment' | 'other';
  icon: string;
  confidence: 'high' | 'medium';
}

export interface TrackedWebsite {
  id: string;
  url: string;
  name?: string;
  addedAt: string;
  lastScanned?: string;
  tech?: DetectedTech[];
}

// ── Competitor price tracker ────────────────────────────────────────────────

export interface TrackedProductSnapshot {
  id: string;          // Shopify product id
  title: string;
  handle: string;
  price: number;       // lowest variant price
  compareAtPrice: number | null;
  available: boolean;
  imageUrl: string | null;
  publishedAt?: string | null;  // from products.json — powers New Launch Detector
}

// ── Competitor watch (sitemap diff) ─────────────────────────────────────────

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
  kind: 'page' | 'collection' | 'blog';
}

export interface SitemapChangeEvent {
  date: string;            // ISO timestamp of the scan that detected it
  loc: string;
  kind: SitemapEntry['kind'];
  type: 'added' | 'removed';
}

export interface PriceChangeEvent {
  date: string;        // ISO timestamp of the scan that detected it
  productId: string;
  productTitle: string;
  handle: string;
  type: 'price_up' | 'price_down' | 'new_product' | 'removed' | 'back_in_stock' | 'out_of_stock';
  oldPrice: number | null;
  newPrice: number | null;
}

export interface TrackedStore {
  id: string;
  url: string;          // store origin, e.g. https://www.beardo.in
  name?: string;
  addedAt: string;
  lastScanned?: string;
  products?: TrackedProductSnapshot[];
  changes?: PriceChangeEvent[];   // most recent first, capped
  sitemap?: SitemapEntry[];               // last sitemap scan (pages/collections/blogs)
  sitemapScannedAt?: string;
  sitemapChanges?: SitemapChangeEvent[];  // most recent first, capped
}

export interface BrandEvent {
  id: string;
  title: string;
  type: 'bogo' | 'bundle' | 'discount_pct' | 'discount_fixed' | 'flash_sale' | 'free_shipping' | 'loyalty' | 'other';
  description: string;
  startDate: string;       // "YYYY-MM-DD"
  endDate: string;         // "YYYY-MM-DD"
  startTime?: string;      // "HH:MM"
  endTime?: string;        // "HH:MM"
  audience: 'all' | 'campaign' | 'specific';
  audienceDetails?: string;
  channels: string[];      // ['email', 'whatsapp', 'instagram', 'paid_ads', 'website', 'in_store']
  tags?: string[];
  discountValue?: number;
  discountUnit?: 'pct' | 'fixed';
  notes?: string;
  revenueTarget?: number;
}
