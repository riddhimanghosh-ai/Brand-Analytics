/**
 * Demo data for the "Demo" brand — realistic mock data for all platforms.
 * Returned by API routes when slug === 'demo', so no real credentials needed.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function randomBetween(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

// Generate 90 days of daily revenue trending upward
function generateRevenueSeries(days = 90): { date: string; revenue: number; orders: number }[] {
  const series = [];
  const baseRevenue = 7000;
  const trend = 35; // daily upward drift
  for (let i = days - 1; i >= 0; i--) {
    const dayOfWeek = new Date(daysAgo(i)).getDay();
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;
    const noise = randomBetween(0.8, 1.25, 3);
    const revenue = Math.round((baseRevenue + trend * (days - i)) * weekendBoost * noise);
    const orders = Math.round(revenue / 154);
    series.push({ date: daysAgo(i), revenue, orders });
  }
  return series;
}

const revenueSeries = generateRevenueSeries(90);

// ─── Shopify ─────────────────────────────────────────────────────────────────

export const demoShopifyKPIs = {
  totalRevenue: 284750,
  totalOrders: 1847,
  averageOrderValue: 154.2,
  totalCustomers: 3241,
  repeatCustomerRate: 34.2,
  conversionRate: 3.8,
  cartAbandonmentRate: 67.4,
  refundRate: 2.1,
  averageItemsPerOrder: 2.3,
  returningCustomerRevenue: 97383,
  newCustomerRevenue: 187367,
  topSellingProduct: 'Premium Wireless Earbuds',
  averageFulfillmentDays: 1.8,
  prevTotalRevenue: 241300,
  prevTotalOrders: 1623,
  prevAverageOrderValue: 148.7,
  prevTotalCustomers: 2980,
};

export const demoShopifyRevenue = revenueSeries;

export const demoShopifyProducts = [
  { title: 'Premium Wireless Earbuds', revenue: 54200, orders: 412, quantity: 487 },
  { title: 'Noise-Cancelling Headphones', revenue: 38900, orders: 198, quantity: 213 },
  { title: 'Smart Watch Series 5', revenue: 31700, orders: 147, quantity: 152 },
  { title: 'Portable Bluetooth Speaker', revenue: 24100, orders: 287, quantity: 301 },
  { title: 'USB-C Fast Charger (3-Pack)', revenue: 19800, orders: 521, quantity: 1563 },
  { title: 'Laptop Stand Pro', revenue: 17400, orders: 193, quantity: 207 },
  { title: 'Mechanical Keyboard TKL', revenue: 14200, orders: 89, quantity: 92 },
  { title: 'RGB Gaming Mouse', revenue: 11600, orders: 154, quantity: 163 },
  { title: 'Webcam 4K Ultra', revenue: 9800, orders: 112, quantity: 118 },
  { title: 'Monitor Light Bar', revenue: 8100, orders: 243, quantity: 261 },
];

export const demoShopifyCustomers = [
  { date: daysAgo(29), new_customers: 87, returning_customers: 43 },
  { date: daysAgo(24), new_customers: 94, returning_customers: 51 },
  { date: daysAgo(19), new_customers: 76, returning_customers: 47 },
  { date: daysAgo(14), new_customers: 103, returning_customers: 58 },
  { date: daysAgo(9), new_customers: 89, returning_customers: 62 },
  { date: daysAgo(4), new_customers: 112, returning_customers: 71 },
  { date: daysAgo(0), new_customers: 98, returning_customers: 67 },
];

export const demoShopifyOrderStatus = [
  { status: 'fulfilled', count: 1524, percentage: 82.5 },
  { status: 'unfulfilled', count: 187, percentage: 10.1 },
  { status: 'partially_fulfilled', count: 94, percentage: 5.1 },
  { status: 'refunded', count: 42, percentage: 2.3 },
];

export const demoShopifyOrders = Array.from({ length: 50 }, (_, i) => ({
  id: `#${10000 + i}`,
  created_at: daysAgo(Math.floor(Math.random() * 30)),
  total_price: randomBetween(49, 490, 2),
  financial_status: ['paid', 'paid', 'paid', 'refunded', 'pending'][Math.floor(Math.random() * 5)],
  fulfillment_status: ['fulfilled', 'fulfilled', 'unfulfilled', 'partial'][Math.floor(Math.random() * 4)],
  line_items_count: Math.floor(Math.random() * 4) + 1,
  customer_name: ['Alex M.', 'Priya S.', 'Jordan T.', 'Sam K.', 'Riley P.'][Math.floor(Math.random() * 5)],
}));

export const demoShopifyConversionFunnel = [
  { stage: 'Sessions', count: 74800, dropoffRate: 0 },
  { stage: 'Product Views', count: 34100, dropoffRate: 54.4 },
  { stage: 'Add to Cart', count: 8920, dropoffRate: 73.8 },
  { stage: 'Checkout Started', count: 4760, dropoffRate: 46.6 },
  { stage: 'Checkout Completed', count: 1847, dropoffRate: 61.2 },
];

export const demoShopifyAdvanced = {
  locationBreakdown: [
    { city: 'Mumbai', state: 'Maharashtra', revenue: 54200, orders: 341 },
    { city: 'Delhi', state: 'Delhi', revenue: 48700, orders: 298 },
    { city: 'Bangalore', state: 'Karnataka', revenue: 39800, orders: 251 },
    { city: 'Hyderabad', state: 'Telangana', revenue: 29100, orders: 187 },
    { city: 'Chennai', state: 'Tamil Nadu', revenue: 24300, orders: 163 },
    { city: 'Pune', state: 'Maharashtra', revenue: 19800, orders: 143 },
    { city: 'Kolkata', state: 'West Bengal', revenue: 16700, orders: 112 },
    { city: 'Ahmedabad', state: 'Gujarat', revenue: 12400, orders: 87 },
  ],
  salesChannels: [
    { channel: 'Online Store', revenue: 219000, orders: 1412, percentage: 76.9 },
    { channel: 'Instagram Shopping', revenue: 38200, orders: 247, percentage: 13.4 },
    { channel: 'Google Shopping', revenue: 18900, orders: 132, percentage: 6.6 },
    { channel: 'Point of Sale', revenue: 8650, orders: 56, percentage: 3.1 },
  ],
  discountAnalysis: {
    discountedOrders: 412,
    totalDiscountAmount: 18750,
    avgDiscountPct: 11.4,
    mostUsedCode: 'SAVE15',
  },
  timeAnalysis: {
    peakHour: 20,
    peakDay: 'Saturday',
    avgOrdersByHour: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: Math.round(15 + (h >= 18 && h <= 22 ? 45 : h >= 10 && h <= 14 ? 25 : 5) * Math.random()),
    })),
  },
  clvMetrics: {
    avgLTV: 387,
    avgPurchaseFrequency: 2.51,
    avgCustomerLifespan: 14.2,
    topCustomerLTV: 4820,
  },
  aovByDate: revenueSeries.slice(-30).map((d) => ({
    date: d.date,
    aov: parseFloat((d.revenue / (d.orders || 1)).toFixed(2)),
  })),
  financialFunnel: {
    grossRevenue: 284750,
    discounts: 18750,
    refunds: 5980,
    netRevenue: 260020,
    shippingRevenue: 14230,
    taxes: 31200,
  },
};

export const demoShopifyCombined = {
  kpis: demoShopifyKPIs,
  revenue: demoShopifyRevenue,
  products: demoShopifyProducts,
  customers: demoShopifyCustomers,
  orderStatus: demoShopifyOrderStatus,
};

// ─── GA4 Analytics ───────────────────────────────────────────────────────────

export const demoGA4KPIs = {
  sessions: 74800,
  users: 58200,
  newUsers: 38900,
  bounceRate: 38.4,
  avgSessionDuration: 187,
  pageviews: 312000,
  pagesPerSession: 4.17,
  transactions: 1847,
  revenue: 284750,
  conversionRate: 2.47,
  addToCarts: 8920,
  checkouts: 4760,
  prevSessions: 62300,
  prevUsers: 48700,
  prevRevenue: 241300,
  prevTransactions: 1623,
};

export const demoGA4Sessions = revenueSeries.map((d) => ({
  date: d.date,
  sessions: Math.round(d.orders * 40 + randomBetween(100, 400)),
  users: Math.round(d.orders * 31 + randomBetween(80, 300)),
}));

export const demoGA4Channels = [
  { channel: 'Organic Search', sessions: 24800, users: 19200, bounceRate: 32.1, conversions: 612 },
  { channel: 'Direct', sessions: 18400, users: 14700, bounceRate: 28.4, conversions: 487 },
  { channel: 'Paid Social', sessions: 14200, users: 12100, bounceRate: 44.7, conversions: 341 },
  { channel: 'Email', sessions: 8900, users: 7400, bounceRate: 24.8, conversions: 289 },
  { channel: 'Referral', sessions: 4700, users: 3900, bounceRate: 51.2, conversions: 78 },
  { channel: 'Organic Social', sessions: 3800, users: 3200, bounceRate: 55.3, conversions: 28 },
  { channel: 'Paid Search', sessions: 2600, users: 2100, bounceRate: 36.9, conversions: 98 },
  { channel: 'Unassigned', sessions: 1400, users: 1100, bounceRate: 62.4, conversions: 14 },
];

export const demoGA4Devices = [
  { device: 'Mobile', sessions: 48200, percentage: 64.4, bounceRate: 41.2, conversionRate: 1.87 },
  { device: 'Desktop', sessions: 23100, percentage: 30.9, bounceRate: 32.1, conversionRate: 3.84 },
  { device: 'Tablet', sessions: 3500, percentage: 4.7, bounceRate: 38.7, conversionRate: 2.41 },
];

export const demoGA4Pages = [
  { page: '/products/premium-wireless-earbuds', pageviews: 28400, uniquePageviews: 22100, avgTime: 124, bounceRate: 31.2 },
  { page: '/', pageviews: 24700, uniquePageviews: 19800, avgTime: 87, bounceRate: 42.3 },
  { page: '/collections/headphones', pageviews: 18900, uniquePageviews: 15200, avgTime: 96, bounceRate: 38.7 },
  { page: '/products/noise-cancelling-headphones', pageviews: 14200, uniquePageviews: 11400, avgTime: 141, bounceRate: 28.9 },
  { page: '/cart', pageviews: 12100, uniquePageviews: 9800, avgTime: 78, bounceRate: 22.1 },
  { page: '/collections/all', pageviews: 9800, uniquePageviews: 7900, avgTime: 112, bounceRate: 45.6 },
  { page: '/blogs/news', pageviews: 7400, uniquePageviews: 6100, avgTime: 203, bounceRate: 61.4 },
  { page: '/pages/about', pageviews: 4200, uniquePageviews: 3700, avgTime: 67, bounceRate: 58.2 },
];

export const demoGA4Countries = [
  { country: 'India', sessions: 54200, users: 41800, revenue: 198400, conversionRate: 2.41 },
  { country: 'United States', sessions: 8400, users: 6700, revenue: 41200, conversionRate: 3.12 },
  { country: 'United Kingdom', sessions: 3700, users: 2900, revenue: 18900, conversionRate: 2.87 },
  { country: 'Canada', sessions: 2400, users: 1900, revenue: 12700, conversionRate: 2.54 },
  { country: 'Australia', sessions: 1900, users: 1500, revenue: 8900, conversionRate: 2.26 },
  { country: 'UAE', sessions: 1600, users: 1200, revenue: 7400, conversionRate: 2.81 },
  { country: 'Singapore', sessions: 1200, users: 950, revenue: 4800, conversionRate: 2.17 },
  { country: 'Germany', sessions: 1400, users: 1100, revenue: 5200, conversionRate: 1.98 },
];

export const demoGA4LandingPages = [
  { page: '/', sessions: 18400, bounceRate: 42.3, conversionRate: 2.14, revenue: 48700 },
  { page: '/products/premium-wireless-earbuds', sessions: 12800, bounceRate: 31.2, conversionRate: 4.21, revenue: 68400 },
  { page: '/collections/headphones', sessions: 9400, bounceRate: 38.7, conversionRate: 2.87, revenue: 31200 },
  { page: '/blogs/news/best-earbuds-2024', sessions: 6200, bounceRate: 61.4, conversionRate: 1.12, revenue: 8400 },
  { page: '/pages/deals', sessions: 4800, bounceRate: 28.9, conversionRate: 5.41, revenue: 37800 },
];

export const demoGA4Events = [
  { event: 'add_to_cart', count: 8920, users: 7240, conversionRate: 11.93 },
  { event: 'begin_checkout', count: 4760, users: 4210, conversionRate: 6.37 },
  { event: 'purchase', count: 1847, users: 1723, conversionRate: 2.47 },
  { event: 'view_item', count: 34100, users: 27800, conversionRate: 45.6 },
  { event: 'search', count: 12400, users: 9800, conversionRate: 16.6 },
  { event: 'sign_up', count: 2840, users: 2780, conversionRate: 3.8 },
];

export const demoGA4ConversionFunnel = [
  { stage: 'Session Start', count: 74800, dropoffRate: 0 },
  { stage: 'Product View', count: 34100, dropoffRate: 54.4 },
  { stage: 'Add to Cart', count: 8920, dropoffRate: 73.8 },
  { stage: 'Begin Checkout', count: 4760, dropoffRate: 46.6 },
  { stage: 'Purchase', count: 1847, dropoffRate: 61.2 },
];

export const demoGA4ProductFunnel = [
  { product: 'Premium Wireless Earbuds', views: 28400, addToCarts: 3420, purchases: 412, conversionRate: 1.45 },
  { product: 'Noise-Cancelling Headphones', views: 14200, addToCarts: 1840, purchases: 198, conversionRate: 1.39 },
  { product: 'Smart Watch Series 5', views: 9800, addToCarts: 920, purchases: 147, conversionRate: 1.50 },
  { product: 'Portable Bluetooth Speaker', views: 7400, addToCarts: 780, purchases: 287, conversionRate: 3.88 },
];

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

export const demoMetaKPIs = {
  spend: 12480.5,
  impressions: 2840000,
  clicks: 84200,
  ctr: 2.97,
  cpc: 0.148,
  cpm: 4.39,
  reach: 1920000,
  purchases: 847,
  purchaseValue: 42380,
  roas: 3.4,
  addToCarts: 3240,
  viewContent: 28400,
  costPerPurchase: 14.74,
};

export const demoMetaCampaigns = [
  {
    id: 'camp_001',
    name: 'Summer Sale — Retargeting',
    status: 'ACTIVE',
    spend: 4200,
    impressions: 980000,
    clicks: 31200,
    ctr: 3.18,
    roas: 4.21,
    purchases: 312,
    purchaseValue: 17680,
  },
  {
    id: 'camp_002',
    name: 'New Customer Acquisition',
    status: 'ACTIVE',
    spend: 3800,
    impressions: 1120000,
    clicks: 28400,
    ctr: 2.54,
    roas: 2.87,
    purchases: 241,
    purchaseValue: 10900,
  },
  {
    id: 'camp_003',
    name: 'Product Launch — Earbuds',
    status: 'ACTIVE',
    spend: 2900,
    impressions: 540000,
    clicks: 18400,
    ctr: 3.41,
    roas: 3.84,
    purchases: 198,
    purchaseValue: 11140,
  },
  {
    id: 'camp_004',
    name: 'Brand Awareness — Video',
    status: 'PAUSED',
    spend: 1580.5,
    impressions: 200000,
    clicks: 6200,
    ctr: 3.1,
    roas: 1.68,
    purchases: 96,
    purchaseValue: 2660,
  },
];

export const demoMetaSpend = revenueSeries.slice(-30).map((d) => ({
  date: d.date,
  spend: parseFloat((d.orders * 6.8 + randomBetween(20, 80, 2)).toFixed(2)),
  impressions: Math.round(d.orders * 1540),
  clicks: Math.round(d.orders * 45),
}));

// ─── Google Ads ───────────────────────────────────────────────────────────────

export const demoGoogleAdsKPIs = {
  spend: 8940.2,
  impressions: 1240000,
  clicks: 48200,
  ctr: 3.89,
  avgCpc: 0.185,
  conversions: 612,
  conversionValue: 31400,
  roas: 3.51,
  costPerConversion: 14.61,
};

export const demoGoogleAdsCampaigns = [
  {
    id: 'gcam_001',
    name: 'Brand Keywords',
    status: 'ENABLED',
    spend: 2840,
    impressions: 320000,
    clicks: 18400,
    ctr: 5.75,
    conversions: 241,
    conversionValue: 12800,
    roas: 4.51,
    costPerConversion: 11.78,
  },
  {
    id: 'gcam_002',
    name: 'Shopping — Electronics',
    status: 'ENABLED',
    spend: 3200,
    impressions: 540000,
    clicks: 19800,
    ctr: 3.67,
    conversions: 247,
    conversionValue: 13400,
    roas: 4.19,
    costPerConversion: 12.96,
  },
  {
    id: 'gcam_003',
    name: 'Competitor Targeting',
    status: 'ENABLED',
    spend: 1900,
    impressions: 280000,
    clicks: 7400,
    ctr: 2.64,
    conversions: 87,
    conversionValue: 4200,
    roas: 2.21,
    costPerConversion: 21.84,
  },
  {
    id: 'gcam_004',
    name: 'Display Remarketing',
    status: 'PAUSED',
    spend: 1000.2,
    impressions: 100000,
    clicks: 2600,
    ctr: 2.6,
    conversions: 37,
    conversionValue: 1000,
    roas: 1.0,
    costPerConversion: 27.03,
  },
];

export const demoGoogleAdsSpend = revenueSeries.slice(-30).map((d) => ({
  date: d.date,
  spend: parseFloat((d.orders * 4.8 + randomBetween(10, 50, 2)).toFixed(2)),
  clicks: Math.round(d.orders * 26),
  conversions: Math.round(d.orders * 0.33),
}));

// ─── TikTok Ads ───────────────────────────────────────────────────────────────

export const demoTikTokKPIs = {
  spend: 5840.3,
  impressions: 3200000,
  clicks: 62400,
  ctr: 1.95,
  cpc: 0.094,
  conversions: 312,
  conversionValue: 18700,
  roas: 3.2,
  videoViews: 1840000,
  reach: 2140000,
};

export const demoTikTokCampaigns = [
  {
    campaign_id: 'ttcam_001',
    campaign_name: 'Viral Product Demo',
    status: 'ACTIVE',
    spend: 2400,
    impressions: 1400000,
    clicks: 28400,
    video_views: 940000,
    conversions: 148,
    conversion_value: 8900,
    roas: 3.71,
  },
  {
    campaign_id: 'ttcam_002',
    campaign_name: 'Influencer UGC — Earbuds',
    status: 'ACTIVE',
    spend: 1980,
    impressions: 1100000,
    clicks: 22400,
    video_views: 680000,
    conversions: 112,
    conversion_value: 6700,
    roas: 3.38,
  },
  {
    campaign_id: 'ttcam_003',
    campaign_name: 'Back to School',
    status: 'PAUSED',
    spend: 1460.3,
    impressions: 700000,
    clicks: 11600,
    video_views: 220000,
    conversions: 52,
    conversion_value: 3100,
    roas: 2.12,
  },
];

// ─── Klaviyo ──────────────────────────────────────────────────────────────────

export const demoKlaviyoKPIs = {
  totalRevenue: 48200,
  openRate: 38.4,
  clickRate: 4.87,
  bounceRate: 0.94,
  unsubscribeRate: 0.31,
  campaignsSent: 12,
  activeFlows: 8,
  totalProfiles: 18400,
  newProfiles30d: 2840,
};

export const demoKlaviyoCampaigns = [
  {
    id: 'kcamp_001',
    name: 'July Sale — Earbuds Promo',
    sent_at: daysAgo(4),
    status: 'sent',
    recipients: 14200,
    open_rate: 42.1,
    click_rate: 6.84,
    revenue: 12400,
    unsubscribes: 41,
  },
  {
    id: 'kcamp_002',
    name: 'New Arrivals — Watch Series 5',
    sent_at: daysAgo(11),
    status: 'sent',
    recipients: 14800,
    open_rate: 36.8,
    click_rate: 4.21,
    revenue: 8900,
    unsubscribes: 38,
  },
  {
    id: 'kcamp_003',
    name: 'Win-Back: 60 Day Lapsed',
    sent_at: daysAgo(18),
    status: 'sent',
    recipients: 4200,
    open_rate: 22.4,
    click_rate: 2.87,
    revenue: 4100,
    unsubscribes: 22,
  },
  {
    id: 'kcamp_004',
    name: 'Weekend Flash Sale 30% Off',
    sent_at: daysAgo(26),
    status: 'sent',
    recipients: 15800,
    open_rate: 48.2,
    click_rate: 8.94,
    revenue: 18400,
    unsubscribes: 47,
  },
];

export const demoKlaviyoFlows = [
  {
    id: 'kflow_001',
    name: 'Welcome Series (3-email)',
    status: 'live',
    trigger: 'List Added',
    emails_sent: 8420,
    open_rate: 54.2,
    click_rate: 12.4,
    revenue: 14200,
  },
  {
    id: 'kflow_002',
    name: 'Abandoned Cart Recovery',
    status: 'live',
    trigger: 'Cart Abandonment',
    emails_sent: 12800,
    open_rate: 44.7,
    click_rate: 8.91,
    revenue: 22400,
  },
  {
    id: 'kflow_003',
    name: 'Post-Purchase Follow-up',
    status: 'live',
    trigger: 'Order Placed',
    emails_sent: 6200,
    open_rate: 61.3,
    click_rate: 14.2,
    revenue: 7800,
  },
  {
    id: 'kflow_004',
    name: 'Browse Abandonment',
    status: 'live',
    trigger: 'Product Viewed',
    emails_sent: 9400,
    open_rate: 31.8,
    click_rate: 4.87,
    revenue: 6400,
  },
  {
    id: 'kflow_005',
    name: 'VIP Customer Rewards',
    status: 'live',
    trigger: 'Customer LTV Milestone',
    emails_sent: 1840,
    open_rate: 72.4,
    click_rate: 24.8,
    revenue: 9800,
  },
];

// ─── Forecast ─────────────────────────────────────────────────────────────────

function generateForecast(horizon = 30) {
  const historical = revenueSeries.map((d) => ({
    date: d.date,
    revenue: d.revenue,
    orders: d.orders,
    aov: parseFloat((d.revenue / (d.orders || 1)).toFixed(2)),
  }));

  const avgRevenue = historical.reduce((s, d) => s + d.revenue, 0) / historical.length;
  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1;
    const trendedRevenue = Math.round(avgRevenue * 1.08 * weekendBoost);
    forecast.push({
      date: d.toISOString().split('T')[0],
      revenue: trendedRevenue,
      revenueHigh: Math.round(trendedRevenue * 1.18),
      revenueLow: Math.round(trendedRevenue * 0.82),
      orders: Math.round(trendedRevenue / 154),
    });
  }

  const forecastTotal = forecast.reduce((s, d) => s + d.revenue, 0);
  const historicalAvg = avgRevenue;
  const forecastAvg = forecastTotal / horizon;

  return {
    historical,
    forecast,
    summary: {
      forecastTotal,
      forecastAvg: Math.round(forecastAvg),
      historicalAvg: Math.round(historicalAvg),
      growthPct: parseFloat((((forecastAvg - historicalAvg) / historicalAvg) * 100).toFixed(1)),
      horizon,
      trendSlope: 35,
    },
  };
}

export function getDemoForecast(horizon = 30) {
  return generateForecast(horizon);
}

// ─── Social Comments ──────────────────────────────────────────────────────────

export const demoSocialComments = [
  {
    id: 'sc_01',
    platform: 'facebook',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Just received mine and the sound quality is absolutely incredible! Best purchase of the year.',
    author: 'Aarav Sharma',
    sentiment: 'positive',
    sentimentScore: 0.94,
    date: daysAgo(1),
  },
  {
    id: 'sc_02',
    platform: 'instagram',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'Love the design! How long does the battery last?',
    author: 'priya_loves_tech',
    sentiment: 'positive',
    sentimentScore: 0.72,
    date: daysAgo(1),
  },
  {
    id: 'sc_03',
    platform: 'facebook',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: 'My order has been stuck in processing for 5 days. No response from support.',
    author: 'Rahul Gupta',
    sentiment: 'negative',
    sentimentScore: 0.12,
    date: daysAgo(2),
  },
  {
    id: 'sc_04',
    platform: 'instagram',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'These look amazing! Are they compatible with Android?',
    author: 'tech_sahil_99',
    sentiment: 'neutral',
    sentimentScore: 0.55,
    date: daysAgo(2),
  },
  {
    id: 'sc_05',
    platform: 'facebook',
    postPreview: 'Customer Story: Meet Priya 💙',
    comment: "I've been using these earbuds for 3 months and they're still perfect. Highly recommend!",
    author: 'Sunita Reddy',
    sentiment: 'positive',
    sentimentScore: 0.97,
    date: daysAgo(3),
  },
  {
    id: 'sc_06',
    platform: 'instagram',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: 'Bought the headphones but the packaging was damaged. Product is fine though.',
    author: 'deepak_k_m',
    sentiment: 'negative',
    sentimentScore: 0.28,
    date: daysAgo(3),
  },
  {
    id: 'sc_07',
    platform: 'facebook',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'Fast delivery and great product quality!',
    author: 'Meena Pillai',
    sentiment: 'positive',
    sentimentScore: 0.91,
    date: daysAgo(4),
  },
  {
    id: 'sc_08',
    platform: 'instagram',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Okay quality for the price. Nothing exceptional.',
    author: 'rohan.m.dev',
    sentiment: 'neutral',
    sentimentScore: 0.48,
    date: daysAgo(4),
  },
  {
    id: 'sc_09',
    platform: 'facebook',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: "Outstanding ANC! Can't hear anything in my noisy office now 😄",
    author: 'Vikram Nair',
    sentiment: 'positive',
    sentimentScore: 0.93,
    date: daysAgo(5),
  },
  {
    id: 'sc_10',
    platform: 'instagram',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'Return process was smooth. Team was helpful.',
    author: 'ananya.styles',
    sentiment: 'positive',
    sentimentScore: 0.78,
    date: daysAgo(5),
  },
  {
    id: 'sc_11',
    platform: 'facebook',
    postPreview: 'Customer Story: Meet Priya 💙',
    comment: 'Earbuds disconnected after 2 weeks. Still waiting for replacement.',
    author: 'Kiran Bose',
    sentiment: 'negative',
    sentimentScore: 0.14,
    date: daysAgo(6),
  },
  {
    id: 'sc_12',
    platform: 'instagram',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Gifted these to my dad and he absolutely loves them!',
    author: 'pooja_m_11',
    sentiment: 'positive',
    sentimentScore: 0.96,
    date: daysAgo(6),
  },
  {
    id: 'sc_13',
    platform: 'facebook',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: 'When will the rose gold version be back in stock?',
    author: 'Divya Menon',
    sentiment: 'neutral',
    sentimentScore: 0.52,
    date: daysAgo(7),
  },
  {
    id: 'sc_14',
    platform: 'instagram',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'The noise cancellation on these is genuinely on par with much more expensive options.',
    author: 'sound_geek_amol',
    sentiment: 'positive',
    sentimentScore: 0.88,
    date: daysAgo(7),
  },
  {
    id: 'sc_15',
    platform: 'facebook',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Price seems a bit high compared to competitors offering similar specs.',
    author: 'Mohan Tripathi',
    sentiment: 'negative',
    sentimentScore: 0.32,
    date: daysAgo(8),
  },
];

export const demoSocialStats = {
  total: 15,
  positive: 9,
  neutral: 3,
  negative: 3,
  facebook: 9,
  instagram: 6,
};

// ─── Chat (Demo AI responses) ─────────────────────────────────────────────────

export const demoChatResponses: Record<string, string> = {
  default: `Revenue is ₹2,84,750 for the last 30 days (+18.0% vs. prior period).
• Orders: 1,847 | AOV: ₹154.20
• Conversion rate: 3.8% — above industry average of 2.5%
• Top product: Premium Wireless Earbuds (₹54,200 revenue)
• Repeat customer rate: 34.2% — healthy retention signal
• Cart abandonment: 67.4% — 5 ppts above benchmark; consider exit-intent popup`,

  revenue: `Total revenue is ₹2,84,750 in the last 30 days, up 18.0% vs. prior period.
• New customer revenue: ₹1,87,367 (65.8% of total)
• Returning customer revenue: ₹97,383 (34.2%)
• Best revenue day: Saturday (1.3× weekday average)
• Daily average: ₹9,492 trending up ~₹35/day`,

  ads: `Combined ad spend: $21,420.70 across Meta + Google Ads.
• Meta ROAS: 3.4× | Google ROAS: 3.51×
• Meta CPC: $0.148 | Google CPC: $0.185
• Best campaign: "Summer Sale — Retargeting" at 4.21× ROAS
• TikTok ROAS: 3.2× on $5,840 spend — strong video engagement`,
};

export function getDemoChatResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('revenue') || q.includes('sale') || q.includes('order')) return demoChatResponses.revenue;
  if (q.includes('ads') || q.includes('roas') || q.includes('spend') || q.includes('meta') || q.includes('google')) return demoChatResponses.ads;
  return demoChatResponses.default;
}
