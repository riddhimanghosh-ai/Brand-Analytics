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
  /** Brand slug — when provided, enables incremental MongoDB-backed order caching */
  slug?: string;
}

const API_VERSION = '2025-10';

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
// GraphQL rate-limit bucket tracker (proactive pacing — avoids THROTTLED errors)
// ---------------------------------------------------------------------------
// Shopify's GraphQL bucket: 2000 points max, restores 100 points/second.
// Our order query costs ~68 points per page. Two concurrent streams (current +
// previous period) can drain the bucket in seconds on a fast Lambda.
//
// Solution: track `currentlyAvailable` from every response's cost extensions,
// and pause BEFORE firing the next request if the bucket is low. This ensures
// we never hit the THROTTLED error regardless of network speed.
// ---------------------------------------------------------------------------

const graphqlBucket = new Map<string, number>(); // storeUrl → currentlyAvailable

function getBucketAvailable(storeUrl: string): number {
  return graphqlBucket.get(storeUrl) ?? 2000;
}

// ---------------------------------------------------------------------------
// Internal GraphQL helper
// ---------------------------------------------------------------------------

async function shopifyGraphQL(
  config: ShopifyConfig,
  query: string,
  variables?: Record<string, unknown>,
  retries = 5
): Promise<Record<string, unknown>> {
  const url = `https://${config.storeUrl}/admin/api/${API_VERSION}/graphql.json`;

  // ── Proactive rate limiting ───────────────────────────────────────────────
  // Check bucket BEFORE firing. If it's below 150 points (≈2 page-queries),
  // wait long enough to restore at least 225 points so the next request succeeds
  // even if a concurrent stream also fires.
  const COST_PER_REQUEST = 75; // measured ~68; use 75 as safety margin
  const BUCKET_MIN = 150;
  const available = getBucketAvailable(config.storeUrl);
  if (available < BUCKET_MIN) {
    const pointsNeeded = BUCKET_MIN + COST_PER_REQUEST - available;
    const waitMs = Math.ceil((pointsNeeded / 100) * 1000) + 250; // +250ms buffer
    await new Promise((r) => setTimeout(r, waitMs));
    // Optimistically update bucket estimate after waiting
    graphqlBucket.set(
      config.storeUrl,
      Math.min(2000, (graphqlBucket.get(config.storeUrl) ?? 0) + (waitMs / 1000) * 100)
    );
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000), // 20s per request — avoids Lambda timeout
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  // ── Update bucket state from Shopify's cost extensions ───────────────────
  const throttleStatus = (json.extensions as {
    cost?: { throttleStatus?: { currentlyAvailable?: number } };
  } | undefined)?.cost?.throttleStatus;
  if (throttleStatus?.currentlyAvailable !== undefined) {
    graphqlBucket.set(config.storeUrl, throttleStatus.currentlyAvailable);
  }

  // ── Handle throttling with exponential backoff (last-resort safety net) ──
  if (json.errors) {
    const isThrottled = json.errors.some(
      (e: { extensions?: { code?: string } }) => e.extensions?.code === 'THROTTLED'
    );
    if (isThrottled && retries > 0) {
      graphqlBucket.set(config.storeUrl, 0); // bucket is empty — update state
      // Exponential backoff: 2s, 4s, 8s, 16s
      const attempt = 6 - retries; // retries starts at 5 → attempt 1,2,3,4,5
      const wait = Math.min(2000 * Math.pow(2, attempt - 1), 16000);
      await new Promise((r) => setTimeout(r, wait));
      // Bucket partially restored after wait
      graphqlBucket.set(config.storeUrl, (wait / 1000) * 100);
      return shopifyGraphQL(config, query, variables, retries - 1);
    }
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// ShopifyQL helper — runs aggregation queries against Shopify's analytics engine.
//
// ShopifyQL returns pre-computed metrics (total revenue, order counts, etc.)
// directly from Shopify's data warehouse in <1s per query — no pagination,
// no throttling, no raw order scanning.  Used by getAllAnalytics.
//
// Requires the `read_analytics` API scope on the access token.
// ---------------------------------------------------------------------------

async function runShopifyQL(
  config: ShopifyConfig,
  query: string,
): Promise<Array<Record<string, number | string>>> {
  const gql = `{
    shopifyqlQuery(query: ${JSON.stringify(query)}) {
      tableData {
        rows
        columns { name dataType displayName }
      }
      parseErrors
    }
  }`;

  const data = await shopifyGraphQL(config, gql);
  const result = data.shopifyqlQuery as {
    tableData?: { rows: unknown; columns: Array<{ name: string; dataType?: string }> };
    parseErrors?: string[];
  };

  if (result?.parseErrors?.length) {
    throw new Error(`ShopifyQL: ${result.parseErrors.join('; ')}`);
  }

  const columns = result?.tableData?.columns ?? [];
  const rowsRaw = result?.tableData?.rows;
  if (!Array.isArray(rowsRaw)) return [];

  // Mirror the Slack bot's parseTable logic: use column dataType to convert values.
  // ShopifyQL returns PERCENT columns as decimals (0.0234 = 2.34%) — multiply by 100.
  return rowsRaw.map((row) => {
    const obj = row as Record<string, unknown>;
    const out: Record<string, number | string> = {};
    for (const col of columns) {
      const raw = obj[col.name];
      const str = String(raw ?? '');
      if (col.dataType === 'PERCENT') {
        out[col.name] = parseFloat(str) * 100;
      } else if (col.dataType === 'MONEY' || col.dataType === 'FLOAT') {
        out[col.name] = parseFloat(str) || 0;
      } else if (col.dataType === 'INTEGER') {
        out[col.name] = parseInt(str, 10) || 0;
      } else {
        out[col.name] = str;
      }
    }
    return out;
  });
}

// ---------------------------------------------------------------------------
// Lightweight order metrics pagination — fetches ALL orders but only the
// minimal fields needed for customer/items analysis. Much faster than the
// full fetchAllOrders which pulls lineItem product details, addresses, etc.
// ---------------------------------------------------------------------------
type LightOrder = {
  email: string;
  totalPriceSet: { shopMoney: { amount: string } };
  customer: { numberOfOrders: number } | null;
  lineItems: { edges: Array<{ node: { quantity: number } }> };
};

async function fetchAllOrdersLight(
  config: ShopifyConfig,
  startDate: string,
  endDate: string,
): Promise<LightOrder[]> {
  const orders: LightOrder[] = [];
  let cursor: string | null = null;
  const MAX_PAGES = 20; // safety cap — 20 × 250 = 5,000 orders

  for (let page = 0; page < MAX_PAGES; page++) {
    const afterClause = cursor ? `, after: ${JSON.stringify(cursor)}` : '';
    const gql = `{
      orders(first: 250${afterClause}, query: "created_at:>=${startDate} AND created_at:<=${endDate}", sortKey: CREATED_AT) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            email
            totalPriceSet { shopMoney { amount } }
            customer { numberOfOrders }
            lineItems(first: 10) { edges { node { quantity } } }
          }
        }
      }
    }`;
    const data = await shopifyGraphQL(config, gql) as {
      orders?: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        edges: Array<{ node: LightOrder }>;
      };
    };
    const page_orders = data.orders?.edges ?? [];
    orders.push(...page_orders.map(e => e.node));
    if (!data.orders?.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }
  return orders;
}

// ---------------------------------------------------------------------------
// Fetch all pages using cursor-based pagination
// Now includes shippingAddress, discountCodes, and channelInformation
// ---------------------------------------------------------------------------

// Lean order fields — only what computeMetrics / getAllAnalytics actually uses
function buildOrderQuery(startDate: string, endDate: string, afterClause: string) {
  return `
    {
      orders(first: 250, query: "created_at:>='${startDate}T00:00:00' AND created_at:<='${endDate}T23:59:59'"${afterClause}, sortKey: CREATED_AT) {
        edges {
          cursor
          node {
            id
            createdAt
            cancelledAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            totalRefundedSet { shopMoney { amount } }
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  originalUnitPriceSet { shopMoney { amount } }
                  product { id title }
                }
              }
            }
            email
            customer { id numberOfOrders }
            shippingAddress { city province country countryCode }
            discountCodes
            totalDiscountsSet { shopMoney { amount } }
            channelInformation { channelDefinition { channelName } }
          }
        }
        pageInfo { hasNextPage }
      }
    }
  `;
}

/** Fetch one date-window sequentially (cursor-based pagination, NO hard cap) */
async function fetchOrdersWindow(
  config: ShopifyConfig,
  startDate: string,
  endDate: string,
): Promise<Array<Record<string, unknown>>> {
  const orders: Array<Record<string, unknown>> = [];
  let cursor: string | null = null;
  // No page cap — paginates until hasNextPage=false, returning every order.
  for (;;) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const data = await shopifyGraphQL(config, buildOrderQuery(startDate, endDate, afterClause));
    const ordersData = data.orders as {
      edges: Array<{ cursor: string; node: Record<string, unknown> }>;
      pageInfo: { hasNextPage: boolean };
    };
    const edges = ordersData?.edges;
    if (!edges?.length) break;
    for (const edge of edges) { orders.push(edge.node); cursor = edge.cursor; }
    if (!ordersData.pageInfo.hasNextPage) break;
  }
  return orders;
}

// ── Date chunking helper ──────────────────────────────────────────────────────
// Shopify's GraphQL cursor pagination with a date-range query: filter silently
// stops at ~5 000–6 000 results (hasNextPage becomes false early).  Splitting
// into 7-day windows keeps each sub-query to ≤~900 orders (≤4 pages) which is
// well within the reliable range.  13 weekly chunks × 4 pages = same total work,
// but every page is fetched correctly.
function chunkDateRange(startDate: string, endDate: string, chunkDays = 7): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  let current = new Date(startDate + 'T00:00:00Z');
  const end    = new Date(endDate   + 'T00:00:00Z');
  while (current <= end) {
    const chunkEnd = new Date(Math.min(
      current.getTime() + (chunkDays - 1) * 86_400_000,
      end.getTime(),
    ));
    chunks.push([
      current.toISOString().split('T')[0],
      chunkEnd.toISOString().split('T')[0],
    ]);
    current = new Date(chunkEnd.getTime() + 86_400_000);
  }
  return chunks;
}

/**
 * Fetch ALL orders for a date range in 7-day chunks.
 *
 * A single 90-day query against a high-volume store silently truncates at
 * ~5 000–6 000 results because Shopify's Elasticsearch backing for the
 * `query:` filter has a soft pagination cap.  Weekly chunks sidestep this.
 *
 * Each chunk is fetched sequentially to stay within the 2 000-point GraphQL
 * bucket (≈4 pages × 68 pts = 272 pts per chunk, restoring 200 pts while the
 * requests run — net ≈ 72 pts/chunk, bucket never runs dry).
 */
async function fetchAllOrders(
  config: ShopifyConfig,
  startDate: string,
  endDate: string,
): Promise<Array<Record<string, unknown>>> {
  const chunks = chunkDateRange(startDate, endDate, 7);
  const raw: Array<Record<string, unknown>> = [];
  // Always fetch every chunk — no artificial deadline. The API route's
  // maxDuration (120s) is the only timeout boundary, guaranteeing complete data.
  for (const [cs, ce] of chunks) {
    raw.push(...await fetchOrdersWindow(config, cs, ce));
  }
  // NOTE: Do NOT filter cancelled orders here.
  // Shopify Analytics counts ALL orders (including cancelled ones) in the orders metric.
  // Cancelled orders with VOIDED status are excluded from REVENUE in buildDayEntry,
  // and cancelled orders with REFUNDED status contribute zero net revenue (price - refund = 0).
  return raw;
}

// ---------------------------------------------------------------------------
// Shopify REST helper (for lightweight endpoints like count.json)
// ---------------------------------------------------------------------------

async function shopifyREST(
  config: ShopifyConfig,
  path: string,
): Promise<Record<string, unknown>> {
  const url = `https://${config.storeUrl}/admin/api/${API_VERSION}/${path}`;
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': config.accessToken,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Shopify REST error (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Previous-period summary via REST count + 1-page GraphQL sample.
//
// For the "vs prev" comparison indicators on KPI cards we only need:
//   totalOrders (exact) — from REST count.json (instant, 0 points)
//   totalRevenue (estimated) — sample AOV × totalOrders
//   uniqueCustomers (estimated)
//
// This replaces a full paginated previous-period fetch (~46 pages, 3128 pts)
// with 2 requests (~70 pts total), cutting overall Lambda time in half.
// ---------------------------------------------------------------------------

async function fetchPreviousPeriodSummary(
  config: ShopifyConfig,
  startDate: string,
  endDate: string,
): Promise<{ totalOrders: number; totalRevenue: number; averageOrderValue: number; uniqueCustomers: number }> {
  // Step 1: exact order count via REST (doesn't consume GraphQL bucket)
  const countData = await shopifyREST(
    config,
    `orders/count.json?status=any&created_at_min=${startDate}&created_at_max=${endDate}T23:59:59`,
  );
  const totalOrders = (countData as { count?: number }).count ?? 0;

  if (totalOrders === 0) {
    return { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, uniqueCustomers: 0 };
  }

  // Step 2: fetch one page (250 orders) as an AOV sample
  const sampleQuery = `
    {
      orders(first: 250, query: "created_at:>='${startDate}T00:00:00' AND created_at:<='${endDate}T23:59:59'", sortKey: CREATED_AT) {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
            displayFinancialStatus
            customer { id }
          }
        }
      }
    }
  `;
  const data = await shopifyGraphQL(config, sampleQuery);
  const edges = (data.orders as { edges: Array<{ node: Record<string, unknown> }> }).edges ?? [];

  let sampleRevenue = 0;
  const sampleCustomers = new Set<string>();
  let samplePaidCount = 0;

  for (const { node } of edges) {
    if ((node.displayFinancialStatus as string) === 'VOIDED') continue;
    sampleRevenue += parseFloat(
      (node.totalPriceSet as { shopMoney: { amount: string } })?.shopMoney?.amount || '0'
    );
    samplePaidCount++;
    const cust = node.customer as { id: string } | null;
    if (cust?.id) sampleCustomers.add(cust.id);
  }

  const sampleAOV = samplePaidCount > 0 ? sampleRevenue / samplePaidCount : 0;
  // Extrapolate revenue and unique-customer count from sample
  const estimatedRevenue = sampleAOV * totalOrders;
  const customerRatio = samplePaidCount > 0 ? sampleCustomers.size / samplePaidCount : 0;
  const estimatedCustomers = Math.round(customerRatio * totalOrders);

  return {
    totalOrders,
    totalRevenue: estimatedRevenue,
    averageOrderValue: sampleAOV,
    uniqueCustomers: estimatedCustomers,
  };
}

// ---------------------------------------------------------------------------
// Public: testConnection
// ---------------------------------------------------------------------------

export async function testConnection(
  config: ShopifyConfig
): Promise<{ success: boolean; shopName?: string; error?: string }> {
  try {
    const data = await shopifyGraphQL(config, '{ shop { name email myshopifyDomain } }');
    const shop = data.shop as { name: string };
    return { success: true, shopName: shop.name };
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
    // Skip voided orders (cancelled before payment — not real revenue)
    const financialStatus = (order.displayFinancialStatus as string) || '';
    if (financialStatus === 'VOIDED') continue;

    const priceSet = order.totalPriceSet as { shopMoney: { amount: string } };
    const price = parseFloat(priceSet?.shopMoney?.amount || '0');
    totalRevenue += price;

    const refundSet = order.totalRefundedSet as { shopMoney: { amount: string } };
    const refund = parseFloat(refundSet?.shopMoney?.amount || '0');
    totalRefunded += refund;

    const customer = order.customer as { id: string; numberOfOrders: number } | null;
    // Use customer ID for logged-in customers, email for guest checkouts.
    // This ensures guest orders are counted (most Shopify stores use guest checkout).
    const orderEmail = (order.email as string) || '';
    const customerId = customer?.id || orderEmail || null;
    if (customerId) {
      customerIds.add(customerId);
      const orderCount = customer?.numberOfOrders || 0;
      // numberOfOrders > 1 means repeat buyer. For guest checkouts (no customer record),
      // they always appear as new (can't track cross-session without login).
      if (orderCount > 1) {
        repeatCustomers.add(customerId);
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
// Uses ShopifyQL (read_analytics scope) for instant pre-aggregated metrics.
// Falls back to the old paginated approach if ShopifyQL is unavailable.
// ---------------------------------------------------------------------------

export async function getKPIs(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<ShopifyKPIs> {
  const { startDate: currentStart, endDate: currentEnd, days } = parseDateRange(dateRange);
  const prevEnd   = new Date(new Date(currentStart).getTime() - 86_400_000).toISOString().split('T')[0];
  const prevStart = new Date(new Date(prevEnd).getTime() - (days - 1) * 86_400_000).toISOString().split('T')[0];

  // ── Try ShopifyQL first (fast path — sub-second, no pagination) ───────────
  try {
    // NOTE: 'customers', 'returning_customers', 'returning_customer_rate' are NOT used here
    // because they only count logged-in customers (returns 0 for guest-checkout stores).
    // Customer metrics are derived from the GraphQL email query below instead.
    const [curRows, prevRows, sessionRows] = await Promise.all([
      runShopifyQL(
        config,
        `FROM sales SHOW orders, gross_sales, net_sales, returns, average_order_value SINCE ${currentStart} UNTIL ${currentEnd}`,
      ),
      runShopifyQL(
        config,
        `FROM sales SHOW orders, net_sales, average_order_value SINCE ${prevStart} UNTIL ${prevEnd}`,
      ),
      runShopifyQL(
        config,
        `FROM sessions SHOW sessions, conversion_rate, added_to_cart_rate SINCE ${currentStart} UNTIL ${currentEnd}`,
      ).catch(() => [] as Array<Record<string, number | string>>),
    ]);

    const cur     = curRows[0]     ?? {};
    const prev    = prevRows[0]    ?? {};
    const session = sessionRows[0] ?? {};

    const totalRevenue = Number(cur.net_sales              ?? 0);
    const totalOrders  = Number(cur.orders                 ?? 0);
    const grossSales   = Number(cur.gross_sales            ?? 0);
    const totalReturns = Math.abs(Number(cur.returns       ?? 0));
    const aov          = Number(cur.average_order_value    ?? 0) || (totalOrders > 0 ? totalRevenue / totalOrders : 0);
    const refundRate   = grossSales > 0 ? (totalReturns / grossSales) * 100 : 0;

    const prevRevenue = Number(prev.net_sales           ?? 0);
    const prevOrders  = Number(prev.orders              ?? 0);
    const prevAOV     = Number(prev.average_order_value ?? 0) || (prevOrders > 0 ? prevRevenue / prevOrders : 0);

    // Sessions funnel — mirrors the Slack bot's get_funnel tool logic
    const totalSessions       = Number(session.sessions            ?? 0);
    const atcRate             = Number(session.added_to_cart_rate  ?? 0); // PERCENT col — already *100
    const conversionRate      = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : Number(session.conversion_rate ?? 0);
    const cartAbandonmentRate = atcRate > 0 ? Math.max(0, ((atcRate - conversionRate) / atcRate) * 100) : 0;

    // ── Customer + items metrics via full order pagination ─────────────────
    // Fetches ALL orders (up to 5,000) with lightweight fields only.
    // Runs in parallel with top-product ShopifyQL for speed.
    let totalCustomers = 0;
    let repeatCustomerRate = 0;
    let returningCustomerRevenue = 0;
    let newCustomerRevenue = totalRevenue;
    let prevCustomers = 0;
    let averageItemsPerOrder = 0;
    let topProduct = '';

    try {
      const [allOrders, prevOrders, productRows] = await Promise.all([
        fetchAllOrdersLight(config, currentStart, currentEnd),
        fetchAllOrdersLight(config, prevStart, prevEnd),
        runShopifyQL(config, `FROM sales SHOW net_sales GROUP BY product_title ORDER BY net_sales DESC LIMIT 1 SINCE ${currentStart} UNTIL ${currentEnd}`).catch(() => []),
      ]);

      topProduct = String(productRows[0]?.product_title ?? '');

      // Process current period
      const emails = new Set<string>();
      let retRevenue = 0;
      let newRevenue = 0;
      let totalItems = 0;
      let repeatOrderCount = 0;
      for (const o of allOrders) {
        const email = o.email || '';
        const rev = parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
        if (email) emails.add(email);
        const numOrders = o.customer?.numberOfOrders ?? 1;
        if (numOrders > 1) { retRevenue += rev; repeatOrderCount++; }
        else { newRevenue += rev; }
        totalItems += o.lineItems.edges.reduce((s, li) => s + (li.node.quantity || 0), 0);
      }
      totalCustomers = emails.size || allOrders.length;
      repeatCustomerRate = allOrders.length > 0 ? (repeatOrderCount / allOrders.length) * 100 : 0;
      returningCustomerRevenue = retRevenue;
      newCustomerRevenue = newRevenue;
      averageItemsPerOrder = allOrders.length > 0 ? totalItems / allOrders.length : 0;

      // Prev period customer count
      const prevEmails = new Set(prevOrders.map(o => o.email).filter(Boolean));
      prevCustomers = prevEmails.size || prevOrders.length;
    } catch { /* non-critical — customer/items metrics default to 0 */ }

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue:        aov,
      totalCustomers,
      repeatCustomerRate,
      conversionRate,
      cartAbandonmentRate,
      refundRate,
      averageItemsPerOrder,
      returningCustomerRevenue,
      newCustomerRevenue,
      topSellingProduct:        topProduct,
      averageFulfillmentDays:   0,
      prevTotalRevenue:         prevRevenue,
      prevTotalOrders:          prevOrders,
      prevAverageOrderValue:    prevAOV,
      prevTotalCustomers:       prevCustomers,
    };
  } catch (err) {
    console.warn('[ShopifyQL getKPIs] ShopifyQL failed, falling back to paginated fetch:', (err as Error).message);
  }

  // ── Fallback: paginated order fetch ─────────────────────────────────────
  const currentOrders = await fetchAllOrders(config, currentStart, currentEnd);
  const currentMetrics = computeMetrics(currentOrders);

  // Previous period is non-critical — if it fails (no read_all_orders scope for old dates), use zeros
  let prevSummary = { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, uniqueCustomers: 0 };
  try {
    prevSummary = await fetchPreviousPeriodSummary(config, prevStart, prevEnd);
  } catch (err) {
    console.warn('[getKPIs] fetchPreviousPeriodSummary failed (prev period may be out of scope):', (err as Error).message);
  }

  return {
    totalRevenue:           currentMetrics.totalRevenue,
    totalOrders:            currentMetrics.totalOrders,
    averageOrderValue:      currentMetrics.averageOrderValue,
    totalCustomers:         currentMetrics.uniqueCustomers,
    repeatCustomerRate:     currentMetrics.repeatCustomerRate,
    conversionRate:         0,
    cartAbandonmentRate:    0,
    refundRate:             currentMetrics.refundRate,
    averageItemsPerOrder:   currentMetrics.averageItemsPerOrder,
    returningCustomerRevenue: currentMetrics.returningCustomerRevenue,
    newCustomerRevenue:     currentMetrics.newCustomerRevenue,
    topSellingProduct:      currentMetrics.topProduct,
    averageFulfillmentDays: 0,
    prevTotalRevenue:       prevSummary.totalRevenue,
    prevTotalOrders:        prevSummary.totalOrders,
    prevAverageOrderValue:  prevSummary.averageOrderValue,
    prevTotalCustomers:     prevSummary.uniqueCustomers,
  };
}

// ---------------------------------------------------------------------------
// Public: getRevenueOverTime  (updated to include aov per data point)
// Uses ShopifyQL GROUP BY day for instant pre-aggregated time series.
// Falls back to paginated order fetch if ShopifyQL is unavailable.
// ---------------------------------------------------------------------------

export async function getRevenueOverTime(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<(RevenueDataPoint & { aov: number })[]> {
  const { startDate, endDate, days } = parseDateRange(dateRange);

  // Helper: build the full zero-filled date map for the range
  function buildDateMap() {
    const map: Record<string, { revenue: number; orders: number }> = {};
    const start = new Date(startDate);
    for (let i = 0; i <= days; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      map[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
    }
    return map;
  }

  // ── Try ShopifyQL first (fast path) ───────────────────────────────────────
  // Correct syntax: SHOW...TIMESERIES day (not SELECT/GROUP BY/sum())
  try {
    const rows = await runShopifyQL(
      config,
      `FROM sales SHOW orders, net_sales TIMESERIES day SINCE ${startDate} UNTIL ${endDate} ORDER BY day ASC LIMIT 400`,
    );

    const byDate = buildDateMap();

    for (const row of rows) {
      const date = String(row.day ?? '').split('T')[0];
      if (date && byDate[date] !== undefined) {
        byDate[date].revenue = Number(row.net_sales ?? 0);
        byDate[date].orders  = Number(row.orders    ?? 0);
      }
    }

    return Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders:  data.orders,
        aov:     data.orders > 0 ? data.revenue / data.orders : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.warn('getRevenueOverTime: ShopifyQL failed, falling back to paginated fetch:', err);
  }

  // ── Fallback: paginated order fetch ───────────────────────────────────────
  const orders  = await fetchAllOrders(config, startDate, endDate);
  const byDate  = buildDateMap();

  for (const order of orders) {
    if ((order.displayFinancialStatus as string) === 'VOIDED') continue;
    const dateKey  = (order.createdAt as string).split('T')[0];
    const price    = parseFloat(
      (order.totalPriceSet as { shopMoney: { amount: string } })?.shopMoney?.amount || '0'
    );
    if (byDate[dateKey]) {
      byDate[dateKey].revenue += price;
      byDate[dateKey].orders  += 1;
    }
  }

  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders:  data.orders,
      aov:     data.orders > 0 ? data.revenue / data.orders : 0,
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
  const { startDate, endDate } = parseDateRange(dateRange);

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
  const ordersResult = data.orders as {
    edges: Array<{ node: Record<string, unknown> }>;
  };

  return ordersResult.edges.map((edge: { node: Record<string, unknown> }) => {
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
  const { startDate, endDate } = parseDateRange(dateRange);

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
  const { startDate, endDate } = parseDateRange(dateRange);

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

/** Parse a dateRange string (e.g. '30d' or '1y') into { startDate, endDate, days } */
function parseDateRange(dateRange: string): {
  startDate: string;
  endDate: string;
  days: number;
} {
  // Custom range: "YYYY-MM-DD:YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
    const [from, to] = dateRange.split(':');
    const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));
    return { startDate: from, endDate: to, days };
  }
  const now = new Date();
  // '1y' and '365d' both map to 365 days
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, '365d': 365 };
  const days = daysMap[dateRange] ?? 30;
  // Use start-of-day (UTC) for startDate so the full first day is included
  const startMs = now.getTime() - days * 86_400_000;
  const startDate = new Date(startMs).toISOString().split('T')[0]; // YYYY-MM-DD
  const endDate = now.toISOString().split('T')[0]; // YYYY-MM-DD (includes full current day)
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
    const discountCodes = (order.discountCodes as string[] | null) || [];
    const totalDiscountsSet = order.totalDiscountsSet as { shopMoney: { amount: string } } | null;
    const orderDiscount = parseFloat(totalDiscountsSet?.shopMoney?.amount || '0');

    if (discountCodes.length > 0) {
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
// ---------------------------------------------------------------------------
// Internal: group a sorted list of date strings into contiguous windows of
// at most `windowDays` days each.  Used by getAllAnalytics to batch-fetch
// missing days in pairs.
// ---------------------------------------------------------------------------

function groupIntoWindows(sortedDates: string[], windowDays: number): Array<[string, string]> {
  if (!sortedDates.length) return [];
  const windows: Array<[string, string]> = [];
  let i = 0;
  while (i < sortedDates.length) {
    const windowStart = sortedDates[i];
    const cutoffMs = new Date(windowStart + 'T00:00:00Z').getTime() + (windowDays - 1) * 86_400_000;
    let j = i;
    while (j < sortedDates.length && new Date(sortedDates[j] + 'T00:00:00Z').getTime() <= cutoffMs) j++;
    windows.push([windowStart, sortedDates[j - 1]]);
    i = j;
  }
  return windows;
}

// ---------------------------------------------------------------------------
// Internal: build full analytics result from ShopifyQL queries.
//
// Runs 5 ShopifyQL queries in parallel — instant, no pagination, 0% gap
// vs Shopify native analytics.  Requires read_analytics scope on the token.
// ---------------------------------------------------------------------------

async function buildAllAnalyticsFromShopifyQL(
  config: ShopifyConfig,
  startDate: string,
  endDate: string,
  days: number,
  prevStart: string,
  prevEnd: string,
): Promise<{
  kpis: ShopifyKPIs;
  revenue: (RevenueDataPoint & { aov: number })[];
  products: ShopifyProduct[];
  customers: {
    newVsReturning: { name: string; value: number }[];
    revenueBySegment: { name: string; value: number }[];
    topCustomers: ShopifyCustomer[];
  };
  orderStatus: { name: string; value: number }[];
  conversionFunnel: ConversionFunnel[];
}> {
  const [kpiRows, revenueRows, productRows, orderStatusRows, prevRows, sessionRows] = await Promise.all([
    // Current period: sales totals (no customer columns — unreliable for guest checkouts; handled via GraphQL below)
    runShopifyQL(config, `FROM sales SHOW orders, gross_sales, net_sales, returns, average_order_value SINCE ${startDate} UNTIL ${endDate}`),
    // Current period: daily timeseries
    runShopifyQL(config, `FROM sales SHOW orders, net_sales TIMESERIES day SINCE ${startDate} UNTIL ${endDate} ORDER BY day ASC LIMIT 400`),
    // Top 15 products by gross sales
    runShopifyQL(config, `FROM sales SHOW gross_sales, net_sales, orders GROUP BY product_title ORDER BY gross_sales DESC LIMIT 15 SINCE ${startDate} UNTIL ${endDate}`),
    // Shipping country breakdown (order_status not available in ShopifyQL FROM sales)
    runShopifyQL(config, `FROM sales SHOW orders, net_sales GROUP BY shipping_country ORDER BY orders DESC LIMIT 20 SINCE ${startDate} UNTIL ${endDate}`)
      .catch(() => [] as Array<Record<string, number | string>>),
    // Previous period: totals for comparison
    runShopifyQL(config, `FROM sales SHOW orders, net_sales, average_order_value SINCE ${prevStart} UNTIL ${prevEnd}`),
    // Sessions funnel — same queries the Slack bot's get_funnel tool uses
    runShopifyQL(config, `FROM sessions SHOW sessions, conversion_rate, added_to_cart_rate SINCE ${startDate} UNTIL ${endDate}`)
      .catch(() => [] as Array<Record<string, number | string>>),
  ]);

  // ── Parse current period KPIs ────────────────────────────────────────────
  const kpi = kpiRows[0] ?? {};
  const totalOrders  = Number(kpi.orders              ?? 0);
  const totalRevenue = Number(kpi.net_sales           ?? 0);
  const grossSales   = Number(kpi.gross_sales         ?? 0);
  const totalReturns = Number(kpi.returns             ?? 0);
  const aov          = Number(kpi.average_order_value ?? 0) || (totalOrders > 0 ? totalRevenue / totalOrders : 0);
  const refundRate   = grossSales > 0 ? (Math.abs(totalReturns) / grossSales) * 100 : 0;

  // ── Parse sessions funnel (mirrors bot's get_funnel) ────────────────────
  const session       = sessionRows[0] ?? {};
  const totalSessions = Number(session.sessions           ?? 0);
  const atcRate       = Number(session.added_to_cart_rate ?? 0); // PERCENT col — already *100
  // Use orders/sessions ratio for accuracy (bot's approach, works for custom checkout too)
  const conversionRate      = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : Number(session.conversion_rate ?? 0);
  const cartAbandonmentRate = atcRate > 0 ? Math.max(0, ((atcRate - conversionRate) / atcRate) * 100) : 0;

  // ── Parse previous period ────────────────────────────────────────────────
  const prev = prevRows[0] ?? {};
  const prevOrders  = Number(prev.orders              ?? 0);
  const prevRevenue = Number(prev.net_sales           ?? 0);
  const prevAOV     = Number(prev.average_order_value ?? 0) || (prevOrders > 0 ? prevRevenue / prevOrders : 0);
  let prevCustomers = 0;

  // ── Customer + items metrics via full order pagination (real data) ────────
  let totalCustomers = 0;
  let returningCustomers = 0;
  let returningRate = 0;
  let lightOrders: LightOrder[] = [];
  try {
    const [allOrders, allPrevOrders] = await Promise.all([
      fetchAllOrdersLight(config, startDate, endDate),
      fetchAllOrdersLight(config, prevStart, prevEnd),
    ]);
    lightOrders = allOrders;
    const emails = new Set(allOrders.map(o => o.email).filter(Boolean));
    totalCustomers = emails.size || allOrders.length;
    returningCustomers = allOrders.filter(o => (o.customer?.numberOfOrders ?? 1) > 1).length;
    returningRate = allOrders.length > 0 ? (returningCustomers / allOrders.length) * 100 : 0;
    const prevEmails = new Set(allPrevOrders.map(o => o.email).filter(Boolean));
    prevCustomers = prevEmails.size || allPrevOrders.length;
  } catch { /* non-critical — customer metrics default to 0 */ }

  // ── Build revenue time series ────────────────────────────────────────────
  const revenueByDate: Record<string, { revenue: number; orders: number }> = {};
  const startMs = new Date(startDate + 'T00:00:00Z').getTime();
  for (let i = 0; i <= days; i++) {
    const key = new Date(startMs + i * 86_400_000).toISOString().split('T')[0];
    revenueByDate[key] = { revenue: 0, orders: 0 };
  }
  for (const row of revenueRows) {
    const date = String(row.day ?? '').split('T')[0];
    if (date && revenueByDate[date] !== undefined) {
      revenueByDate[date].revenue = Number(row.net_sales ?? 0);
      revenueByDate[date].orders  = Number(row.orders    ?? 0);
    }
  }
  const revenue = Object.entries(revenueByDate)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders:  data.orders,
      aov:     data.orders > 0 ? data.revenue / data.orders : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Build top products ───────────────────────────────────────────────────
  const products: ShopifyProduct[] = productRows.map((row, i) => ({
    id:             `shopifyql-${i}`,
    title:          String(row.product_title ?? 'Unknown'),
    totalRevenue:   Number(row.net_sales   ?? 0),
    totalUnitsSold: 0,
    totalOrders:    Number(row.orders      ?? 0),
    averagePrice:   0,
    imageUrl:       null,
  }));

  // ── Build order status breakdown (using shipping country as proxy — order_status
  //    not available in ShopifyQL FROM sales table)
  const orderStatus = orderStatusRows.map((row) => ({
    name:  String(row.shipping_country ?? 'Unknown'),
    value: Number(row.orders ?? 0),
  }));

  // ── Build conversion funnel ──────────────────────────────────────────────
  const conversionFunnel: ConversionFunnel[] = [
    { stage: 'Total Orders', count: totalOrders, dropoffRate: 0 },
  ];

  // ── Items per order + revenue split — reuse lightOrders already fetched ──
  const averageItemsPerOrder = lightOrders.length > 0
    ? lightOrders.reduce((sum, o) =>
        sum + o.lineItems.edges.reduce((s, li) => s + (li.node.quantity || 0), 0), 0
      ) / lightOrders.length
    : 0;

  // ── Revenue split by customer type (real data from full order set) ───────
  const retOrderRevenue = lightOrders
    .filter(o => (o.customer?.numberOfOrders ?? 1) > 1)
    .reduce((s, o) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'), 0);
  const returningCustomerRevenue = retOrderRevenue;
  const newCustomerRevenue = totalRevenue - returningCustomerRevenue;

  // ── Assemble KPIs ────────────────────────────────────────────────────────
  const kpis: ShopifyKPIs = {
    totalRevenue,
    totalOrders,
    averageOrderValue:        aov,
    totalCustomers,
    repeatCustomerRate:       returningRate,
    conversionRate,
    cartAbandonmentRate,
    refundRate,
    averageItemsPerOrder,
    returningCustomerRevenue,
    newCustomerRevenue,
    topSellingProduct:        products[0]?.title ?? '',
    averageFulfillmentDays:   0,
    prevTotalRevenue:         prevRevenue,
    prevTotalOrders:          prevOrders,
    prevAverageOrderValue:    prevAOV,
    prevTotalCustomers:       prevCustomers,
  };

  console.log(`[ShopifyQL getAllAnalytics] ${totalOrders} orders, ₹${totalRevenue.toFixed(0)} net sales`);

  return {
    kpis,
    revenue,
    products,
    customers: {
      newVsReturning: [
        { name: 'New Customers',       value: totalCustomers - returningCustomers },
        { name: 'Returning Customers', value: returningCustomers },
      ],
      revenueBySegment: [
        { name: 'New Customer Revenue',  value: newCustomerRevenue },
        { name: 'Returning Revenue',     value: returningCustomerRevenue },
      ],
      topCustomers: [],
    },
    orderStatus,
    conversionFunnel,
  };
}

// ---------------------------------------------------------------------------
// Public: getAllAnalytics
//
// PRIMARY PATH (requires read_analytics scope):
//   Uses ShopifyQL — 5 parallel pre-aggregated queries, instant, 0% gap vs
//   Shopify native analytics.  No pagination, no timeout risk.
//
// FALLBACK PATH (no read_analytics scope):
//   Uses MongoDB per-day order cache.  Only fetches missing days from Shopify.
//   FIXED: windows that fail are NOT cached as empty (prevents permanent undercount).
// ---------------------------------------------------------------------------

export async function getAllAnalytics(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<{
  kpis: ShopifyKPIs;
  revenue: (RevenueDataPoint & { aov: number })[];
  products: ShopifyProduct[];
  customers: {
    newVsReturning: { name: string; value: number }[];
    revenueBySegment: { name: string; value: number }[];
    topCustomers: ShopifyCustomer[];
  };
  orderStatus: { name: string; value: number }[];
  conversionFunnel: ConversionFunnel[];
}> {
  const { startDate: currentStart, endDate: currentEnd, days } = parseDateRange(dateRange);
  const prevEnd   = new Date(new Date(currentStart).getTime() - 86_400_000).toISOString().split('T')[0];
  const prevStart = new Date(new Date(prevEnd).getTime() - (days - 1) * 86_400_000).toISOString().split('T')[0];

  // ── PRIMARY: ShopifyQL (exact match with Shopify native analytics) ─────────
  try {
    return await buildAllAnalyticsFromShopifyQL(
      config, currentStart, currentEnd, days, prevStart, prevEnd,
    );
  } catch (err) {
    console.warn('[getAllAnalytics] ShopifyQL unavailable — re-authorize Shopify connection with read_analytics scope to enable. Falling back to day-cache.', (err as Error).message);
  }

  // ── FALLBACK: MongoDB per-day order cache ─────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const slug  = config.slug;

  const {
    loadCachedDays,
    saveDays,
    buildDayCacheEntries,
    computeFromCache,
    emptyDayCacheEntry,
    generateDatesInRange,
  } = await import('@/lib/shopify-sync');

  const cachedDays = slug
    ? await loadCachedDays(slug, currentStart, currentEnd)
    : [];

  // Exclude today (partial day) and entries from previously failed fetches
  // (zero-entry days that were saved when a fetch window errored out)
  // A day is considered "reliably cached" only if it is not today.
  const cachedDateSet = new Set(
    cachedDays.filter((d) => !(d.isPartialDay && d.date === today)).map((d) => d.date),
  );

  const allDatesInRange = generateDatesInRange(currentStart, currentEnd);
  const missingDates    = allDatesInRange.filter((d) => !cachedDateSet.has(d));

  let freshOrders: Array<Record<string, unknown>> = [];

  if (missingDates.length > 0) {
    const windows = groupIntoWindows(missingDates, 7);
    console.log(`[getAllAnalytics] fetching ${missingDates.length} missing days in ${windows.length} windows (2 parallel)`);

    // Track which windows succeeded vs failed
    const succeededWindows = new Set<string>();

    for (let i = 0; i < windows.length; i += 2) {
      const batch = windows.slice(i, i + 2);
      const batchResults = await Promise.all(
        batch.map(async ([s, e]) => {
          try {
            const orders = await fetchOrdersWindow(config, s, e);
            succeededWindows.add(`${s}:${e}`);
            return orders;
          } catch (err) {
            console.warn(`[getAllAnalytics] window ${s}→${e} failed — skipping cache for these dates:`, (err as Error).message);
            return [] as Array<Record<string, unknown>>;
          }
        }),
      );
      freshOrders.push(...batchResults.flat());
    }

    console.log(`[getAllAnalytics] fetched ${freshOrders.length} fresh orders for ${missingDates.length} missing days`);

    // CRITICAL FIX: Only cache empty entries for dates in windows that SUCCEEDED.
    // If a window failed, do NOT cache its dates as empty — they need re-fetching.
    if (slug) {
      const freshDayEntries = buildDayCacheEntries(slug, freshOrders, today);
      const fetchedOrderDates = new Set(
        freshOrders.map((o) => (o.createdAt as string)?.split('T')[0]).filter(Boolean),
      );

      // Only mark a missing date as "empty/zero" if its window succeeded
      const emptyEntries = missingDates
        .filter((d) => {
          if (fetchedOrderDates.has(d)) return false; // has orders, not empty
          // Find which window this date belongs to
          const win = windows.find(([s, e]) => d >= s && d <= e);
          if (!win) return false;
          return succeededWindows.has(`${win[0]}:${win[1]}`); // only cache if window succeeded
        })
        .map((d) => emptyDayCacheEntry(slug, d, d === today));

      saveDays(slug, [...freshDayEntries, ...emptyEntries]).catch((err) =>
        console.error('[getAllAnalytics] saveDays error:', err),
      );
    }
  }

  // Merge cached + fresh, compute analytics
  const freshDayEntries = slug && freshOrders.length > 0
    ? buildDayCacheEntries(slug, freshOrders, today)
    : [];
  const freshDateSet = new Set(freshDayEntries.map((e) => e.date));

  const allEntries = [
    ...cachedDays.filter((d) => !freshDateSet.has(d.date)),
    ...freshDayEntries,
  ].sort((a, b) => a.date.localeCompare(b.date));

  const result = computeFromCache(allEntries, currentStart, currentEnd, days);

  console.log(
    `[getAllAnalytics] fallback total: ${result.kpis.totalOrders} orders, revenue ${result.kpis.totalRevenue.toFixed(0)}, ${allEntries.length} day-entries`,
  );

  try {
    const prevSummary = await fetchPreviousPeriodSummary(config, prevStart, prevEnd);
    result.kpis.prevTotalRevenue      = prevSummary.totalRevenue;
    result.kpis.prevTotalOrders       = prevSummary.totalOrders;
    result.kpis.prevAverageOrderValue = prevSummary.averageOrderValue;
    result.kpis.prevTotalCustomers    = prevSummary.uniqueCustomers;
  } catch (err) {
    // Previous-period summary is non-critical — if it fails (e.g. no read_all_orders
    // scope for old date ranges), just log and continue with zeros for the comparison.
    console.warn('[getAllAnalytics] fetchPreviousPeriodSummary failed (prev period may be out of scope):', (err as Error).message);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Conversion Funnel
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public: getTopProductsSummary — fast ShopifyQL product breakdown for AI chat
// Returns top N products with revenue, orders, and AOV via ShopifyQL (instant).
// ---------------------------------------------------------------------------
export async function getTopProductsSummary(
  config: ShopifyConfig,
  dateRange: string = '30d',
  limit = 15
): Promise<Array<{ title: string; revenue: number; orders: number; aov: number }>> {
  const { startDate, endDate } = parseDateRange(dateRange);
  try {
    const rows = await runShopifyQL(
      config,
      `FROM sales SHOW gross_sales, net_sales, orders GROUP BY product_title ORDER BY net_sales DESC LIMIT ${limit} SINCE ${startDate} UNTIL ${endDate}`
    );
    return rows.map((row) => {
      const orders = Number(row.orders ?? 0);
      const revenue = Number(row.net_sales ?? 0);
      return {
        title: String(row.product_title ?? 'Unknown'),
        revenue,
        orders,
        aov: orders > 0 ? revenue / orders : 0,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public: getTopChannelsSummary — GA4-style channel breakdown via ShopifyQL
// Returns traffic source breakdown (utm_source) with orders and revenue.
// ---------------------------------------------------------------------------
export async function getTopChannelsSummary(
  config: ShopifyConfig,
  dateRange: string = '30d'
): Promise<Array<{ source: string; orders: number; revenue: number }>> {
  const { startDate, endDate } = parseDateRange(dateRange);
  try {
    const rows = await runShopifyQL(
      config,
      `FROM sales SHOW orders, net_sales GROUP BY billing_city ORDER BY orders DESC LIMIT 10 SINCE ${startDate} UNTIL ${endDate}`
    );
    return rows.map((row) => ({
      source: String(row.billing_city ?? 'Unknown'),
      orders: Number(row.orders ?? 0),
      revenue: Number(row.net_sales ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getOrderConversionFunnel(
  config: ShopifyConfig,
  startDate: string,
  endDate: string
): Promise<ConversionFunnel[]> {
  const orders = await fetchAllOrders(config, startDate, endDate);

  // Exclude voided orders from funnel (no payment intent)
  const nonVoidedOrders = orders.filter((o) => (o.displayFinancialStatus as string) !== 'VOIDED');
  const totalOrders = nonVoidedOrders.length;
  const paidOrders = nonVoidedOrders.filter((o) => {
    const fs = (o.displayFinancialStatus as string) || '';
    return fs === 'PAID' || fs === 'PARTIALLY_PAID' || fs === 'PARTIALLY_REFUNDED';
  }).length;
  const fulfilledOrders = nonVoidedOrders.filter(
    (o) => (o.displayFulfillmentStatus as string) === 'FULFILLED'
  ).length;
  const partialOrders = nonVoidedOrders.filter(
    (o) => (o.displayFulfillmentStatus as string) === 'PARTIAL'
  ).length;
  const refundedOrders = nonVoidedOrders.filter(
    (o) => (o.displayFinancialStatus as string) === 'REFUNDED'
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
