import { NextResponse } from 'next/server';
import { getBrand } from '@/lib/mongodb-store';

const API_VERSION = '2025-10';

async function shopifyGQL(storeUrl: string, token: string, query: string, variables?: Record<string, unknown>) {
  const url = `https://${storeUrl}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Fallback analytics using standard GraphQL (works on ALL Shopify plans) ──
// Parses the ShopifyQL-style query string to figure out what the user wants,
// then fetches data via orders/products/customers APIs and returns the same
// { columns, rows } shape that the chart components expect.

function parseIntent(query: string): string {
  const q = query.toUpperCase();
  if (q.includes('FROM SALES') || (q.includes('TOTAL_SALES') || q.includes('NET_SALES'))) return 'revenue';
  if (q.includes('FROM ORDERS') && q.includes('SOURCE_NAME')) return 'orders_by_source';
  if (q.includes('FROM ORDERS')) return 'orders';
  if (q.includes('FROM PRODUCTS') || q.includes('PRODUCT_TITLE')) return 'top_products';
  if (q.includes('FROM CUSTOMERS') || q.includes('BILLING_COUNTRY')) return 'customers_by_country';
  if (q.includes('FROM CHECKOUTS') || q.includes('DEVICE_TYPE') || q.includes('ABANDONED')) return 'cart_abandonment';
  if (q.includes('FROM FULFILLMENTS') || q.includes('ORDERS_FULFILLED')) return 'fulfillment';
  return 'revenue'; // default
}

function parseDays(query: string): number {
  const m = query.match(/startOfDay\(-(\d+)d\)/i) || query.match(/-(\d+)d/i);
  if (m) return parseInt(m[1]);
  const m2 = query.match(/startOfMonth\(-(\d+)m\)/i);
  if (m2) return parseInt(m2[1]) * 30;
  const m3 = query.match(/startOfYear\(-(\d+)y\)/i);
  if (m3) return parseInt(m3[1]) * 365;
  return 90;
}

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

async function fetchAllOrders(storeUrl: string, token: string, sinceISO: string) {
  const orders: Array<{
    name: string; totalPrice: string; createdAt: string; sourceName: string | null;
    fulfillmentStatus: string | null;
    lineItems: Array<{ title: string; quantity: number; originalUnitPrice: string }>;
    shippingAddress: { country: string | null } | null;
  }> = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const gql = `
      query($after: String, $query: String!) {
        orders(first: 250, after: $after, query: $query, sortKey: CREATED_AT) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name totalPrice createdAt sourceIdentifier
            displayFulfillmentStatus
            lineItems(first: 10) {
              nodes { title quantity originalUnitPrice }
            }
            shippingAddress { country }
          }
        }
      }`;
    const data = await shopifyGQL(storeUrl, token, gql, {
      after: cursor,
      query: `created_at:>='${sinceISO.split('T')[0]}'`,
    });
    const page = data.orders;
    for (const o of page.nodes) {
      orders.push({
        name: o.name,
        totalPrice: o.totalPrice,
        createdAt: o.createdAt,
        sourceName: o.sourceIdentifier || null,
        fulfillmentStatus: o.displayFulfillmentStatus || null,
        lineItems: (o.lineItems?.nodes || []).map((li: { title: string; quantity: number; originalUnitPrice: string }) => ({
          title: li.title,
          quantity: li.quantity,
          originalUnitPrice: li.originalUnitPrice,
        })),
        shippingAddress: o.shippingAddress ? { country: o.shippingAddress.country } : null,
      });
    }
    hasMore = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    if (orders.length >= 2000) break; // safety cap
  }
  return orders;
}

type Order = Awaited<ReturnType<typeof fetchAllOrders>>[0];

function revenueByDay(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    const day = o.createdAt.split('T')[0];
    map[day] = (map[day] || 0) + parseFloat(o.totalPrice);
  }
  const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  return {
    columns: [{ name: 'day', dataType: 'String' }, { name: 'total_sales', dataType: 'Money' }],
    rows: sorted.map(([day, rev]) => [day, rev.toFixed(2)]),
  };
}

function ordersBySource(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    const src = o.sourceName || 'direct';
    map[src] = (map[src] || 0) + 1;
  }
  const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 20);
  return {
    columns: [{ name: 'source_name', dataType: 'String' }, { name: 'orders_count', dataType: 'Int' }],
    rows: sorted.map(([src, cnt]) => [src, String(cnt)]),
  };
}

function topProducts(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    for (const li of o.lineItems) {
      const rev = li.quantity * parseFloat(li.originalUnitPrice || '0');
      map[li.title] = (map[li.title] || 0) + rev;
    }
  }
  const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 20);
  return {
    columns: [{ name: 'product_title', dataType: 'String' }, { name: 'net_sales', dataType: 'Money' }],
    rows: sorted.map(([title, rev]) => [title, rev.toFixed(2)]),
  };
}

function customersByCountry(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    const country = o.shippingAddress?.country || 'Unknown';
    map[country] = (map[country] || 0) + 1;
  }
  const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 20);
  return {
    columns: [{ name: 'billing_country', dataType: 'String' }, { name: 'customer_count', dataType: 'Int' }],
    rows: sorted.map(([country, cnt]) => [country, String(cnt)]),
  };
}

function cartAbandonment(orders: Order[]) {
  // Without checkout API access, show orders by platform as proxy
  const map: Record<string, number> = {};
  for (const o of orders) {
    // sourceIdentifier gives us web/mobile-app/pos etc
    const src = o.sourceName || 'web';
    map[src] = (map[src] || 0) + 1;
  }
  const sorted = Object.entries(map).sort(([, a], [, b]) => b - a);
  return {
    columns: [{ name: 'device_type', dataType: 'String' }, { name: 'orders_count', dataType: 'Int' }],
    rows: sorted.map(([src, cnt]) => [src, String(cnt)]),
  };
}

function fulfillmentStatus(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    const status = o.fulfillmentStatus || 'unfulfilled';
    map[status] = (map[status] || 0) + 1;
  }
  const sorted = Object.entries(map).sort(([, a], [, b]) => b - a);
  return {
    columns: [{ name: 'fulfillment_status', dataType: 'String' }, { name: 'orders_count', dataType: 'Int' }],
    rows: sorted.map(([status, cnt]) => [status, String(cnt)]),
  };
}

export async function POST(request: Request) {
  try {
    const { slug, query } = await request.json();

    if (!slug || !query) {
      return NextResponse.json({ error: 'Missing slug or query' }, { status: 400 });
    }

    const brand = await getBrand(slug);
    if (!brand?.shopifyStoreUrl || !brand?.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const storeUrl = brand.shopifyStoreUrl.replace(/^https?:\/\//, '');

    // ── Try ShopifyQL first (requires read_analytics scope) ──
    // API 2025-10: shopifyqlQuery is a QUERY field (not a mutation).
    // tableData.rows is an array of objects (not rowData array-of-arrays).
    // parseErrors is [String!]! (not [{ code, message }]).
    try {
      const gql = `{
        shopifyqlQuery(query: ${JSON.stringify(query)}) {
          tableData {
            columns { name dataType }
            rows
          }
          parseErrors
        }
      }`;
      const data = await shopifyGQL(storeUrl, brand.shopifyAccessToken, gql);
      const result = data?.shopifyqlQuery as {
        tableData?: { columns: Array<{ name: string; dataType: string }>; rows: unknown };
        parseErrors?: string[];
      } | null;

      if (result?.parseErrors?.length) {
        return NextResponse.json({ error: `Query syntax error: ${result.parseErrors.join('; ')}` }, { status: 400 });
      }

      if (result?.tableData) {
        const columns = result.tableData.columns || [];
        const rawRows = result.tableData.rows;

        // 2025-10: rows is an array of objects keyed by column name.
        // Convert to string[][] that MetricChart expects.
        let rows: string[][] = [];
        if (Array.isArray(rawRows)) {
          rows = (rawRows as Array<Record<string, unknown>>).map(rowObj =>
            columns.map(col => String(rowObj[col.name] ?? ''))
          );
        }

        return NextResponse.json({ columns, rows, source: 'shopifyql' });
      }
    } catch {
      // ShopifyQL not available (missing read_analytics scope) — fall through to orders-based fallback
    }

    // ── Fallback: orders-based analytics (works on ALL plans) ──
    const days = parseDays(query);
    const sinceISO = isoDate(days);
    const intent = parseIntent(query);

    const orders = await fetchAllOrders(storeUrl, brand.shopifyAccessToken, sinceISO);

    let result: { columns: { name: string; dataType: string }[]; rows: string[][] };
    switch (intent) {
      case 'revenue':          result = revenueByDay(orders); break;
      case 'orders_by_source': result = ordersBySource(orders); break;
      case 'top_products':     result = topProducts(orders); break;
      case 'customers_by_country': result = customersByCountry(orders); break;
      case 'cart_abandonment': result = cartAbandonment(orders); break;
      case 'fulfillment':      result = fulfillmentStatus(orders); break;
      default:                 result = revenueByDay(orders);
    }

    return NextResponse.json({ ...result, source: 'orders_api', note: 'ShopifyQL unavailable on this plan — showing orders-based analytics' });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
