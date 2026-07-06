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
  { id: 'prod_01', title: 'Premium Wireless Earbuds', totalRevenue: 54200, totalOrders: 412, totalUnitsSold: 487, averagePrice: 131.55 },
  { id: 'prod_02', title: 'Noise-Cancelling Headphones', totalRevenue: 38900, totalOrders: 198, totalUnitsSold: 213, averagePrice: 196.46 },
  { id: 'prod_03', title: 'Smart Watch Series 5', totalRevenue: 31700, totalOrders: 147, totalUnitsSold: 152, averagePrice: 215.65 },
  { id: 'prod_04', title: 'Portable Bluetooth Speaker', totalRevenue: 24100, totalOrders: 287, totalUnitsSold: 301, averagePrice: 83.99 },
  { id: 'prod_05', title: 'USB-C Fast Charger (3-Pack)', totalRevenue: 19800, totalOrders: 521, totalUnitsSold: 1563, averagePrice: 38.0 },
  { id: 'prod_06', title: 'Laptop Stand Pro', totalRevenue: 17400, totalOrders: 193, totalUnitsSold: 207, averagePrice: 90.16 },
  { id: 'prod_07', title: 'Mechanical Keyboard TKL', totalRevenue: 14200, totalOrders: 89, totalUnitsSold: 92, averagePrice: 159.55 },
  { id: 'prod_08', title: 'RGB Gaming Mouse', totalRevenue: 11600, totalOrders: 154, totalUnitsSold: 163, averagePrice: 75.32 },
  { id: 'prod_09', title: 'Webcam 4K Ultra', totalRevenue: 9800, totalOrders: 112, totalUnitsSold: 118, averagePrice: 87.5 },
  { id: 'prod_10', title: 'Monitor Light Bar', totalRevenue: 8100, totalOrders: 243, totalUnitsSold: 261, averagePrice: 33.33 },
];

export const demoShopifyCustomers = {
  newVsReturning: [
    { name: 'New Customers', value: 2141 },
    { name: 'Returning Customers', value: 1100 },
  ],
  revenueBySegment: [
    { name: 'New Customers', value: 187367 },
    { name: 'Returning Customers', value: 97383 },
  ],
  topCustomers: [
    { id: 'cust_01', firstName: 'Priya', lastName: 'Sharma', email: 'p.sharma@email.com', ordersCount: 12, totalSpent: 4820 },
    { id: 'cust_02', firstName: 'Arjun', lastName: 'Mehta', email: 'arjun.m@email.com', ordersCount: 9, totalSpent: 3640 },
    { id: 'cust_03', firstName: 'Sunita', lastName: 'Reddy', email: 's.reddy@email.com', ordersCount: 8, totalSpent: 2980 },
    { id: 'cust_04', firstName: 'Vikram', lastName: 'Nair', email: 'vnair@email.com', ordersCount: 7, totalSpent: 2410 },
    { id: 'cust_05', firstName: 'Divya', lastName: 'Menon', email: 'divya.m@email.com', ordersCount: 6, totalSpent: 1970 },
  ],
};

export const demoShopifyOrderStatus = [
  { status: 'fulfilled', count: 1524, percentage: 82.5 },
  { status: 'unfulfilled', count: 187, percentage: 10.1 },
  { status: 'partially_fulfilled', count: 94, percentage: 5.1 },
  { status: 'refunded', count: 42, percentage: 2.3 },
];

export const demoShopifyOrders = Array.from({ length: 50 }, (_, i) => ({
  id: `gid://shopify/Order/${10000 + i}`,
  name: `#${10000 + i}`,
  email: ['priya@demo.com', 'arjun@demo.com', 'sunita@demo.com', 'vikram@demo.com', 'divya@demo.com'][i % 5],
  totalPrice: randomBetween(49, 490, 2),
  financialStatus: ['paid', 'paid', 'paid', 'refunded', 'pending'][Math.floor(Math.random() * 5)],
  fulfillmentStatus: ['fulfilled', 'fulfilled', 'unfulfilled', 'partial'][Math.floor(Math.random() * 4)],
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
}));

export const demoShopifyConversionFunnel = [
  { stage: 'Sessions', count: 74800, dropoffRate: 0 },
  { stage: 'Product Views', count: 34100, dropoffRate: 54.4 },
  { stage: 'Add to Cart', count: 8920, dropoffRate: 73.8 },
  { stage: 'Checkout Started', count: 4760, dropoffRate: 46.6 },
  { stage: 'Checkout Completed', count: 1847, dropoffRate: 61.2 },
];

const hourLabels = ['12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'];

export const demoShopifyAdvanced = {
  locationBreakdown: {
    byCountry: [
      { country: 'India', countryCode: 'IN', orders: 1524, revenue: 234200 },
      { country: 'United States', countryCode: 'US', orders: 183, revenue: 29800 },
      { country: 'United Kingdom', countryCode: 'GB', orders: 87, revenue: 13400 },
      { country: 'Canada', countryCode: 'CA', orders: 53, revenue: 7350 },
    ],
    byCity: [
      { city: 'Mumbai', province: 'Maharashtra', country: 'India', orders: 341, revenue: 54200 },
      { city: 'Delhi', province: 'Delhi', country: 'India', orders: 298, revenue: 48700 },
      { city: 'Bangalore', province: 'Karnataka', country: 'India', orders: 251, revenue: 39800 },
      { city: 'Hyderabad', province: 'Telangana', country: 'India', orders: 187, revenue: 29100 },
      { city: 'Chennai', province: 'Tamil Nadu', country: 'India', orders: 163, revenue: 24300 },
      { city: 'Pune', province: 'Maharashtra', country: 'India', orders: 143, revenue: 19800 },
    ],
  },
  salesChannels: [
    { channel: 'Online Store', revenue: 219000, orders: 1412 },
    { channel: 'Instagram Shopping', revenue: 38200, orders: 247 },
    { channel: 'Google Shopping', revenue: 18900, orders: 132 },
    { channel: 'Point of Sale', revenue: 8650, orders: 56 },
  ],
  discountAnalysis: {
    topCodes: [
      { code: 'SAVE15', uses: 214, totalDiscount: 8940, avgDiscount: 41.8 },
      { code: 'WELCOME10', uses: 127, totalDiscount: 5210, avgDiscount: 41.0 },
      { code: 'FLASH20', uses: 71, totalDiscount: 4600, avgDiscount: 64.8 },
    ],
    discountedOrdersRate: 22.3,
    totalDiscountGiven: 18750,
    avgDiscount: 45.5,
  },
  timeAnalysis: {
    byHour: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: hourLabels[h],
      orders: Math.round(8 + (h >= 18 && h <= 22 ? 38 : h >= 10 && h <= 14 ? 22 : 3) * (0.7 + Math.random() * 0.6)),
      revenue: Math.round(1200 + (h >= 18 && h <= 22 ? 5800 : h >= 10 && h <= 14 ? 3400 : 400) * (0.7 + Math.random() * 0.6)),
    })),
    byDayOfWeek: [
      { day: 'Sunday', dayNum: 0, orders: 312, revenue: 48100 },
      { day: 'Monday', dayNum: 1, orders: 241, revenue: 37200 },
      { day: 'Tuesday', dayNum: 2, orders: 228, revenue: 35200 },
      { day: 'Wednesday', dayNum: 3, orders: 247, revenue: 38100 },
      { day: 'Thursday', dayNum: 4, orders: 263, revenue: 40600 },
      { day: 'Friday', dayNum: 5, orders: 289, revenue: 44600 },
      { day: 'Saturday', dayNum: 6, orders: 267, revenue: 40950 },
    ],
  },
  clvMetrics: {
    avgLTV: 387,
    avgOrdersPerCustomer: 2.51,
    buyOnce: 1847,
    buyTwice: 892,
    buyThreePlus: 502,
    totalCustomers: 3241,
  },
  aovByDate: revenueSeries.slice(-30).map((d) => ({
    date: d.date,
    orders: d.orders,
    revenue: d.revenue,
    aov: parseFloat((d.revenue / (d.orders || 1)).toFixed(2)),
  })),
  financialFunnel: [
    { name: 'Gross Revenue', value: 284750 },
    { name: 'Discounts', value: -18750 },
    { name: 'Refunds', value: -5980 },
    { name: 'Net Revenue', value: 260020 },
    { name: 'Shipping', value: 14230 },
    { name: 'Taxes', value: -31200 },
  ],
};

export const demoShopifyCombined = {
  kpis: demoShopifyKPIs,
  revenue: demoShopifyRevenue,
  products: demoShopifyProducts,
  customers: demoShopifyCustomers, // now matches CustomerData interface
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
  { page: '/products/premium-wireless-earbuds', pageviews: 28400, uniquePageviews: 22100, avgTimeOnPage: 124, bounceRate: 31.2 },
  { page: '/', pageviews: 24700, uniquePageviews: 19800, avgTimeOnPage: 87, bounceRate: 42.3 },
  { page: '/collections/headphones', pageviews: 18900, uniquePageviews: 15200, avgTimeOnPage: 96, bounceRate: 38.7 },
  { page: '/products/noise-cancelling-headphones', pageviews: 14200, uniquePageviews: 11400, avgTimeOnPage: 141, bounceRate: 28.9 },
  { page: '/cart', pageviews: 12100, uniquePageviews: 9800, avgTimeOnPage: 78, bounceRate: 22.1 },
  { page: '/collections/all', pageviews: 9800, uniquePageviews: 7900, avgTimeOnPage: 112, bounceRate: 45.6 },
  { page: '/blogs/news', pageviews: 7400, uniquePageviews: 6100, avgTimeOnPage: 203, bounceRate: 61.4 },
  { page: '/pages/about', pageviews: 4200, uniquePageviews: 3700, avgTimeOnPage: 67, bounceRate: 58.2 },
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
  { page: '/', sessions: 18400, bounceRate: 42.3, conversions: 394, revenue: 48700 },
  { page: '/products/premium-wireless-earbuds', sessions: 12800, bounceRate: 31.2, conversions: 539, revenue: 68400 },
  { page: '/collections/headphones', sessions: 9400, bounceRate: 38.7, conversions: 270, revenue: 31200 },
  { page: '/blogs/news/best-earbuds-2024', sessions: 6200, bounceRate: 61.4, conversions: 69, revenue: 8400 },
  { page: '/pages/deals', sessions: 4800, bounceRate: 28.9, conversions: 260, revenue: 37800 },
];

export const demoGA4Events = [
  { eventName: 'add_to_cart', eventCount: 8920, users: 7240, conversionRate: 11.93 },
  { eventName: 'begin_checkout', eventCount: 4760, users: 4210, conversionRate: 6.37 },
  { eventName: 'purchase', eventCount: 1847, users: 1723, conversionRate: 2.47 },
  { eventName: 'view_item', eventCount: 34100, users: 27800, conversionRate: 45.6 },
  { eventName: 'search', eventCount: 12400, users: 9800, conversionRate: 16.6 },
  { eventName: 'sign_up', eventCount: 2840, users: 2780, conversionRate: 3.8 },
];

export const demoGA4ConversionFunnel = [
  { stage: 'Session Start', count: 74800, dropoffRate: 0 },
  { stage: 'Product View', count: 34100, dropoffRate: 54.4 },
  { stage: 'Add to Cart', count: 8920, dropoffRate: 73.8 },
  { stage: 'Begin Checkout', count: 4760, dropoffRate: 46.6 },
  { stage: 'Purchase', count: 1847, dropoffRate: 61.2 },
];

export const demoGA4ProductFunnel = [
  { stage: 'Product Views', count: 34100, dropoffRate: 0 },
  { stage: 'Add to Cart', count: 8920, dropoffRate: 73.8 },
  { stage: 'Begin Checkout', count: 4760, dropoffRate: 46.6 },
  { stage: 'Purchase', count: 1847, dropoffRate: 61.2 },
];

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

export const demoMetaKPIs = {
  spend: 12480.5,
  impressions: 2840000,
  reach: 1920000,
  frequency: 1.48,
  clicks: 84200,
  linkClicks: 71400,
  ctr: 2.97,
  uniqueCtr: 3.41,
  cpc: 0.148,
  cpm: 4.39,
  costPerLinkClick: 0.175,
  purchases: 847,
  purchaseValue: 42380,
  roas: 3.4,
  addToCarts: 3240,
  initiatedCheckouts: 1690,
  viewContent: 28400,
  leads: 0,
  costPerPurchase: 14.74,
  costPerAddToCart: 3.85,
  costPerInitiatedCheckout: 7.38,
  conversionRate: 1.19,
  videoPlays: 184000,
  videoCompletions: 38400,
};

export const demoMetaCampaigns = [
  {
    id: 'camp_001',
    name: 'Summer Sale — Retargeting',
    status: 'ACTIVE',
    spend: 4200,
    impressions: 980000,
    reach: 620000,
    frequency: 1.58,
    clicks: 31200,
    linkClicks: 26400,
    ctr: 3.18,
    cpc: 0.135,
    cpm: 4.29,
    roas: 4.21,
    purchases: 312,
    purchaseValue: 17680,
    addToCarts: 1240,
    initiatedCheckouts: 642,
  },
  {
    id: 'camp_002',
    name: 'New Customer Acquisition',
    status: 'ACTIVE',
    spend: 3800,
    impressions: 1120000,
    reach: 780000,
    frequency: 1.44,
    clicks: 28400,
    linkClicks: 23800,
    ctr: 2.54,
    cpc: 0.134,
    cpm: 3.39,
    roas: 2.87,
    purchases: 241,
    purchaseValue: 10900,
    addToCarts: 980,
    initiatedCheckouts: 478,
  },
  {
    id: 'camp_003',
    name: 'Product Launch — Earbuds',
    status: 'ACTIVE',
    spend: 2900,
    impressions: 540000,
    reach: 360000,
    frequency: 1.5,
    clicks: 18400,
    linkClicks: 15600,
    ctr: 3.41,
    cpc: 0.158,
    cpm: 5.37,
    roas: 3.84,
    purchases: 198,
    purchaseValue: 11140,
    addToCarts: 720,
    initiatedCheckouts: 380,
  },
  {
    id: 'camp_004',
    name: 'Brand Awareness — Video',
    status: 'PAUSED',
    spend: 1580.5,
    impressions: 200000,
    reach: 160000,
    frequency: 1.25,
    clicks: 6200,
    linkClicks: 5600,
    ctr: 3.1,
    cpc: 0.255,
    cpm: 7.9,
    roas: 1.68,
    purchases: 96,
    purchaseValue: 2660,
    addToCarts: 300,
    initiatedCheckouts: 190,
  },
];

export const demoMetaSpend = revenueSeries.slice(-30).map((d) => ({
  date: d.date,
  spend: parseFloat((d.orders * 6.8 + randomBetween(20, 80, 2)).toFixed(2)),
  impressions: Math.round(d.orders * 1540),
  clicks: Math.round(d.orders * 45),
  purchases: Math.round(d.orders * 0.42),
  purchaseValue: parseFloat((d.orders * 18.3).toFixed(2)),
}));

export const demoMetaFunnel = {
  impressions: 2840000,
  reach: 1920000,
  linkClicks: 71400,
  addToCarts: 3240,
  initiatedCheckouts: 1690,
  purchases: 847,
};

export const demoMetaAdSets = [
  { id: 'as_1', name: 'IG Reels — Lookalike 1%', campaignName: 'Summer Sale — Retargeting', spend: 2100, impressions: 480000, reach: 320000, clicks: 16200, ctr: 3.38, cpc: 0.13, purchases: 168, purchaseValue: 9420, roas: 4.49 },
  { id: 'as_2', name: 'FB Feed — Interest: Audio', campaignName: 'New Customer Acquisition', spend: 1900, impressions: 540000, reach: 410000, clicks: 13800, ctr: 2.56, cpc: 0.138, purchases: 120, purchaseValue: 5430, roas: 2.86 },
  { id: 'as_3', name: 'Stories — Retarget ATC', campaignName: 'Summer Sale — Retargeting', spend: 1450, impressions: 320000, reach: 210000, clicks: 11400, ctr: 3.56, cpc: 0.127, purchases: 132, purchaseValue: 7240, roas: 4.99 },
  { id: 'as_4', name: 'Earbuds Launch — Broad', campaignName: 'Product Launch — Earbuds', spend: 1800, impressions: 360000, reach: 240000, clicks: 12400, ctr: 3.44, cpc: 0.145, purchases: 134, purchaseValue: 7480, roas: 4.16 },
];

export const demoMetaAds = [
  { id: 'ad_1', name: 'UGC — Review by Aanya', campaignName: 'Summer Sale — Retargeting', adsetName: 'IG Reels — Lookalike 1%', spend: 1240, impressions: 280000, reach: 190000, clicks: 9800, ctr: 3.5, cpc: 0.126, purchases: 110, purchaseValue: 6240, roas: 5.03 },
  { id: 'ad_2', name: 'Carousel — Top 5 picks', campaignName: 'New Customer Acquisition', adsetName: 'FB Feed — Interest: Audio', spend: 980, impressions: 240000, reach: 180000, clicks: 7200, ctr: 3.0, cpc: 0.136, purchases: 70, purchaseValue: 3180, roas: 3.24 },
  { id: 'ad_3', name: 'Stories — 30% off banner', campaignName: 'Summer Sale — Retargeting', adsetName: 'Stories — Retarget ATC', spend: 820, impressions: 180000, reach: 120000, clicks: 7100, ctr: 3.94, cpc: 0.115, purchases: 86, purchaseValue: 4720, roas: 5.76 },
  { id: 'ad_4', name: 'Reel — Unboxing 15s', campaignName: 'Product Launch — Earbuds', adsetName: 'Earbuds Launch — Broad', spend: 760, impressions: 160000, reach: 110000, clicks: 6200, ctr: 3.88, cpc: 0.123, purchases: 64, purchaseValue: 3520, roas: 4.63 },
];

export const demoMetaDemographics = [
  { key: '25-34|female', label: '25-34 · female', spend: 3640, impressions: 820000, clicks: 26800, ctr: 3.27, cpc: 0.136, purchases: 312, purchaseValue: 17400, roas: 4.78 },
  { key: '25-34|male', label: '25-34 · male', spend: 2980, impressions: 740000, clicks: 21200, ctr: 2.86, cpc: 0.141, purchases: 198, purchaseValue: 9840, roas: 3.30 },
  { key: '18-24|female', label: '18-24 · female', spend: 1840, impressions: 460000, clicks: 14600, ctr: 3.17, cpc: 0.126, purchases: 124, purchaseValue: 6120, roas: 3.33 },
  { key: '35-44|female', label: '35-44 · female', spend: 1620, impressions: 380000, clicks: 9800, ctr: 2.58, cpc: 0.165, purchases: 98, purchaseValue: 5240, roas: 3.23 },
  { key: '18-24|male', label: '18-24 · male', spend: 1280, impressions: 340000, clicks: 8400, ctr: 2.47, cpc: 0.152, purchases: 72, purchaseValue: 2780, roas: 2.17 },
  { key: '35-44|male', label: '35-44 · male', spend: 1120, impressions: 100000, clicks: 3400, ctr: 3.4, cpc: 0.329, purchases: 43, purchaseValue: 1000, roas: 0.89 },
];

export const demoMetaPlacements = [
  { key: 'instagram|stream', label: 'instagram · feed', spend: 3800, impressions: 820000, clicks: 28400, ctr: 3.46, cpc: 0.134, purchases: 312, purchaseValue: 16240, roas: 4.27 },
  { key: 'facebook|feed', label: 'facebook · feed', spend: 2940, impressions: 760000, clicks: 22400, ctr: 2.95, cpc: 0.131, purchases: 198, purchaseValue: 8980, roas: 3.05 },
  { key: 'instagram|story', label: 'instagram · stories', spend: 2300, impressions: 540000, clicks: 16400, ctr: 3.04, cpc: 0.140, purchases: 178, purchaseValue: 9320, roas: 4.05 },
  { key: 'instagram|reels', label: 'instagram · reels', spend: 1980, impressions: 480000, clicks: 12200, ctr: 2.54, cpc: 0.162, purchases: 112, purchaseValue: 5840, roas: 2.95 },
  { key: 'audience_network|stream', label: 'audience network · feed', spend: 720, impressions: 180000, clicks: 3400, ctr: 1.89, cpc: 0.212, purchases: 28, purchaseValue: 1200, roas: 1.67 },
  { key: 'messenger|story', label: 'messenger · stories', spend: 480, impressions: 60000, clicks: 1400, ctr: 2.33, cpc: 0.343, purchases: 19, purchaseValue: 800, roas: 1.67 },
];

export const demoMetaDevices = [
  { key: 'iphone', label: 'iphone', spend: 5800, impressions: 1240000, clicks: 41200, ctr: 3.32, cpc: 0.141, purchases: 462, purchaseValue: 22400, roas: 3.86 },
  { key: 'android_smartphone', label: 'android smartphone', spend: 4200, impressions: 1080000, clicks: 31400, ctr: 2.91, cpc: 0.134, purchases: 298, purchaseValue: 14200, roas: 3.38 },
  { key: 'ipad', label: 'ipad', spend: 1340, impressions: 280000, clicks: 7200, ctr: 2.57, cpc: 0.186, purchases: 62, purchaseValue: 3520, roas: 2.63 },
  { key: 'desktop', label: 'desktop', spend: 1140, impressions: 240000, clicks: 4400, ctr: 1.83, cpc: 0.259, purchases: 25, purchaseValue: 2260, roas: 1.98 },
];

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
    id: 'ttcam_001',
    name: 'Viral Product Demo',
    status: 'ACTIVE',
    spend: 2400,
    impressions: 1400000,
    clicks: 28400,
    videoViews: 940000,
    conversions: 148,
    roas: 3.71,
  },
  {
    id: 'ttcam_002',
    name: 'Influencer UGC — Earbuds',
    status: 'ACTIVE',
    spend: 1980,
    impressions: 1100000,
    clicks: 22400,
    videoViews: 680000,
    conversions: 112,
    roas: 3.38,
  },
  {
    id: 'ttcam_003',
    name: 'Back to School',
    status: 'PAUSED',
    spend: 1460.3,
    impressions: 700000,
    clicks: 11600,
    videoViews: 220000,
    conversions: 52,
    roas: 2.12,
  },
];

// ─── Klaviyo ──────────────────────────────────────────────────────────────────

export const demoKlaviyoKPIs = {
  totalRevenue: 48200,
  openRate: 0.384,       // page does: kpis.openRate * 100
  clickRate: 0.0487,     // page does: kpis.clickRate * 100
  bounceRate: 0.0094,
  unsubscribeRate: 0.0031, // page does: kpis.unsubscribeRate * 100
  campaignsSent: 12,
  activeFlows: 8,
  totalProfiles: 18400,
  newProfiles30d: 2840,
};

export const demoKlaviyoCampaigns = [
  {
    id: 'kcamp_001',
    name: 'July Sale — Earbuds Promo',
    sentAt: daysAgo(4),
    status: 'Sent',
    recipients: 14200,
    openRate: 0.421,      // page does: c.openRate * 100
    clickRate: 0.0684,
    revenue: 12400,
    unsubscribeRate: 0.0029,
  },
  {
    id: 'kcamp_002',
    name: 'New Arrivals — Watch Series 5',
    sentAt: daysAgo(11),
    status: 'Sent',
    recipients: 14800,
    openRate: 0.368,
    clickRate: 0.0421,
    revenue: 8900,
    unsubscribeRate: 0.0026,
  },
  {
    id: 'kcamp_003',
    name: 'Win-Back: 60 Day Lapsed',
    sentAt: daysAgo(18),
    status: 'Sent',
    recipients: 4200,
    openRate: 0.224,
    clickRate: 0.0287,
    revenue: 4100,
    unsubscribeRate: 0.0052,
  },
  {
    id: 'kcamp_004',
    name: 'Weekend Flash Sale 30% Off',
    sentAt: daysAgo(26),
    status: 'Sent',
    recipients: 15800,
    openRate: 0.482,
    clickRate: 0.0894,
    revenue: 18400,
    unsubscribeRate: 0.003,
  },
];

export const demoKlaviyoFlows = [
  {
    id: 'kflow_001',
    name: 'Welcome Series (3-email)',
    status: 'Live',
    triggerType: 'List Added',
    emails30d: 8420,
    revenue30d: 14200,
  },
  {
    id: 'kflow_002',
    name: 'Abandoned Cart Recovery',
    status: 'Live',
    triggerType: 'Cart Abandonment',
    emails30d: 12800,
    revenue30d: 22400,
  },
  {
    id: 'kflow_003',
    name: 'Post-Purchase Follow-up',
    status: 'Live',
    triggerType: 'Order Placed',
    emails30d: 6200,
    revenue30d: 7800,
  },
  {
    id: 'kflow_004',
    name: 'Browse Abandonment',
    status: 'Live',
    triggerType: 'Product Viewed',
    emails30d: 9400,
    revenue30d: 6400,
  },
  {
    id: 'kflow_005',
    name: 'VIP Customer Rewards',
    status: 'Live',
    triggerType: 'Customer LTV Milestone',
    emails30d: 1840,
    revenue30d: 9800,
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

function isoAgo(n: number, hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export const demoSocialComments = [
  {
    id: 'sc_01',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds 🎧 — crystal-clear sound, 30h battery',
    message: 'Just received mine and the sound quality is absolutely incredible! Best purchase of the year. 🙌',
    authorName: '@aarav.sharma',
    authorPlatformId: 'aarav.sharma',
    createdAt: isoAgo(0, 3),
    adId: 'demo_ad_01',
    adName: 'Earbuds — Feature Reel (IG)',
    sentiment: 'positive',
    sentimentScore: 0.94,
  },
  {
    id: 'sc_02',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds 🎧 — crystal-clear sound, 30h battery',
    message: 'What is the price of this? And where can I order it?',
    authorName: '@priya_loves_tech',
    authorPlatformId: 'priya_loves_tech',
    createdAt: isoAgo(0, 7),
    adId: 'demo_ad_01',
    adName: 'Earbuds — Feature Reel (IG)',
    sentiment: 'neutral',
    sentimentScore: 0.55,
  },
  {
    id: 'sc_03',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Summer Sale — Up to 40% Off sitewide! Limited time only.',
    message: 'My order has been stuck in processing for 5 days now. No response from support either. Very disappointed.',
    authorName: 'Rahul Gupta',
    authorPlatformId: '',
    createdAt: isoAgo(1, 2),
    adId: 'demo_ad_02',
    adName: 'Summer Sale — FB Carousel',
    sentiment: 'negative',
    sentimentScore: 0.09,
  },
  {
    id: 'sc_04',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Smart Watch Series 5 — track everything that matters ⌚',
    message: 'These look amazing! Are they compatible with Android? And what is the cost?',
    authorName: '@tech_sahil_99',
    authorPlatformId: 'tech_sahil_99',
    createdAt: isoAgo(1, 5),
    adId: 'demo_ad_03',
    adName: 'Smart Watch — Launch Ad (IG)',
    sentiment: 'neutral',
    sentimentScore: 0.57,
  },
  {
    id: 'sc_05',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Customer Story: How Priya never misses a beat 💙',
    message: "I've been using these earbuds for 3 months and they're still perfect. Highly recommend to everyone!",
    authorName: 'Sunita Reddy',
    authorPlatformId: '',
    createdAt: isoAgo(2, 1),
    adId: 'demo_ad_04',
    adName: 'UGC Testimonial — FB',
    sentiment: 'positive',
    sentimentScore: 0.97,
  },
  {
    id: 'sc_06',
    platform: 'instagram',
    sourceType: 'ig_comment',
    postPreview: 'Summer Sale — Up to 40% Off sitewide! Limited time only.',
    message: 'Bought the earbuds but the packaging arrived damaged. The product itself is fine though.',
    authorName: '@deepak_k_m',
    authorPlatformId: 'deepak_k_m',
    createdAt: isoAgo(2, 4),
    adId: null,
    adName: null,
    sentiment: 'negative',
    sentimentScore: 0.28,
  },
  {
    id: 'sc_07',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Smart Watch Series 5 — track everything that matters ⌚',
    message: 'Fast delivery and great product quality! Will definitely order again.',
    authorName: 'Meena Pillai',
    authorPlatformId: '',
    createdAt: isoAgo(3, 0),
    adId: 'demo_ad_03',
    adName: 'Smart Watch — Launch Ad (IG)',
    sentiment: 'positive',
    sentimentScore: 0.91,
  },
  {
    id: 'sc_08',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds 🎧 — crystal-clear sound, 30h battery',
    message: 'Okay quality for the price I guess. Nothing exceptional tbh.',
    authorName: '@rohan.m.dev',
    authorPlatformId: 'rohan.m.dev',
    createdAt: isoAgo(3, 6),
    adId: 'demo_ad_01',
    adName: 'Earbuds — Feature Reel (IG)',
    sentiment: 'negative',
    sentimentScore: 0.33,
  },
  {
    id: 'sc_09',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Summer Sale — Up to 40% Off sitewide! Limited time only.',
    message: "Outstanding ANC! Can't hear anything in my noisy office now 😄 worth every rupee",
    authorName: 'Vikram Nair',
    authorPlatformId: '',
    createdAt: isoAgo(4, 2),
    adId: 'demo_ad_02',
    adName: 'Summer Sale — FB Carousel',
    sentiment: 'positive',
    sentimentScore: 0.93,
  },
  {
    id: 'sc_10',
    platform: 'instagram',
    sourceType: 'ig_comment',
    postPreview: 'Smart Watch Series 5 — track everything that matters ⌚',
    message: 'Return process was smooth. Team was helpful and refund came quickly.',
    authorName: '@ananya.styles',
    authorPlatformId: 'ananya.styles',
    createdAt: isoAgo(4, 8),
    adId: null,
    adName: null,
    sentiment: 'positive',
    sentimentScore: 0.78,
  },
  {
    id: 'sc_11',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Customer Story: How Priya never misses a beat 💙',
    message: 'Earbuds disconnected randomly after 2 weeks. Still waiting for a replacement. Pathetic after-sales.',
    authorName: 'Kiran Bose',
    authorPlatformId: '',
    createdAt: isoAgo(5, 1),
    adId: 'demo_ad_04',
    adName: 'UGC Testimonial — FB',
    sentiment: 'negative',
    sentimentScore: 0.08,
  },
  {
    id: 'sc_12',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds 🎧 — crystal-clear sound, 30h battery',
    message: 'Gifted these to my dad and he absolutely loves them! Great gift idea 🎁',
    authorName: '@pooja_m_11',
    authorPlatformId: 'pooja_m_11',
    createdAt: isoAgo(5, 3),
    adId: 'demo_ad_01',
    adName: 'Earbuds — Feature Reel (IG)',
    sentiment: 'positive',
    sentimentScore: 0.96,
  },
  {
    id: 'sc_13',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Summer Sale — Up to 40% Off sitewide! Limited time only.',
    message: 'When will the rose gold variant be back in stock? Really want to buy it.',
    authorName: 'Divya Menon',
    authorPlatformId: '',
    createdAt: isoAgo(6, 0),
    adId: 'demo_ad_02',
    adName: 'Summer Sale — FB Carousel',
    sentiment: 'neutral',
    sentimentScore: 0.52,
  },
  {
    id: 'sc_14',
    platform: 'instagram',
    sourceType: 'ig_comment',
    postPreview: 'Smart Watch Series 5 — track everything that matters ⌚',
    message: 'The noise cancellation on these earbuds is genuinely on par with Sony and Bose. Very impressed.',
    authorName: '@sound_geek_amol',
    authorPlatformId: 'sound_geek_amol',
    createdAt: isoAgo(6, 5),
    adId: null,
    adName: null,
    sentiment: 'positive',
    sentimentScore: 0.88,
  },
  {
    id: 'sc_15',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds 🎧 — crystal-clear sound, 30h battery',
    message: 'Price seems a bit high compared to competitors with similar specs. Is there a discount code?',
    authorName: 'Mohan Tripathi',
    authorPlatformId: '',
    createdAt: isoAgo(7, 2),
    adId: 'demo_ad_01',
    adName: 'Earbuds — Feature Reel (IG)',
    sentiment: 'negative',
    sentimentScore: 0.30,
  },
  {
    id: 'sc_16',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Smart Watch Series 5 — track everything that matters ⌚',
    message: 'Can I get the link to buy this watch? kahan available hai?',
    authorName: '@nisha.trends',
    authorPlatformId: 'nisha.trends',
    createdAt: isoAgo(8, 1),
    adId: 'demo_ad_03',
    adName: 'Smart Watch — Launch Ad (IG)',
    sentiment: 'neutral',
    sentimentScore: 0.58,
  },
  {
    id: 'sc_17',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Customer Story: How Priya never misses a beat 💙',
    message: 'Received a defective unit. Left ear stopped working on day 3. Please DM me for resolution.',
    authorName: 'Suresh Iyer',
    authorPlatformId: '',
    createdAt: isoAgo(9, 4),
    adId: 'demo_ad_04',
    adName: 'UGC Testimonial — FB',
    sentiment: 'negative',
    sentimentScore: 0.06,
  },
  {
    id: 'sc_18',
    platform: 'instagram',
    sourceType: 'ig_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds 🎧 — crystal-clear sound, 30h battery',
    message: 'Wearing these on my 6am run every day. Fit is perfect and they stay put. Love it! ❤️',
    authorName: '@fitness.with.kavya',
    authorPlatformId: 'fitness.with.kavya',
    createdAt: isoAgo(10, 0),
    adId: null,
    adName: null,
    sentiment: 'positive',
    sentimentScore: 0.95,
  },
  {
    id: 'sc_19',
    platform: 'facebook',
    sourceType: 'ad_comment',
    postPreview: 'Summer Sale — Up to 40% Off sitewide! Limited time only.',
    message: 'How much does the smart watch cost? Is it available for COD?',
    authorName: 'Anil Khanna',
    authorPlatformId: '',
    createdAt: isoAgo(11, 3),
    adId: 'demo_ad_02',
    adName: 'Summer Sale — FB Carousel',
    sentiment: 'neutral',
    sentimentScore: 0.54,
  },
  {
    id: 'sc_20',
    platform: 'instagram',
    sourceType: 'ad_comment',
    postPreview: 'Smart Watch Series 5 — track everything that matters ⌚',
    message: 'Third time buying from this brand. Never disappointed. Keep it up 🔥',
    authorName: '@repeat_buyer_raj',
    authorPlatformId: 'repeat_buyer_raj',
    createdAt: isoAgo(12, 6),
    adId: 'demo_ad_03',
    adName: 'Smart Watch — Launch Ad (IG)',
    sentiment: 'positive',
    sentimentScore: 0.98,
  },
];

export const demoSocialStats = {
  total: 20,
  positive: 10,
  neutral: 5,
  negative: 5,
  facebook: 10,
  instagram: 10,
};

// ─── Action Center ────────────────────────────────────────────────────────────

export const demoActions = {
  actions: [
    {
      id: 'act_01',
      severity: 'critical',
      title: 'Earbuds stock critically low — 3 days of cover',
      detail: 'Premium Wireless Earbuds has only 12 units left. At current velocity (4 units/day) you have ~3 days before stockout.',
      impact: '~₹18,500 revenue at risk',
      href: '/dashboard/demo/restock',
      source: 'inventory',
    },
    {
      id: 'act_02',
      severity: 'critical',
      title: '80% of ad comments are negative on BOGO campaign',
      detail: 'Summer Sale — FB Carousel has 14 negative comments in last 7 days. Customers reporting slow delivery and damaged packaging.',
      impact: 'Ad credibility and conversion rate dropping',
      href: '/dashboard/demo/social',
      source: 'meta',
    },
    {
      id: 'act_03',
      severity: 'high',
      title: 'SUMMER20 coupon found on 3 public sites',
      detail: 'Your 20% off code is listed on GrabOn, CouponDunia, and CupoNation. 34% of orders using it are from repeat buyers — probable deal hunters.',
      impact: '₹12,400 in unnecessary discounts last 30d',
      href: '/dashboard/demo/coupon-leak',
      source: 'shopify',
    },
    {
      id: 'act_04',
      severity: 'high',
      title: 'Move ₹4,200/day from Summer Sale to Earbuds Reel',
      detail: 'Earbuds Feature Reel ROAS is 4.8x vs Summer Sale at 1.9x. Reallocating budget could add ₹38,000/month.',
      impact: '+₹38,000 est. monthly revenue',
      href: '/dashboard/demo/budget',
      source: 'meta',
    },
    {
      id: 'act_05',
      severity: 'medium',
      title: '22 search queries found with no matching product',
      detail: 'Top unmatched searches: "wireless gaming headset" (89 searches), "noise cancelling earphones under 2000" (67), "sports earbuds waterproof" (54).',
      impact: 'Potential new product or collection opportunity',
      href: '/dashboard/demo/search-gaps',
      source: 'google',
    },
    {
      id: 'act_06',
      severity: 'medium',
      title: 'UGC Testimonial creative showing fatigue signals',
      detail: 'Frequency at 4.2, CTR dropped 38% vs prior period. Creative has been running 47 days — consider refreshing.',
      impact: 'CPM up 22%, conversion declining',
      href: '/dashboard/demo/fatigue',
      source: 'meta',
    },
    {
      id: 'act_07',
      severity: 'opportunity',
      title: '312 "At Risk" customers haven\'t bought in 90+ days',
      detail: 'These repeat buyers are lapsing. A targeted winback email with 10% off could recover ₹45,000+ in revenue.',
      impact: '₹45,000 winback opportunity',
      href: '/dashboard/demo/segments',
      source: 'insights',
    },
    {
      id: 'act_08',
      severity: 'opportunity',
      title: 'Earbuds + USB-C Hub bought together 34% of the time',
      detail: 'High affinity pair. Add a bundle offer or cross-sell widget on product pages to capture this naturally.',
      impact: 'AOV lift opportunity',
      href: '/dashboard/demo/bundles',
      source: 'shopify',
    },
  ],
  generatedAt: new Date().toISOString(),
  sources: { shopify: true, meta: true, google: true, fatigue: true, insights: true, inventory: true, campaigns: true },
};

// ─── Restock Advisor ──────────────────────────────────────────────────────────

export const demoRestock = {
  rows: [
    { title: 'Premium Wireless Earbuds', stock: 12, reserveStock: 0, listingEmpty: false, dailyRate: 4.1, daysOfCover: 3, status: 'critical', suggestedReorder: 200 },
    { title: 'Smart Watch Series 5 — Black', stock: 28, reserveStock: 0, listingEmpty: false, dailyRate: 3.4, daysOfCover: 8, status: 'low', suggestedReorder: 120 },
    { title: 'Smart Watch Series 5 — Silver', stock: 45, reserveStock: 10, listingEmpty: false, dailyRate: 2.8, daysOfCover: 16, status: 'healthy', suggestedReorder: 80 },
    { title: 'Bluetooth Speaker Mini', stock: 67, reserveStock: 0, listingEmpty: false, dailyRate: 1.9, daysOfCover: 35, status: 'healthy', suggestedReorder: 50 },
    { title: 'Phone Case Pro — iPhone 15', stock: 142, reserveStock: 0, listingEmpty: false, dailyRate: 2.1, daysOfCover: 68, status: 'overstocked', suggestedReorder: 0 },
    { title: 'Phone Case Pro — iPhone 14', stock: 8, reserveStock: 0, listingEmpty: false, dailyRate: 0.4, daysOfCover: 20, status: 'low', suggestedReorder: 30 },
    { title: 'USB-C Hub 7-in-1', stock: 34, reserveStock: 0, listingEmpty: false, dailyRate: 1.2, daysOfCover: 28, status: 'healthy', suggestedReorder: 40 },
    { title: 'Wireless Charging Pad', stock: 0, reserveStock: 0, listingEmpty: true, dailyRate: 0.6, daysOfCover: 0, status: 'critical', suggestedReorder: 60 },
    { title: 'Earbuds Carry Case', stock: 5, reserveStock: 0, listingEmpty: false, dailyRate: 1.8, daysOfCover: 3, status: 'critical', suggestedReorder: 80 },
    { title: 'Cable Organizer Pack', stock: 210, reserveStock: 0, listingEmpty: false, dailyRate: 0.3, daysOfCover: 700, status: 'dead', suggestedReorder: 0 },
  ],
  leadTimeDays: 14,
  bufferDays: 7,
};

// ─── Budget Moves ─────────────────────────────────────────────────────────────

export const demoBudgetMoves = {
  breakEvenRoas: 2.8,
  breakEvenSource: 'cogs' as const,
  blendedRoas: 3.1,
  totalSpend: 42000,
  totalRevenue: 130200,
  winnerThreshold: 3.5,
  loserThreshold: 2.0,
  marginalFactor: 0.7,
  campaigns: [
    { name: 'Earbuds — Feature Reel (IG)', status: 'ACTIVE', spend: 14200, revenue: 68160, roas: 4.8, purchases: 287, bucket: 'winner' as const },
    { name: 'UGC Testimonial — FB', status: 'ACTIVE', spend: 9800, revenue: 34300, roas: 3.5, purchases: 189, bucket: 'winner' as const },
    { name: 'Smart Watch — Launch Ad (IG)', status: 'ACTIVE', spend: 11400, revenue: 22800, roas: 2.0, purchases: 134, bucket: 'loser' as const },
    { name: 'Summer Sale — FB Carousel', status: 'ACTIVE', spend: 6600, revenue: 12540, roas: 1.9, purchases: 98, bucket: 'loser' as const },
  ],
  moves: [
    { fromCampaign: 'Smart Watch — Launch Ad (IG)', fromRoas: 2.0, fromSpend: 11400, toCampaign: 'Earbuds — Feature Reel (IG)', toRoas: 4.8, amount: 4000, estMonthlyGain: 38400 },
    { fromCampaign: 'Summer Sale — FB Carousel', fromRoas: 1.9, fromSpend: 6600, toCampaign: 'UGC Testimonial — FB', toRoas: 3.5, amount: 2200, estMonthlyGain: 12100 },
  ],
  totalEstMonthlyGain: 50500,
};

// ─── Purchase Patterns ────────────────────────────────────────────────────────

export const demoPurchasePatterns = {
  pairs: [
    { a: 'Premium Wireless Earbuds', b: 'USB-C Hub 7-in-1', together: 187, aOrders: 548, bOrders: 312, confidence: 34.1, lift: 2.4, avgPairRevenue: 2340 },
    { a: 'Smart Watch Series 5 — Black', b: 'Wireless Charging Pad', together: 142, aOrders: 398, bOrders: 198, confidence: 35.7, lift: 3.1, avgPairRevenue: 3180 },
    { a: 'Premium Wireless Earbuds', b: 'Earbuds Carry Case', together: 134, aOrders: 548, bOrders: 287, confidence: 24.5, lift: 1.9, avgPairRevenue: 1760 },
    { a: 'Phone Case Pro — iPhone 15', b: 'USB-C Hub 7-in-1', together: 98, aOrders: 312, bOrders: 312, confidence: 31.4, lift: 2.2, avgPairRevenue: 1890 },
    { a: 'Smart Watch Series 5 — Silver', b: 'USB-C Hub 7-in-1', together: 76, aOrders: 287, bOrders: 312, confidence: 26.5, lift: 1.9, avgPairRevenue: 2780 },
    { a: 'Bluetooth Speaker Mini', b: 'Cable Organizer Pack', together: 54, aOrders: 223, bOrders: 189, confidence: 24.2, lift: 2.9, avgPairRevenue: 1340 },
  ],
  replenishment: {
    overallMedianDays: 47,
    overallSamples: 624,
    gapHistogram: [
      { bucket: '0-14', count: 45 },
      { bucket: '15-30', count: 89 },
      { bucket: '31-45', count: 134 },
      { bucket: '46-60', count: 198 },
      { bucket: '61-90', count: 112 },
      { bucket: '91+', count: 46 },
    ],
    byProduct: [
      { title: 'Premium Wireless Earbuds', repurchases: 187, medianDays: 42, p25Days: 28, p75Days: 62 },
      { title: 'Earbuds Carry Case', repurchases: 98, medianDays: 38, p25Days: 22, p75Days: 55 },
      { title: 'Phone Case Pro — iPhone 15', repurchases: 134, medianDays: 56, p25Days: 38, p75Days: 78 },
      { title: 'USB-C Hub 7-in-1', repurchases: 76, medianDays: 61, p25Days: 42, p75Days: 88 },
      { title: 'Cable Organizer Pack', repurchases: 65, medianDays: 35, p25Days: 24, p75Days: 48 },
    ],
  },
  ordersAnalysed: 1847,
  multiItemOrderShare: 28.4,
  rangeDays: 90,
};

// ─── Profit ───────────────────────────────────────────────────────────────────

export const demoProfit = {
  shopifyRevenue: 284750,
  shopifyOrders: 1847,
  metaSpend: 42000,
  metaRevenue: 130200,
  googleSpend: 8400,
  googleRevenue: 24360,
  totalAdSpend: 50400,
  cogsCost: 99662,
  shippingCost: 18508,
  returnCost: 8543,
  netRevenue: 276207,
  grossProfit: 149085,
  contributionMargin: 98085,
  mer: 5.65,
  grossMarginPct: 52.4,
  netMarginPct: 34.5,
  breakEvenRoas: 2.8,
  cogsPercent: 35,
  avgShippingCost: 100,
  avgReturnRate: 3,
  dailySeries: Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const date = d.toISOString().split('T')[0];
    const revenue = 8000 + Math.round(Math.sin(i * 0.4) * 2000 + Math.random() * 1500);
    const adSpend = 1400 + Math.round(Math.random() * 600);
    const cogs = Math.round(revenue * 0.35);
    const profit = revenue - adSpend - cogs - 617;
    return { date, revenue, adSpend, cogs, profit };
  }),
};

// ─── Customer Insights ────────────────────────────────────────────────────────

export const demoInsights = {
  segments: [
    {
      key: 'champions',
      label: 'Champions',
      description: '3+ orders, bought in the last 60 days — protect these at all costs',
      customers: 187,
      revenue: 98400,
      avgOrders: 4.2,
      avgSpent: 526,
      list: [],
    },
    {
      key: 'loyal',
      label: 'Loyal',
      description: '2+ orders, active in the last 90 days',
      customers: 342,
      revenue: 74800,
      avgOrders: 2.6,
      avgSpent: 219,
      list: [],
    },
    {
      key: 'new',
      label: 'New',
      description: 'First order within the last 30 days — nurture to a 2nd purchase',
      customers: 489,
      revenue: 56700,
      avgOrders: 1.0,
      avgSpent: 116,
      list: [],
    },
    {
      key: 'promising',
      label: 'Promising',
      description: 'One order, 1–3 months ago — prime for a winback nudge',
      customers: 298,
      revenue: 31200,
      avgOrders: 1.0,
      avgSpent: 105,
      list: [],
    },
    {
      key: 'at_risk',
      label: 'At Risk',
      description: 'Repeat buyers gone quiet for 3–6 months — winback campaign now',
      customers: 312,
      revenue: 18900,
      avgOrders: 2.1,
      avgSpent: 61,
      list: [],
    },
    {
      key: 'lost',
      label: 'Lost',
      description: 'No purchase in 6+ months',
      customers: 534,
      revenue: 4750,
      avgOrders: 1.2,
      avgSpent: 9,
      list: [],
    },
  ],
  cohorts: [
    { cohort: '2025-07', customers: 312, retention: [100, 22, 14, 9, 6, 4] },
    { cohort: '2025-08', customers: 287, retention: [100, 24, 15, 10, 7] },
    { cohort: '2025-09', customers: 334, retention: [100, 21, 13, 8] },
    { cohort: '2025-10', customers: 298, retention: [100, 25, 16] },
    { cohort: '2025-11', customers: 321, retention: [100, 23] },
    { cohort: '2025-12', customers: 356, retention: [100] },
  ],
  cohortLtv: [
    { cohort: '2025-07', customers: 312, cumRevenuePerCustomer: [142, 198, 234, 256, 271, 280] },
    { cohort: '2025-08', customers: 287, cumRevenuePerCustomer: [148, 210, 248, 268, 281] },
    { cohort: '2025-09', customers: 334, cumRevenuePerCustomer: [136, 195, 228, 244] },
    { cohort: '2025-10', customers: 298, cumRevenuePerCustomer: [154, 214, 251] },
    { cohort: '2025-11', customers: 321, cumRevenuePerCustomer: [144, 201] },
    { cohort: '2025-12', customers: 356, cumRevenuePerCustomer: [138] },
  ],
  velocity: [
    { title: 'Premium Wireless Earbuds', unitsLast7: 29, dailyAvgLast7: 4.1, dailyAvgPrior28: 2.8, ratio: 1.47, status: 'surging', lastSoldDate: daysAgo(0) },
    { title: 'Smart Watch Series 5 — Black', unitsLast7: 24, dailyAvgLast7: 3.4, dailyAvgPrior28: 3.6, ratio: 0.94, status: 'steady', lastSoldDate: daysAgo(0) },
    { title: 'Phone Case Pro — iPhone 15', unitsLast7: 15, dailyAvgLast7: 2.1, dailyAvgPrior28: 2.9, ratio: 0.72, status: 'slowing', lastSoldDate: daysAgo(1) },
    { title: 'USB-C Hub 7-in-1', unitsLast7: 8, dailyAvgLast7: 1.2, dailyAvgPrior28: 1.1, ratio: 1.09, status: 'steady', lastSoldDate: daysAgo(1) },
    { title: 'Bluetooth Speaker Mini', unitsLast7: 13, dailyAvgLast7: 1.9, dailyAvgPrior28: 2.2, ratio: 0.86, status: 'slowing', lastSoldDate: daysAgo(2) },
    { title: 'Earbuds Carry Case', unitsLast7: 12, dailyAvgLast7: 1.8, dailyAvgPrior28: 2.1, ratio: 0.86, status: 'slowing', lastSoldDate: daysAgo(2) },
    { title: 'Wireless Charging Pad', unitsLast7: 0, dailyAvgLast7: 0.0, dailyAvgPrior28: 0.6, ratio: 0.0, status: 'stalled', lastSoldDate: daysAgo(14) },
    { title: 'Cable Organizer Pack', unitsLast7: 2, dailyAvgLast7: 0.3, dailyAvgPrior28: 0.4, ratio: 0.75, status: 'slowing', lastSoldDate: daysAgo(3) },
  ],
  totalCustomers: 2162,
  rangeDays: 180,
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export function getDemoGoals() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const target = 320000;
  const dailyRunRate = 9200;
  const mtdRevenue = dailyRunRate * dayOfMonth * (0.9 + Math.random() * 0.2);
  const projectedRevenue = mtdRevenue + dailyRunRate * daysRemaining;
  const neededPerDay = daysRemaining > 0 ? (target - mtdRevenue) / daysRemaining : 0;
  const cumulativeSeries = Array.from({ length: dayOfMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const revenue = dailyRunRate * (0.85 + Math.random() * 0.3);
    return {
      date: d.toISOString().split('T')[0],
      revenue: Math.round(revenue),
      cumulative: Math.round(dailyRunRate * (i + 1) * 0.97),
    };
  });
  return {
    target,
    monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    daysInMonth,
    dayOfMonth,
    daysRemaining,
    mtdRevenue: Math.round(mtdRevenue),
    mtdOrders: Math.round(mtdRevenue / 154),
    dailyRunRate: Math.round(dailyRunRate),
    projectedRevenue: Math.round(projectedRevenue),
    neededPerDay: Math.round(neededPerDay),
    prevMonthRevenue: 241200,
    cumulativeSeries,
  };
}

// ─── CAC Payback ──────────────────────────────────────────────────────────────

export const demoPayback = {
  cohorts: [
    { cohort: '2025-07', newCustomers: 312, adSpend: 12400, cac: 39.7, cumRevenuePerCustomer: [142, 198, 234, 256, 271, 280], cumGrossPerCustomer: [50, 69, 82, 90, 95, 98], paybackMonth: 2 },
    { cohort: '2025-08', newCustomers: 287, adSpend: 11800, cac: 41.1, cumRevenuePerCustomer: [148, 210, 248, 268, 281], cumGrossPerCustomer: [52, 74, 87, 94, 98], paybackMonth: 2 },
    { cohort: '2025-09', newCustomers: 334, adSpend: 13200, cac: 39.5, cumRevenuePerCustomer: [136, 195, 228, 244], cumGrossPerCustomer: [48, 68, 80, 85], paybackMonth: 2 },
    { cohort: '2025-10', newCustomers: 298, adSpend: 12100, cac: 40.6, cumRevenuePerCustomer: [154, 214, 251], cumGrossPerCustomer: [54, 75, 88], paybackMonth: 2 },
    { cohort: '2025-11', newCustomers: 321, adSpend: 12900, cac: 40.2, cumRevenuePerCustomer: [144, 201], cumGrossPerCustomer: [50, 70], paybackMonth: null },
    { cohort: '2025-12', newCustomers: 356, adSpend: 13800, cac: 38.8, cumRevenuePerCustomer: [138], cumGrossPerCustomer: [48], paybackMonth: null },
  ],
  avgCac: 40.0,
  m0RecoveryPct: 122,
  paidBackCohorts: 4,
  matureCohorts: 4,
  grossMarginUsed: 35,
  cogsConfigured: true,
  spendSource: 'meta' as const,
  rangeDays: 180,
};

// ─── Creative Fatigue ─────────────────────────────────────────────────────────

export const demoFatigue = {
  ads: [
    {
      id: 'demo_ad_04',
      name: 'UGC Testimonial — FB',
      campaignName: 'UGC Testimonial — FB',
      spend: 9800,
      impressions: 312000,
      frequency: 4.2,
      ctr: 0.84,
      cpm: 31.4,
      roas: 3.5,
      purchases: 189,
      prevCtr: 1.36,
      prevCpm: 25.7,
      prevFrequency: 2.8,
      ctrChange: -38.2,
      cpmChange: 22.2,
      status: 'fatigued' as const,
      reasons: ['Frequency >4', 'CTR dropped 38%', 'CPM up 22%'],
      thumbnailUrl: null,
    },
    {
      id: 'demo_ad_03',
      name: 'Smart Watch — Launch Ad (IG)',
      campaignName: 'Smart Watch — Launch Ad (IG)',
      spend: 11400,
      impressions: 289000,
      frequency: 3.1,
      ctr: 1.12,
      cpm: 39.4,
      roas: 2.0,
      purchases: 134,
      prevCtr: 1.48,
      prevCpm: 33.2,
      prevFrequency: 2.1,
      ctrChange: -24.3,
      cpmChange: 18.7,
      status: 'warning' as const,
      reasons: ['CTR dropped 24%', 'CPM rising'],
      thumbnailUrl: null,
    },
    {
      id: 'demo_ad_02',
      name: 'Summer Sale — FB Carousel',
      campaignName: 'Summer Sale — FB Carousel',
      spend: 6600,
      impressions: 198000,
      frequency: 2.4,
      ctr: 1.89,
      cpm: 33.3,
      roas: 1.9,
      purchases: 98,
      prevCtr: 2.1,
      prevCpm: 30.1,
      prevFrequency: 1.9,
      ctrChange: -10.0,
      cpmChange: 10.6,
      status: 'warning' as const,
      reasons: ['Low ROAS approaching break-even'],
      thumbnailUrl: null,
    },
    {
      id: 'demo_ad_01',
      name: 'Earbuds — Feature Reel (IG)',
      campaignName: 'Earbuds — Feature Reel (IG)',
      spend: 14200,
      impressions: 412000,
      frequency: 1.8,
      ctr: 2.46,
      cpm: 34.5,
      roas: 4.8,
      purchases: 287,
      prevCtr: 2.31,
      prevCpm: 35.2,
      prevFrequency: 1.4,
      ctrChange: 6.5,
      cpmChange: -2.0,
      status: 'healthy' as const,
      reasons: [],
      thumbnailUrl: null,
    },
  ],
  currentPeriod: { since: daysAgo(30), until: daysAgo(0) },
  previousPeriod: { since: daysAgo(60), until: daysAgo(31) },
  summary: {
    fatigued: 1,
    warning: 2,
    healthy: 1,
    newAds: 0,
    fatiguedSpend: 9800,
    totalSpend: 42000,
  },
};

// ─── Creative Themes ──────────────────────────────────────────────────────────

export const demoCreativeThemes = {
  themes: [
    { key: 'ugc', label: 'UGC / Testimonial', icon: '🎥', ads: 8, spend: 18400, revenue: 72400, roas: 3.93, ctr: 1.64, purchases: 412, spendShare: 43.8, revenueShare: 47.1, topAds: [{ name: 'UGC Testimonial — FB', spend: 9800, roas: 3.5 }, { name: 'Customer Review Reel', spend: 5200, roas: 4.6 }] },
    { key: 'product', label: 'Product Feature', icon: '📦', ads: 6, spend: 14200, revenue: 68160, roas: 4.80, ctr: 2.46, purchases: 287, spendShare: 33.8, revenueShare: 44.3, topAds: [{ name: 'Earbuds — Feature Reel (IG)', spend: 14200, roas: 4.8 }] },
    { key: 'sale', label: 'Promotion / Sale', icon: '🏷️', ads: 4, spend: 6600, revenue: 12540, roas: 1.90, ctr: 1.89, purchases: 98, spendShare: 15.7, revenueShare: 8.2, topAds: [{ name: 'Summer Sale — FB Carousel', spend: 6600, roas: 1.9 }] },
    { key: 'launch', label: 'New Launch', icon: '🚀', ads: 2, spend: 2800, revenue: 5040, roas: 1.80, ctr: 1.12, purchases: 42, spendShare: 6.7, revenueShare: 3.3, topAds: [{ name: 'Smart Watch — Launch Ad (IG)', spend: 2800, roas: 1.8 }] },
  ],
  totalAds: 20,
  totalSpend: 42000,
  totalRevenue: 153700,
  note: 'UGC and Product Feature themes drive 91% of revenue despite only 67% of spend — strong signal to double down.',
};

// ─── Event ROI ────────────────────────────────────────────────────────────────

export const demoEventRoi = {
  events: [
    { id: 'ev_01', title: 'Diwali Flash Sale', type: 'sale', startDate: daysAgo(45), endDate: daysAgo(40), status: 'ended' as const, days: 6, revenueDuring: 87400, ordersDuring: 412, dailyDuring: 14567, dailyBaseline: 9200, liftPct: 58.3, revenueTarget: 90000, targetAchievedPct: 97.1 },
    { id: 'ev_02', title: 'Influencer Keshav Campaign', type: 'campaign', startDate: daysAgo(30), endDate: daysAgo(23), status: 'ended' as const, days: 8, revenueDuring: 64800, ordersDuring: 321, dailyDuring: 8100, dailyBaseline: 9200, liftPct: -12.0, revenueTarget: 80000, targetAchievedPct: 81.0 },
    { id: 'ev_03', title: 'Black Friday Weekend', type: 'sale', startDate: daysAgo(15), endDate: daysAgo(12), status: 'ended' as const, days: 4, revenueDuring: 112000, ordersDuring: 687, dailyDuring: 28000, dailyBaseline: 9200, liftPct: 204.3, revenueTarget: 100000, targetAchievedPct: 112.0 },
    { id: 'ev_04', title: 'Christmas Campaign', type: 'campaign', startDate: daysAgo(7), endDate: daysAgo(0), status: 'ongoing' as const, days: 7, revenueDuring: 58400, ordersDuring: 312, dailyDuring: 8343, dailyBaseline: 9200, liftPct: -9.3, revenueTarget: 75000, targetAchievedPct: 77.9 },
    { id: 'ev_05', title: 'New Year Countdown', type: 'sale', startDate: daysAgo(-7), endDate: daysAgo(-3), status: 'upcoming' as const, days: 5, revenueDuring: 0, ordersDuring: 0, dailyDuring: 0, dailyBaseline: 9200, liftPct: null, revenueTarget: 120000, targetAchievedPct: null },
  ],
  byType: [
    { type: 'sale', count: 3, avgLiftPct: 87.5, totalRevenue: 199400 },
    { type: 'campaign', count: 2, avgLiftPct: -10.6, totalRevenue: 123200 },
  ],
};

// ─── Discount Codes ───────────────────────────────────────────────────────────

export const demoDiscounts = {
  codes: [
    { code: 'SUMMER20', orders: 287, revenue: 42800, totalDiscount: 10700, aov: 149.1, avgDiscountPct: 20.0, newCustomerOrders: 189, newCustomerShare: 65.9 },
    { code: 'WELCOME10', orders: 198, revenue: 28600, totalDiscount: 3178, aov: 144.4, avgDiscountPct: 10.0, newCustomerOrders: 187, newCustomerShare: 94.4 },
    { code: 'FLAT200', orders: 134, revenue: 24600, totalDiscount: 26800, aov: 183.6, avgDiscountPct: 52.1, newCustomerOrders: 54, newCustomerShare: 40.3 },
    { code: 'BOGO', orders: 89, revenue: 18900, totalDiscount: 9450, aov: 212.4, avgDiscountPct: 33.3, newCustomerOrders: 41, newCustomerShare: 46.1 },
    { code: 'DIWALI30', orders: 312, revenue: 54600, totalDiscount: 23400, aov: 175.0, avgDiscountPct: 30.0, newCustomerOrders: 221, newCustomerShare: 70.8 },
    { code: 'REFER15', orders: 67, revenue: 9600, totalDiscount: 1694, aov: 143.3, avgDiscountPct: 15.0, newCustomerOrders: 58, newCustomerShare: 86.6 },
  ],
  summary: {
    totalOrders: 1847,
    discountedOrders: 1087,
    discountedShare: 58.8,
    discountedRevenue: 179100,
    nonDiscountedRevenue: 105650,
    totalDiscountGiven: 75222,
    discountedAov: 164.8,
    nonDiscountedAov: 139.7,
  },
};

// ─── Coupon Leak ──────────────────────────────────────────────────────────────

export const demoCouponLeak = {
  leaks: [
    { code: 'SUMMER20', sites: ['GrabOn', 'CouponDunia', 'CupoNation'], orders: 287, revenue: 42800, totalDiscount: 10700, newCustomerShare: 65.9, aov: 149.1 },
    { code: 'FLAT200', sites: ['CouponMoto'], orders: 134, revenue: 24600, totalDiscount: 26800, newCustomerShare: 40.3, aov: 183.6 },
    { code: 'BOGO', sites: ['GrabOn', 'Savyour'], orders: 89, revenue: 18900, totalDiscount: 9450, newCustomerShare: 46.1, aov: 212.4 },
  ],
  allCodes: [
    { code: 'SUMMER20', orders: 287, revenue: 42800 },
    { code: 'WELCOME10', orders: 198, revenue: 28600 },
    { code: 'FLAT200', orders: 134, revenue: 24600 },
    { code: 'BOGO', orders: 89, revenue: 18900 },
    { code: 'DIWALI30', orders: 312, revenue: 54600 },
    { code: 'REFER15', orders: 67, revenue: 9600 },
  ],
  siteScans: [
    { site: 'GrabOn', codesFound: 2 },
    { site: 'CouponDunia', codesFound: 1 },
    { site: 'CouponMoto', codesFound: 1 },
    { site: 'Savyour', codesFound: 1 },
    { site: 'CupoNation', codesFound: 1 },
  ],
  scannedAt: new Date().toISOString(),
};

// ─── Search Gap Miner ─────────────────────────────────────────────────────────

export const demoSearchGaps = {
  hasGA4: true,
  hasSearchData: true,
  totalSearches: 1847,
  terms: [
    { term: 'wireless gaming headset', searches: 89, share: 4.8, hasProductMatch: false },
    { term: 'noise cancelling earphones under 2000', searches: 67, share: 3.6, hasProductMatch: false },
    { term: 'sports earbuds waterproof', searches: 54, share: 2.9, hasProductMatch: false },
    { term: 'premium wireless earbuds', searches: 212, share: 11.5, hasProductMatch: true },
    { term: 'smart watch series 5', searches: 187, share: 10.1, hasProductMatch: true },
    { term: 'apple watch alternative india', searches: 43, share: 2.3, hasProductMatch: false },
    { term: 'bluetooth speaker outdoor', searches: 38, share: 2.1, hasProductMatch: false },
    { term: 'earbuds for gym', searches: 31, share: 1.7, hasProductMatch: false },
    { term: 'phone case iphone 16', searches: 29, share: 1.6, hasProductMatch: false },
    { term: 'usb c hub for macbook', searches: 98, share: 5.3, hasProductMatch: true },
    { term: 'anc headphones comparison', searches: 24, share: 1.3, hasProductMatch: false },
    { term: 'wireless charger fast charging', searches: 19, share: 1.0, hasProductMatch: false },
  ],
};

// ─── Code Forensics ───────────────────────────────────────────────────────────

export const demoCodeForensics = {
  rows: [
    { code: 'WELCOME10', orders: 198, revenue: 28600, aov: 144.4, newCustomerShare: 94.4, totalDiscount: 3178, avgDiscountPct: 10.0, repeatCustomerShare: 5.6, dealHunterScore: 22, verdict: 'growth_driver' as const, verdictReason: '94% new customers, light 10% discount — classic acquisition code' },
    { code: 'REFER15', orders: 67, revenue: 9600, aov: 143.3, newCustomerShare: 86.6, totalDiscount: 1694, avgDiscountPct: 15.0, repeatCustomerShare: 13.4, dealHunterScore: 30, verdict: 'growth_driver' as const, verdictReason: '87% new customers, referral code working as intended' },
    { code: 'DIWALI30', orders: 312, revenue: 54600, aov: 175.0, newCustomerShare: 70.8, totalDiscount: 23400, avgDiscountPct: 30.0, repeatCustomerShare: 29.2, dealHunterScore: 54, verdict: 'mixed' as const, verdictReason: '71% new customers but heavy 30% discount reduces margin significantly' },
    { code: 'SUMMER20', orders: 287, revenue: 42800, aov: 149.1, newCustomerShare: 65.9, totalDiscount: 10700, avgDiscountPct: 20.0, repeatCustomerShare: 34.1, dealHunterScore: 57, verdict: 'mixed' as const, verdictReason: '34% repeat buyers using a public code — leaked to coupon sites' },
    { code: 'BOGO', orders: 89, revenue: 18900, aov: 212.4, newCustomerShare: 46.1, totalDiscount: 9450, avgDiscountPct: 33.3, repeatCustomerShare: 53.9, dealHunterScore: 71, verdict: 'deal_hunters' as const, verdictReason: '54% repeat buyers + 33% discount = discount-seeking behavior, not acquisition' },
    { code: 'FLAT200', orders: 134, revenue: 24600, aov: 183.6, newCustomerShare: 40.3, totalDiscount: 26800, avgDiscountPct: 52.1, repeatCustomerShare: 59.7, dealHunterScore: 84, verdict: 'deal_hunters' as const, verdictReason: '60% repeat buyers + 52% discount — this code is heavily abused, consider retiring' },
  ],
  summary: {
    growth_driver: 2,
    mixed: 2,
    deal_hunters: 2,
    low_volume: 0,
    totalCodes: 6,
  },
  dateRange: '90d',
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
