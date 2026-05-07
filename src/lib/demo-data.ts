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

export const demoSocialComments = [
  {
    id: 'sc_01',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Just received mine and the sound quality is absolutely incredible! Best purchase of the year.',
    author: 'Aarav Sharma',
    sentiment: 'positive',
    sentimentScore: 0.94,
    date: daysAgo(1),
  },
  {
    id: 'sc_02',
    platform: 'Instagram',
    source: 'post_comment',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'Love the design! How long does the battery last?',
    author: 'priya_loves_tech',
    sentiment: 'positive',
    sentimentScore: 0.72,
    date: daysAgo(1),
  },
  {
    id: 'sc_03',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: 'My order has been stuck in processing for 5 days. No response from support.',
    author: 'Rahul Gupta',
    sentiment: 'negative',
    sentimentScore: 0.12,
    date: daysAgo(2),
  },
  {
    id: 'sc_04',
    platform: 'Instagram',
    source: 'tagged',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'These look amazing! Are they compatible with Android?',
    author: 'tech_sahil_99',
    sentiment: 'neutral',
    sentimentScore: 0.55,
    date: daysAgo(2),
  },
  {
    id: 'sc_05',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'Customer Story: Meet Priya 💙',
    comment: "I've been using these earbuds for 3 months and they're still perfect. Highly recommend!",
    author: 'Sunita Reddy',
    sentiment: 'positive',
    sentimentScore: 0.97,
    date: daysAgo(3),
  },
  {
    id: 'sc_06',
    platform: 'Instagram',
    source: 'mention',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: 'Bought the headphones but the packaging was damaged. Product is fine though.',
    author: 'deepak_k_m',
    sentiment: 'negative',
    sentimentScore: 0.28,
    date: daysAgo(3),
  },
  {
    id: 'sc_07',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'Fast delivery and great product quality!',
    author: 'Meena Pillai',
    sentiment: 'positive',
    sentimentScore: 0.91,
    date: daysAgo(4),
  },
  {
    id: 'sc_08',
    platform: 'Instagram',
    source: 'post_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Okay quality for the price. Nothing exceptional.',
    author: 'rohan.m.dev',
    sentiment: 'neutral',
    sentimentScore: 0.48,
    date: daysAgo(4),
  },
  {
    id: 'sc_09',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: "Outstanding ANC! Can't hear anything in my noisy office now 😄",
    author: 'Vikram Nair',
    sentiment: 'positive',
    sentimentScore: 0.93,
    date: daysAgo(5),
  },
  {
    id: 'sc_10',
    platform: 'Instagram',
    source: 'tagged',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'Return process was smooth. Team was helpful.',
    author: 'ananya.styles',
    sentiment: 'positive',
    sentimentScore: 0.78,
    date: daysAgo(5),
  },
  {
    id: 'sc_11',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'Customer Story: Meet Priya 💙',
    comment: 'Earbuds disconnected after 2 weeks. Still waiting for replacement.',
    author: 'Kiran Bose',
    sentiment: 'negative',
    sentimentScore: 0.14,
    date: daysAgo(6),
  },
  {
    id: 'sc_12',
    platform: 'Instagram',
    source: 'post_comment',
    postPreview: 'Introducing our Premium Wireless Earbuds! 🎧',
    comment: 'Gifted these to my dad and he absolutely loves them!',
    author: 'pooja_m_11',
    sentiment: 'positive',
    sentimentScore: 0.96,
    date: daysAgo(6),
  },
  {
    id: 'sc_13',
    platform: 'Facebook',
    source: 'post_comment',
    postPreview: 'Summer Sale — Up to 40% Off!',
    comment: 'When will the rose gold version be back in stock?',
    author: 'Divya Menon',
    sentiment: 'neutral',
    sentimentScore: 0.52,
    date: daysAgo(7),
  },
  {
    id: 'sc_14',
    platform: 'Instagram',
    source: 'mention',
    postPreview: 'New Stock Alert 🔥 Smart Watch Series 5',
    comment: 'The noise cancellation on these is genuinely on par with much more expensive options.',
    author: 'sound_geek_amol',
    sentiment: 'positive',
    sentimentScore: 0.88,
    date: daysAgo(7),
  },
  {
    id: 'sc_15',
    platform: 'Facebook',
    source: 'post_comment',
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
