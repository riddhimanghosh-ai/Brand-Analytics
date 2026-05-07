import type {
  ShopifyKPIs,
  ShopifyOrder,
  ShopifyProduct,
  RevenueDataPoint,
  ShopifyCustomer,
} from '@/types';

interface ShopifyConfig {
  storeUrl: string;
  accessToken: string;
}

const API_VERSION = '2024-10';

// ---------------------------------------------------------------------------
// Exported interface for advanced CRO metrics
// ---------------------------------------------------------------------------

export interface AdvancedCROMetrics {
  locationBreakdown: {
    byCountry: { country: string; countryCode: string; orders: number; revenue: number }[];
    byCity: { city: string; province: string; country: string; orders: number; revenue: number }[];
  };
  salesChannels: { channel: string; orders: number; revenue: number }[];
  discountAnalysis: {
    topCodes: { code: string; uses: number; totalDiscount: number; avgDiscount: number }[];
    discountedOrdersRate: number; // percentage
    totalDiscountGiven: number;
    avgDiscount: number;
  };
  timeAnalysis: {
    byHour: { hour: number; label: string; orders: number; revenue: number }[];
    byDayOfWeek: { day: string; dayNum: number; orders: number; revenue: number }[];
  };
  clvMetrics: {
    avgLTV: number;
    avgOrdersPerCustomer: number;
    buyOnce: number;
    buyTwice: number;
    buyThreePlus: number;
    totalCustomers: number;
  };
  aovByDate: { date: string; orders: number; revenue: number; aov: number }[];
  financialFunnel: { name: string; value: number }[];
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  dropoffRate: number;
}

// ---------------------------------------------------------------------------
// Internal GraphQL helper
// ---------------------------------------------------------------------------

async function shopifyGraphQL(
  config: ShopifyConfig,
  query: string,
  variables?: Record<string, unknown>,
  retries = 3
): Promise<Record<string, unknown>> {
  const url = `https://${config.storeUrl}/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  // Handle Shopify rate limiting — retry with backoff
  if (json.errors) {
    const isThrottled = json.errors.some(
      (e: { extensions?: { code?: string } }) => e.extensions?.code === 'THROTTLED'
    );
    if (isThrottled && retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return shopifyGraphQL(config, query, variables, retries - 1);
    }
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Fetch all pages using cursor-based pagination
// Now includes shippingAddress, discountCodes, and channelInformation
// ---------------------------------------------------------------------------

async function fetchAllOrders(
  config: ShopifyConfig,
  startDate: string,
  endDate: string,
  maxPages = 5
): Promise<Array<Record<string, unknown>>> {
  const allOrders: Array<Record<string, unknown>> = [];
  let cursor: string | null = null;
  let page = 0;

  while (page < maxPages) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `
      {
        orders(first: 100, query: "created_at:>='${startDate}' AND created_at:<='${endDate}'"${afterClause}, sortKey: CREATED_AT, reverse: true) {
          edges {
            cursor
            node {
              id
              name
              email
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                }
              }
              totalRefundedSet {
                shopMoney {
                  amount
                }
              }
              totalDiscountsSet {
                shopMoney {
                  amount
                }
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                    product {
                      id
                      title
                      featuredImage {
                        url
                      }
                    }
                  }
                }
              }
              customer {
                id
                firstName
                lastName
                email
                numberOfOrders
                createdAt
                tags
              }
              shippingAddress {
                city
                province
                country
                countryCode
              }
              discountCodes
              channelInformation {
                channelDefinition {
                  handle
                  channelName
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const data = await shopifyGraphQL(config, query);
    const edges = data.orders.edges;

    if (!edges || edges.length === 0) break;

    for (const edge of edges) {
      allOrders.push(edge.node);
      cursor = edge.cursor;
    }

    if (!data.orders.pageInfo.hasNextPage) break;
    page++;
  }

  return allOrders;
}

// ---------------------------------------------------------------------------
// Public: testConnection
// ---------------------------------------------------------------------------

export async function testConnection(
  config: ShopifyConfig
): Promise<{ success: boolean; shopName?: string; error?: string }> {
  try {
    const data = await shopifyGraphQL(config, '{ shop { name email myshopifyDomain } }');
    return { success: true, shopName: data.shop.name };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Public: getShopInfo
// ---------------------------------------------------------------------------

export async function getShopInfo(config: ShopifyConfig) {
  const data = await shopifyGraphQL(
    config,
    `{
      shop {
        name
        email
        myshopifyDomain
        primaryDomain { url }
        currencyCode
        plan { displayName }
        billingAddress { country }
      }
    }`
  );
  return data.shop;
}

// ---------------------------------------------------------------------------
// Internal: computeMetrics helper
// ---------------------------------------------------------------------------

function computeMetrics(orders: Array<Record<string, unknown>>) {
  let totalRevenue = 0;
  let totalRefunded = 0;
  let totalItems = 0;
  const customerIds = new Set<string>();
  const repeatCustomers = new Set<string>();
  let returningCustomerRevenue = 0;
  let newCustomerRevenue = 0;
  const productRevenue: Record<string, number> = {};

  for (const order of orders) {
    const priceSet = order.totalPriceSet as { shopMoney: { amount: string } };
    const price = parseFloat(priceSet?.shopMoney?.amount || '0');
    totalRevenue += price;

    const refundSet = order.totalRefundedSet as { shopMoney: { amount: string } };
    const refund = parseFloat(refundSet?.shopMoney?.amount || '0');
    totalRefunded += refund;

    const customer = order.customer as { id: string; numberOfOrders: number } | null;
    if (customer?.id) {
      customerIds.add(customer.id);
      const orderCount = customer.numberOfOrders || 0;
      if (orderCount > 1) {
        repeatCustomers.add(customer.id);
        returningCustomerRevenue += price;
      } else {
        newCustomerRevenue += price;
      }
    }

    const lineItems = order.lineItems as {
      edges: Array<{
        node: {
          title: string;
          quantity: number;
          product: { title: string } | null;
        };
      }>;
    };
    if (lineItems?.edges) {
      for (const li of lineItems.edges) {
        totalItems += li.node.quantity || 0;
        const prodTitle = li.node.product?.title || li.node.title;
        const itemPrice =
          li.node.quantity *
          parseFloat(
            (
              li.node as unknown as {
                originalUnitPriceSet: { shopMoney: { amount: string } };
              }
            ).originalUnitPriceSet?.shopMoney?.amount || '0'
          );
        productRevenue[prodTitle] = (productRevenue[prodTitle] || 0) + itemPrice;
      }
    }
  }

  const totalOrders = orders.length;
  const uniqueCustomers = customerIds.size;
  const topProduct =
    Object.entries(productRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    uniqueCustomers,
    repeatCustomerRate:
      uniqueCustomers > 0 ? (repeatCustomers.size / uniqueCustomers) * 100 : 0,
    refundRate: totalRevenue > 0 ? (totalRefunded / totalRevenue) * 100 : 0,
    averageItemsPerOrder: totalOrders > 0 ? totalItems / totalOrders : 0,
    returningCustomerRevenue,
    newCustomerRevenue,
    topProduct,
  };
}

// ---------------------------------------------------------------------------
// Public: getKPIs
// ---------------------------------------------------------------------------

export async function getKPIs(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<ShopifyKPIs> {
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = daysMap[dateRange] || 30;

  const currentEnd = now.toISOString();
  const currentStart = new Date(now.getTime() - days * 86400000).toISOString();
  const prevEnd = new Date(now.getTime() - days * 86400000).toISOString();
  const prevStart = new Date(now.getTime() - 2 * days * 86400000).toISOString();

  const [currentOrders, prevOrders] = await Promise.all([
    fetchAllOrders(config, currentStart, currentEnd),
    fetchAllOrders(config, prevStart, prevEnd),
  ]);

  const currentMetrics = computeMetrics(currentOrders);
  const prevMetrics = computeMetrics(prevOrders);

  return {
    totalRevenue: currentMetrics.totalRevenue,
    totalOrders: currentMetrics.totalOrders,
    averageOrderValue: currentMetrics.averageOrderValue,
    totalCustomers: currentMetrics.uniqueCustomers,
    repeatCustomerRate: currentMetrics.repeatCustomerRate,
    conversionRate: 0,
    cartAbandonmentRate: 0,
    refundRate: currentMetrics.refundRate,
    averageItemsPerOrder: currentMetrics.averageItemsPerOrder,
    returningCustomerRevenue: currentMetrics.returningCustomerRevenue,
    newCustomerRevenue: currentMetrics.newCustomerRevenue,
    topSellingProduct: currentMetrics.topProduct,
    averageFulfillmentDays: 0,
    prevTotalRevenue: prevMetrics.totalRevenue,
    prevTotalOrders: prevMetrics.totalOrders,
    prevAverageOrderValue: prevMetrics.averageOrderValue,
    prevTotalCustomers: prevMetrics.uniqueCustomers,
  };
}

// ---------------------------------------------------------------------------
// Public: getRevenueOverTime  (updated to include aov per data point)
// ---------------------------------------------------------------------------

export async function getRevenueOverTime(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<(RevenueDataPoint & { aov: number })[]> {
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = daysMap[dateRange] || 30;

  const startDate = new Date(now.getTime() - days * 86400000).toISOString();
  const endDate = now.toISOString();

  const orders = await fetchAllOrders(config, startDate, endDate);

  const byDate: Record<string, { revenue: number; orders: number }> = {};

  // Initialise every day in the range to zero
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - (days - i - 1) * 86400000);
    const key = d.toISOString().split('T')[0];
    byDate[key] = { revenue: 0, orders: 0 };
  }

  for (const order of orders) {
    const createdAt = order.createdAt as string;
    const dateKey = createdAt.split('T')[0];
    const priceSet = order.totalPriceSet as { shopMoney: { amount: string } };
    const price = parseFloat(priceSet?.shopMoney?.amount || '0');

    if (byDate[dateKey]) {
      byDate[dateKey].revenue += price;
      byDate[dateKey].orders += 1;
    }
  }

  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      aov: data.orders > 0 ? data.revenue / data.orders : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Public: getTopProducts
// ---------------------------------------------------------------------------

export async function getTopProducts(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<ShopifyProduct[]> {
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = daysMap[dateRange] || 30;

  const startDate = new Date(now.getTime() - days * 86400000).toISOString();
  const endDate = now.toISOString();

  const orders = await fetchAllOrders(config, startDate, endDate);

  const productMap: Record<string, ShopifyProduct> = {};

  for (const order of orders) {
    const lineItems = order.lineItems as {
      edges: Array<{
        node: {
          title: string;
          quantity: number;
          originalUnitPriceSet: { shopMoney: { amount: string } };
          product: { id: string; title: string; featuredImage?: { url: string } } | null;
        };
      }>;
    };
    if (!lineItems?.edges) continue;

    for (const li of lineItems.edges) {
      const node = li.node;
      const productId = node.product?.id || node.title;
      const productTitle = node.product?.title || node.title;
      const unitPrice = parseFloat(node.originalUnitPriceSet?.shopMoney?.amount || '0');
      const revenue = unitPrice * (node.quantity || 0);

      if (!productMap[productId]) {
        productMap[productId] = {
          id: productId,
          title: productTitle,
          totalRevenue: 0,
          totalUnitsSold: 0,
          totalOrders: 0,
          averagePrice: unitPrice,
          imageUrl: node.product?.featuredImage?.url || null,
        };
      }

      productMap[productId].totalRevenue += revenue;
      productMap[productId].totalUnitsSold += node.quantity || 0;
      productMap[productId].totalOrders += 1;
    }
  }

  return Object.values(productMap)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 15);
}

// ---------------------------------------------------------------------------
// Public: getRecentOrders
// ---------------------------------------------------------------------------

export async function getRecentOrders(
  config: ShopifyConfig,
  limit = 20
): Promise<ShopifyOrder[]> {
  const query = `
    {
      orders(first: ${limit}, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            email
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                }
              }
            }
            customer {
              firstName
              lastName
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(config, query);

  return data.orders.edges.map((edge: { node: Record<string, unknown> }) => {
    const o = edge.node;
    const customer = o.customer as { firstName: string; lastName: string } | null;
    const priceSet = o.totalPriceSet as { shopMoney: { amount: string; currencyCode: string } };
    const lineItems = o.lineItems as { edges: Array<{ node: { title: string } }> };

    return {
      id: o.id,
      name: o.name,
      email: o.email || '',
      totalPrice: parseFloat(priceSet?.shopMoney?.amount || '0'),
      currency: priceSet?.shopMoney?.currencyCode || 'INR',
      financialStatus: o.displayFinancialStatus || 'UNKNOWN',
      fulfillmentStatus: o.displayFulfillmentStatus || 'UNFULFILLED',
      createdAt: o.createdAt,
      lineItemsCount: lineItems?.edges?.length || 0,
      customerName: customer
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        : 'Guest',
    } as ShopifyOrder;
  });
}

// ---------------------------------------------------------------------------
// Public: getCustomerSegments
// ---------------------------------------------------------------------------

export async function getCustomerSegments(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<{
  newVsReturning: { name: string; value: number }[];
  revenueBySegment: { name: string; value: number }[];
  topCustomers: ShopifyCustomer[];
}> {
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = daysMap[dateRange] || 30;

  const startDate = new Date(now.getTime() - days * 86400000).toISOString();
  const endDate = now.toISOString();

  const orders = await fetchAllOrders(config, startDate, endDate);

  let newCount = 0;
  let returningCount = 0;
  let newRevenue = 0;
  let returningRevenue = 0;
  const customerMap: Record<
    string,
    { customer: Record<string, unknown>; totalSpent: number; orderCount: number }
  > = {};

  for (const order of orders) {
    const customer = order.customer as {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      numberOfOrders: number;
      createdAt: string;
      tags: string[];
    } | null;
    const priceSet = order.totalPriceSet as { shopMoney: { amount: string } };
    const price = parseFloat(priceSet?.shopMoney?.amount || '0');

    if (customer?.id) {
      if (customer.numberOfOrders > 1) {
        returningCount++;
        returningRevenue += price;
      } else {
        newCount++;
        newRevenue += price;
      }

      if (!customerMap[customer.id]) {
        customerMap[customer.id] = { customer, totalSpent: 0, orderCount: 0 };
      }
      customerMap[customer.id].totalSpent += price;
      customerMap[customer.id].orderCount += 1;
    }
  }

  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((c) => {
      const cust = c.customer as {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        numberOfOrders: number;
        createdAt: string;
        tags: string[];
      };
      return {
        id: cust.id,
        email: cust.email || '',
        firstName: cust.firstName || '',
        lastName: cust.lastName || '',
        ordersCount: c.orderCount,
        totalSpent: c.totalSpent,
        createdAt: cust.createdAt,
        tags: cust.tags || [],
      };
    });

  return {
    newVsReturning: [
      { name: 'New Customers', value: newCount },
      { name: 'Returning Customers', value: returningCount },
    ],
    revenueBySegment: [
      { name: 'New Customer Revenue', value: newRevenue },
      { name: 'Returning Revenue', value: returningRevenue },
    ],
    topCustomers,
  };
}

// ---------------------------------------------------------------------------
// Public: getOrderStatusBreakdown
// ---------------------------------------------------------------------------

export async function getOrderStatusBreakdown(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<{ name: string; value: number }[]> {
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = daysMap[dateRange] || 30;

  const startDate = new Date(now.getTime() - days * 86400000).toISOString();
  const endDate = now.toISOString();

  const orders = await fetchAllOrders(config, startDate, endDate);

  const statusMap: Record<string, number> = {};
  for (const order of orders) {
    const status = (order.displayFulfillmentStatus as string) || 'UNFULFILLED';
    statusMap[status] = (statusMap[status] || 0) + 1;
  }

  return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
}

// ---------------------------------------------------------------------------
// Internal helpers for getAdvancedCROMetrics
// ---------------------------------------------------------------------------

/** Convert a 0-based UTC hour to a human-readable label like "12am", "1pm" */
function hourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/** Parse a dateRange string (e.g. '30d') into { startDate, endDate, days } */
function parseDateRange(dateRange: string): {
  startDate: string;
  endDate: string;
  days: number;
} {
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = daysMap[dateRange] || 30;
  const startDate = new Date(now.getTime() - days * 86400000).toISOString();
  const endDate = now.toISOString();
  return { startDate, endDate, days };
}

// ---------------------------------------------------------------------------
// Public: getAdvancedCROMetrics
// ---------------------------------------------------------------------------

export async function getAdvancedCROMetrics(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<AdvancedCROMetrics> {
  const { startDate, endDate, days } = parseDateRange(dateRange);
  const now = new Date();

  const orders = await fetchAllOrders(config, startDate, endDate);

  // ── Accumulators ──────────────────────────────────────────────────────────

  // Location
  const countryMap: Record<string, { country: string; countryCode: string; orders: number; revenue: number }> = {};
  const cityKey = (city: string, province: string, country: string) =>
    `${city}||${province}||${country}`;
  const cityMap: Record<string, { city: string; province: string; country: string; orders: number; revenue: number }> = {};

  // Sales channels
  const channelMap: Record<string, { orders: number; revenue: number }> = {};

  // Discount codes
  const discountCodeMap: Record<string, { uses: number; totalDiscount: number }> = {};
  let discountedOrders = 0;
  let totalDiscountGiven = 0;

  // Time analysis — hour (UTC) and day of week
  const hourData: { orders: number; revenue: number }[] = Array.from({ length: 24 }, () => ({
    orders: 0,
    revenue: 0,
  }));
  // Mon=0 … Sun=6  (JS Date: 0=Sun, 1=Mon … 6=Sat → remap: (jsDay + 6) % 7)
  const dowData: { orders: number; revenue: number }[] = Array.from({ length: 7 }, () => ({
    orders: 0,
    revenue: 0,
  }));
  const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // CLV — track per-customer order count and spend within the period
  const customerOrderMap: Record<string, { orders: number; revenue: number }> = {};

  // AOV by date — pre-initialise all days
  const aovDateMap: Record<string, { orders: number; revenue: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - (days - i - 1) * 86400000);
    const key = d.toISOString().split('T')[0];
    aovDateMap[key] = { orders: 0, revenue: 0 };
  }

  // Financial funnel
  let totalOrders = 0;
  let paidOrders = 0;
  let fulfilledOrders = 0;
  let refundedOrders = 0;

  // ── Process orders ─────────────────────────────────────────────────────────

  for (const order of orders) {
    totalOrders++;

    const priceSet = order.totalPriceSet as { shopMoney: { amount: string } };
    const price = parseFloat(priceSet?.shopMoney?.amount || '0');

    const createdAt = order.createdAt as string;
    const orderDate = new Date(createdAt);

    // ── Financial funnel ──
    const financialStatus = (order.displayFinancialStatus as string | null) || '';
    const fulfillmentStatus = (order.displayFulfillmentStatus as string | null) || '';

    if (
      financialStatus === 'PAID' ||
      financialStatus === 'PARTIALLY_PAID' ||
      financialStatus === 'PARTIALLY_REFUNDED'
    ) {
      paidOrders++;
    }
    if (fulfillmentStatus === 'FULFILLED') {
      fulfilledOrders++;
    }
    if (financialStatus === 'REFUNDED' || financialStatus === 'PARTIALLY_REFUNDED') {
      refundedOrders++;
    }

    // ── Location ──
    const shippingAddress = order.shippingAddress as {
      city: string;
      province: string;
      country: string;
      countryCode: string;
    } | null;

    if (shippingAddress?.country) {
      const cc = shippingAddress.countryCode || shippingAddress.country;
      if (!countryMap[cc]) {
        countryMap[cc] = {
          country: shippingAddress.country,
          countryCode: cc,
          orders: 0,
          revenue: 0,
        };
      }
      countryMap[cc].orders++;
      countryMap[cc].revenue += price;

      if (shippingAddress.city) {
        const ck = cityKey(shippingAddress.city, shippingAddress.province, shippingAddress.country);
        if (!cityMap[ck]) {
          cityMap[ck] = {
            city: shippingAddress.city,
            province: shippingAddress.province || '',
            country: shippingAddress.country,
            orders: 0,
            revenue: 0,
          };
        }
        cityMap[ck].orders++;
        cityMap[ck].revenue += price;
      }
    }

    // ── Sales channels ──
    const channelInfo = order.channelInformation as {
      channelDefinition: { handle: string; channelName: string } | null;
    } | null;
    const channelName =
      channelInfo?.channelDefinition?.channelName || 'Online Store';
    if (!channelMap[channelName]) {
      channelMap[channelName] = { orders: 0, revenue: 0 };
    }
    channelMap[channelName].orders++;
    channelMap[channelName].revenue += price;

    // ── Discount codes ── (discountCodes is [String!]! — array of code strings)
    const discountCodes = order.discountCodes as string[] | null;
    const totalDiscountsSet = order.totalDiscountsSet as { shopMoney: { amount: string } } | null;
    const orderDiscount = parseFloat(totalDiscountsSet?.shopMoney?.amount || '0');

    if (discountCodes && discountCodes.length > 0) {
      discountedOrders++;
      totalDiscountGiven += orderDiscount;
      for (const code of discountCodes) {
        const key = code || '(Automatic discount)';
        if (!discountCodeMap[key]) {
          discountCodeMap[key] = { uses: 0, totalDiscount: 0 };
        }
        discountCodeMap[key].uses++;
        discountCodeMap[key].totalDiscount += orderDiscount / discountCodes.length;
      }
    } else if (orderDiscount > 0) {
      // Automatic discount — no code string
      const autoKey = '(Automatic discount)';
      if (!discountCodeMap[autoKey]) {
        discountCodeMap[autoKey] = { uses: 0, totalDiscount: 0 };
      }
      discountCodeMap[autoKey].uses++;
      discountCodeMap[autoKey].totalDiscount += orderDiscount;
      discountedOrders++;
      totalDiscountGiven += orderDiscount;
    }

    // ── Time analysis ──
    const hour = orderDate.getUTCHours(); // 0-23
    hourData[hour].orders++;
    hourData[hour].revenue += price;

    const jsDay = orderDate.getUTCDay(); // 0=Sun … 6=Sat
    const monFirst = (jsDay + 6) % 7; // Mon=0 … Sun=6
    dowData[monFirst].orders++;
    dowData[monFirst].revenue += price;

    // ── CLV ──
    const customer = order.customer as { id: string } | null;
    if (customer?.id) {
      if (!customerOrderMap[customer.id]) {
        customerOrderMap[customer.id] = { orders: 0, revenue: 0 };
      }
      customerOrderMap[customer.id].orders++;
      customerOrderMap[customer.id].revenue += price;
    }

    // ── AOV by date ──
    const dateKey = createdAt.split('T')[0];
    if (aovDateMap[dateKey]) {
      aovDateMap[dateKey].orders++;
      aovDateMap[dateKey].revenue += price;
    }
  }

  // ── Build result objects ───────────────────────────────────────────────────

  // Location
  const byCountry = Object.values(countryMap)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 20);
  const byCity = Object.values(cityMap)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 20);

  // Sales channels
  const salesChannels = Object.entries(channelMap)
    .map(([channel, data]) => ({ channel, ...data }))
    .sort((a, b) => b.orders - a.orders);

  // Discount analysis
  const topCodes = Object.entries(discountCodeMap)
    .map(([code, data]) => ({
      code,
      uses: data.uses,
      totalDiscount: data.totalDiscount,
      avgDiscount: data.uses > 0 ? data.totalDiscount / data.uses : 0,
    }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 20);

  const discountedOrdersRate = totalOrders > 0 ? (discountedOrders / totalOrders) * 100 : 0;
  const avgDiscount = discountedOrders > 0 ? totalDiscountGiven / discountedOrders : 0;

  // Time analysis
  const byHour = hourData.map((data, hour) => ({
    hour,
    label: hourLabel(hour),
    orders: data.orders,
    revenue: data.revenue,
  }));

  const byDayOfWeek = dowData.map((data, idx) => ({
    day: DOW_LABELS[idx],
    dayNum: idx,
    orders: data.orders,
    revenue: data.revenue,
  }));

  // CLV metrics
  const customerValues = Object.values(customerOrderMap);
  const totalCustomers = customerValues.length;
  let sumRevenue = 0;
  let sumOrders = 0;
  let buyOnce = 0;
  let buyTwice = 0;
  let buyThreePlus = 0;

  for (const cv of customerValues) {
    sumRevenue += cv.revenue;
    sumOrders += cv.orders;
    if (cv.orders === 1) buyOnce++;
    else if (cv.orders === 2) buyTwice++;
    else buyThreePlus++;
  }

  const clvMetrics = {
    avgLTV: totalCustomers > 0 ? sumRevenue / totalCustomers : 0,
    avgOrdersPerCustomer: totalCustomers > 0 ? sumOrders / totalCustomers : 0,
    buyOnce,
    buyTwice,
    buyThreePlus,
    totalCustomers,
  };

  // AOV by date
  const aovByDate = Object.entries(aovDateMap)
    .map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue,
      aov: data.orders > 0 ? data.revenue / data.orders : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Financial funnel
  const financialFunnel: { name: string; value: number }[] = [
    { name: 'Total Orders', value: totalOrders },
    { name: 'Paid', value: paidOrders },
    { name: 'Fulfilled', value: fulfilledOrders },
  ];
  if (refundedOrders > 0) {
    financialFunnel.push({ name: 'Refunded', value: refundedOrders });
  }

  return {
    locationBreakdown: { byCountry, byCity },
    salesChannels,
    discountAnalysis: {
      topCodes,
      discountedOrdersRate,
      totalDiscountGiven,
      avgDiscount,
    },
    timeAnalysis: { byHour, byDayOfWeek },
    clvMetrics,
    aovByDate,
    financialFunnel,
  };
}

// ---------------------------------------------------------------------------
// Conversion Funnel
// ---------------------------------------------------------------------------

export async function getOrderConversionFunnel(
  config: ShopifyConfig,
  startDate: string,
  endDate: string
): Promise<ConversionFunnel[]> {
  const orders = await fetchAllOrders(config, startDate, endDate);

  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => (o.financial_status as string) === 'paid').length;
  const fulfilledOrders = orders.filter(
    (o) => (o.fulfillment_status as string) === 'fulfilled'
  ).length;
  const partialOrders = orders.filter(
    (o) => (o.fulfillment_status as string) === 'partial'
  ).length;
  const refundedOrders = orders.filter(
    (o) => (o.financial_status as string) === 'refunded'
  ).length;

  const funnel: ConversionFunnel[] = [
    {
      stage: 'Total Orders',
      count: totalOrders,
      dropoffRate: 0,
    },
    {
      stage: 'Paid',
      count: paidOrders,
      dropoffRate: totalOrders > 0 ? ((totalOrders - paidOrders) / totalOrders) * 100 : 0,
    },
    {
      stage: 'Fulfilled',
      count: fulfilledOrders + partialOrders,
      dropoffRate: paidOrders > 0 ? ((paidOrders - (fulfilledOrders + partialOrders)) / paidOrders) * 100 : 0,
    },
    {
      stage: 'Refunded',
      count: refundedOrders,
      dropoffRate: 0,
    },
  ];

  return funnel;
}
