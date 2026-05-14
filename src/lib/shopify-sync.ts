/**
 * Shopify Incremental Order Sync
 *
 * Caches per-day aggregated order data in MongoDB (`shopify_order_cache`).
 * Historical days are cached indefinitely. Today is always re-fetched because
 * it's a partial day and new orders keep coming in.
 *
 * On a warm cache (day 2+) the "combined" analytics call fetches only today's
 * orders (~1 page, <1s) instead of the full 90-day history (~92 pages, ~40s).
 */

import type { ShopifyKPIs, ShopifyProduct, RevenueDataPoint, ShopifyCustomer } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DayProductEntry {
  id: string;
  title: string;
  revenue: number;
  unitsSold: number;
  orders: number;
  averagePrice: number;
  imageUrl: string | null;
}

export interface DayCustomerEntry {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalSpent: number;   // spent in THIS day
  orderCount: number;   // orders placed in THIS day
  lifetimeOrders: number; // customer.numberOfOrders snapshot at sync time
  createdAt: string;
  tags: string[];
}

export interface DayCacheEntry {
  slug: string;
  date: string;           // YYYY-MM-DD
  syncedAt: string;       // ISO timestamp
  isPartialDay: boolean;  // true = today (more orders may arrive later)

  orderCount: number;      // all orders including VOIDED
  nonVoidedCount: number;  // orders excluding VOIDED (used for KPIs)
  revenue: number;         // sum of totalPrice for non-VOIDED orders
  refunded: number;        // sum of totalRefunded for non-VOIDED orders
  totalItems: number;      // sum of lineItem quantities

  newCustomerRevenue: number;
  returningCustomerRevenue: number;

  financialStatusCounts: Record<string, number>;   // e.g. { PAID: 45, REFUNDED: 2 }
  fulfillmentStatusCounts: Record<string, number>; // e.g. { FULFILLED: 40, UNFULFILLED: 7 }

  products: DayProductEntry[];
  customers: DayCustomerEntry[];
}

// ── MongoDB helpers ────────────────────────────────────────────────────────────

let indexCreated = false;

async function getCacheCollection() {
  const { getDb } = await import('./mongodb-store');
  const db = await getDb();
  const col = db.collection<DayCacheEntry>('shopify_order_cache');

  if (!indexCreated) {
    await col.createIndex({ slug: 1, date: 1 }, { unique: true });
    indexCreated = true;
  }

  return col;
}

export async function loadCachedDays(
  slug: string,
  startDate: string,
  endDate: string,
): Promise<DayCacheEntry[]> {
  try {
    const col = await getCacheCollection();
    const docs = await col.find({ slug, date: { $gte: startDate, $lte: endDate } }).toArray();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return docs.map(({ _id, ...rest }) => rest as DayCacheEntry);
  } catch (err) {
    console.error('[shopify-sync] loadCachedDays error:', err);
    return [];
  }
}

export async function saveDays(slug: string, entries: DayCacheEntry[]): Promise<void> {
  if (!entries.length) return;
  try {
    const col = await getCacheCollection();
    const ops = entries.map((entry) => ({
      replaceOne: {
        filter: { slug, date: entry.date },
        replacement: entry,
        upsert: true,
      },
    }));
    await col.bulkWrite(ops as Parameters<typeof col.bulkWrite>[0], { ordered: false });
  } catch (err) {
    console.error('[shopify-sync] saveDays error:', err);
    // Non-fatal: the in-memory result is still returned to the client
  }
}

export async function clearCachedDays(slug: string): Promise<void> {
  try {
    const col = await getCacheCollection();
    await col.deleteMany({ slug });
    console.log(`[shopify-sync] Cleared cache for ${slug}`);
  } catch (err) {
    console.error('[shopify-sync] clearCachedDays error:', err);
  }
}

// ── Date helpers ───────────────────────────────────────────────────────────────

export function generateDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86_400_000)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ── Build cache entries from raw Shopify orders ───────────────────────────────

/** Group an array of raw orders by date and build DayCacheEntry objects */
export function buildDayCacheEntries(
  slug: string,
  orders: Array<Record<string, unknown>>,
  today: string,
): DayCacheEntry[] {
  const byDate = new Map<string, Array<Record<string, unknown>>>();
  for (const order of orders) {
    const date = (order.createdAt as string)?.split('T')[0];
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(order);
  }

  return Array.from(byDate.entries()).map(([date, dayOrders]) =>
    buildDayEntry(slug, date, dayOrders, date === today),
  );
}

export function emptyDayCacheEntry(
  slug: string,
  date: string,
  isPartialDay: boolean,
): DayCacheEntry {
  return {
    slug, date,
    syncedAt: new Date().toISOString(),
    isPartialDay,
    orderCount: 0, nonVoidedCount: 0,
    revenue: 0, refunded: 0, totalItems: 0,
    newCustomerRevenue: 0, returningCustomerRevenue: 0,
    financialStatusCounts: {},
    fulfillmentStatusCounts: {},
    products: [],
    customers: [],
  };
}

function buildDayEntry(
  slug: string,
  date: string,
  orders: Array<Record<string, unknown>>,
  isPartialDay: boolean,
): DayCacheEntry {
  let orderCount = 0;
  let nonVoidedCount = 0;
  let revenue = 0;
  let refunded = 0;
  let totalItems = 0;
  let newCustomerRevenue = 0;
  let returningCustomerRevenue = 0;
  const financialStatusCounts: Record<string, number> = {};
  const fulfillmentStatusCounts: Record<string, number> = {};
  const productMap = new Map<string, DayProductEntry>();
  const customerMap = new Map<string, DayCustomerEntry>();

  for (const order of orders) {
    orderCount++;

    const financialStatus = (order.displayFinancialStatus as string) || 'UNKNOWN';
    const fulfillmentStatus = (order.displayFulfillmentStatus as string) || 'UNFULFILLED';
    financialStatusCounts[financialStatus] = (financialStatusCounts[financialStatus] || 0) + 1;
    fulfillmentStatusCounts[fulfillmentStatus] = (fulfillmentStatusCounts[fulfillmentStatus] || 0) + 1;

    if (financialStatus === 'VOIDED') continue;
    nonVoidedCount++;

    const price = parseFloat(
      (order.totalPriceSet as { shopMoney: { amount: string } })?.shopMoney?.amount || '0',
    );
    const refund = parseFloat(
      (order.totalRefundedSet as { shopMoney: { amount: string } })?.shopMoney?.amount || '0',
    );
    revenue += price;
    refunded += refund;

    const customer = order.customer as {
      id: string;
      numberOfOrders: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      createdAt?: string;
      tags?: string[];
    } | null;

    if (customer?.id) {
      const isReturning = (customer.numberOfOrders || 0) > 1;
      if (isReturning) {
        returningCustomerRevenue += price;
      } else {
        newCustomerRevenue += price;
      }

      if (!customerMap.has(customer.id)) {
        customerMap.set(customer.id, {
          id: customer.id,
          email: customer.email || '',
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          totalSpent: 0,
          orderCount: 0,
          lifetimeOrders: customer.numberOfOrders || 0,
          createdAt: customer.createdAt || '',
          tags: customer.tags || [],
        });
      }
      const c = customerMap.get(customer.id)!;
      c.totalSpent += price;
      c.orderCount += 1;
    }

    const lineItems = order.lineItems as {
      edges: Array<{
        node: {
          title: string;
          quantity: number;
          originalUnitPriceSet?: { shopMoney: { amount: string } };
          product: { id: string; title: string; featuredImage?: { url: string } } | null;
        };
      }>;
    } | null;

    if (lineItems?.edges) {
      for (const li of lineItems.edges) {
        const node = li.node;
        const qty = node.quantity || 0;
        totalItems += qty;

        const productId = node.product?.id || node.title;
        const productTitle = node.product?.title || node.title;
        const unitPrice = parseFloat(node.originalUnitPriceSet?.shopMoney?.amount || '0');
        const lineRevenue = unitPrice * qty;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            id: productId,
            title: productTitle,
            revenue: 0,
            unitsSold: 0,
            orders: 0,
            averagePrice: unitPrice,
            imageUrl: node.product?.featuredImage?.url || null,
          });
        }
        const p = productMap.get(productId)!;
        p.revenue += lineRevenue;
        p.unitsSold += qty;
        p.orders += 1;
      }
    }
  }

  return {
    slug, date,
    syncedAt: new Date().toISOString(),
    isPartialDay,
    orderCount, nonVoidedCount,
    revenue, refunded, totalItems,
    newCustomerRevenue, returningCustomerRevenue,
    financialStatusCounts,
    fulfillmentStatusCounts,
    products: Array.from(productMap.values()),
    customers: Array.from(customerMap.values()),
  };
}

// ── Compute all analytics metrics from cached entries ─────────────────────────

export type CachedAnalyticsResult = {
  kpis: ShopifyKPIs;
  revenue: (RevenueDataPoint & { aov: number })[];
  products: ShopifyProduct[];
  customers: {
    newVsReturning: { name: string; value: number }[];
    revenueBySegment: { name: string; value: number }[];
    topCustomers: ShopifyCustomer[];
  };
  orderStatus: { name: string; value: number }[];
  conversionFunnel: { stage: string; count: number; dropoffRate: number }[];
};

export function computeFromCache(
  entries: DayCacheEntry[],
  startDate: string,
  endDate: string,
  days: number,
): CachedAnalyticsResult {
  // ── Revenue chart: initialise every day in range to zero ──
  const revenueByDate: Record<string, { revenue: number; orders: number }> = {};
  const startMs = new Date(startDate + 'T00:00:00Z').getTime();
  for (let i = 0; i <= days; i++) {
    const key = new Date(startMs + i * 86_400_000).toISOString().split('T')[0];
    revenueByDate[key] = { revenue: 0, orders: 0 };
  }

  // ── Totals ──
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalRefunded = 0;
  let totalItems = 0;
  let newCustRevenue = 0;
  let returningCustRevenue = 0;

  // ── Customer deduplication ──
  const allCustomerIds = new Set<string>();
  const returningCustomerIds = new Set<string>();

  // ── Status aggregates ──
  const financialStatusCounts: Record<string, number> = {};
  const fulfillmentStatusCounts: Record<string, number> = {};

  // ── Product aggregation across days ──
  const productMap = new Map<string, DayProductEntry>();

  // ── Customer aggregation across days ──
  const customerMap = new Map<string, { data: DayCustomerEntry; totalSpent: number; orderCount: number }>();

  for (const entry of entries) {
    // Revenue chart
    if (revenueByDate[entry.date]) {
      revenueByDate[entry.date].revenue += entry.revenue;
      revenueByDate[entry.date].orders += entry.nonVoidedCount;
    }

    totalRevenue += entry.revenue;
    totalOrders += entry.nonVoidedCount;
    totalRefunded += entry.refunded;
    totalItems += entry.totalItems;
    newCustRevenue += entry.newCustomerRevenue;
    returningCustRevenue += entry.returningCustomerRevenue;

    for (const [s, c] of Object.entries(entry.financialStatusCounts)) {
      financialStatusCounts[s] = (financialStatusCounts[s] || 0) + c;
    }
    for (const [s, c] of Object.entries(entry.fulfillmentStatusCounts)) {
      fulfillmentStatusCounts[s] = (fulfillmentStatusCounts[s] || 0) + c;
    }

    // Products
    for (const p of entry.products) {
      if (!productMap.has(p.id)) {
        productMap.set(p.id, { ...p, revenue: 0, unitsSold: 0, orders: 0 });
      }
      const pm = productMap.get(p.id)!;
      pm.revenue += p.revenue;
      pm.unitsSold += p.unitsSold;
      pm.orders += p.orders;
    }

    // Customers
    for (const c of entry.customers) {
      allCustomerIds.add(c.id);
      if (c.lifetimeOrders > 1) returningCustomerIds.add(c.id);

      if (!customerMap.has(c.id)) {
        customerMap.set(c.id, { data: c, totalSpent: 0, orderCount: 0 });
      }
      const cm = customerMap.get(c.id)!;
      cm.totalSpent += c.totalSpent;
      cm.orderCount += c.orderCount;
      // Keep the most up-to-date customer record
      if (c.lifetimeOrders > cm.data.lifetimeOrders) cm.data = c;
    }
  }

  const uniqueCustomers = allCustomerIds.size;
  const repeatCustomers = returningCustomerIds.size;

  // ── Revenue time series ──
  const revenue = Object.entries(revenueByDate)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      aov: data.orders > 0 ? data.revenue / data.orders : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Products ──
  const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topProductName = sortedProducts[0]?.title || 'N/A';
  const products: ShopifyProduct[] = sortedProducts.slice(0, 15).map((p) => ({
    id: p.id,
    title: p.title,
    totalRevenue: p.revenue,
    totalUnitsSold: p.unitsSold,
    totalOrders: p.orders,
    averagePrice: p.averagePrice,
    imageUrl: p.imageUrl,
  }));

  // ── Top customers ──
  const topCustomers: ShopifyCustomer[] = Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map(({ data, totalSpent, orderCount }) => ({
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      ordersCount: orderCount,
      totalSpent,
      createdAt: data.createdAt,
      tags: data.tags,
    }));

  // ── Order status ──
  const orderStatus = Object.entries(fulfillmentStatusCounts).map(([name, value]) => ({ name, value }));

  // ── Conversion funnel ──
  const paidOrders =
    (financialStatusCounts['PAID'] || 0) +
    (financialStatusCounts['PARTIALLY_PAID'] || 0) +
    (financialStatusCounts['PARTIALLY_REFUNDED'] || 0);
  const fulfilledOrders =
    (fulfillmentStatusCounts['FULFILLED'] || 0) + (fulfillmentStatusCounts['PARTIAL'] || 0);
  const refundedOrders = financialStatusCounts['REFUNDED'] || 0;

  const conversionFunnel = [
    { stage: 'Total Orders', count: totalOrders, dropoffRate: 0 },
    {
      stage: 'Paid',
      count: paidOrders,
      dropoffRate: totalOrders > 0 ? ((totalOrders - paidOrders) / totalOrders) * 100 : 0,
    },
    {
      stage: 'Fulfilled',
      count: fulfilledOrders,
      dropoffRate: paidOrders > 0 ? ((paidOrders - fulfilledOrders) / paidOrders) * 100 : 0,
    },
    { stage: 'Refunded', count: refundedOrders, dropoffRate: 0 },
  ];

  // ── KPIs (prev* fields filled in by caller after fetchPreviousPeriodSummary) ──
  const kpis: ShopifyKPIs = {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalCustomers: uniqueCustomers,
    repeatCustomerRate: uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0,
    conversionRate: 0,
    cartAbandonmentRate: 0,
    refundRate: totalRevenue > 0 ? (totalRefunded / totalRevenue) * 100 : 0,
    averageItemsPerOrder: totalOrders > 0 ? totalItems / totalOrders : 0,
    returningCustomerRevenue: returningCustRevenue,
    newCustomerRevenue: newCustRevenue,
    topSellingProduct: topProductName,
    averageFulfillmentDays: 0,
    prevTotalRevenue: 0,
    prevTotalOrders: 0,
    prevAverageOrderValue: 0,
    prevTotalCustomers: 0,
  };

  return {
    kpis,
    revenue,
    products,
    customers: {
      newVsReturning: [
        { name: 'New Customers', value: uniqueCustomers - repeatCustomers },
        { name: 'Returning Customers', value: repeatCustomers },
      ],
      revenueBySegment: [
        { name: 'New Customer Revenue', value: newCustRevenue },
        { name: 'Returning Revenue', value: returningCustRevenue },
      ],
      topCustomers,
    },
    orderStatus,
    conversionFunnel,
  };
}
