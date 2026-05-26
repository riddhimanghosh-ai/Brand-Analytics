import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Exhaustive ShopifyQL constraint table ────────────────────────────────────
// These are the ONLY combinations confirmed to work on Shopify API 2025-10.
// Everything else (FROM orders, FROM products, GROUP BY on sessions, etc.) fails.

const SYSTEM_PROMPT = `You are a ShopifyQL query generator for Shopify API 2025-10.
You must generate ONLY queries that use the exact valid combinations listed below.

═══════════════════════════════════════════════════════
VALID SOURCE 1: FROM sales
═══════════════════════════════════════════════════════
SHOW columns (pick one or more):
  orders, gross_sales, net_sales, returns, average_order_value, total_sales

GROUP BY options (optional, at most one):
  product_title   → breaks down by product name
  shipping_country → breaks down by destination country
  (NO other GROUP BY values exist on sales)

TIMESERIES options (optional, incompatible with GROUP BY):
  TIMESERIES day
  TIMESERIES week
  TIMESERIES month

ORDER BY: any SHOW column, ASC or DESC
LIMIT: any number (use 20 for top-N lists)
DATE: SINCE startOfDay(-7d) | startOfDay(-30d) | startOfDay(-90d) | startOfDay(-365d) UNTIL today

WORKING EXAMPLES for FROM sales:
  Revenue trend:      FROM sales SHOW net_sales TIMESERIES day SINCE startOfDay(-30d) UNTIL today ORDER BY day ASC
  Weekly revenue:     FROM sales SHOW gross_sales, net_sales TIMESERIES week SINCE startOfDay(-90d) UNTIL today ORDER BY week ASC
  Top products:       FROM sales SHOW net_sales, orders GROUP BY product_title ORDER BY net_sales DESC LIMIT 20 SINCE startOfDay(-30d) UNTIL today
  Top countries:      FROM sales SHOW orders, net_sales GROUP BY shipping_country ORDER BY orders DESC LIMIT 20 SINCE startOfDay(-90d) UNTIL today
  AOV trend:          FROM sales SHOW average_order_value TIMESERIES day SINCE startOfDay(-30d) UNTIL today ORDER BY day ASC
  Total summary:      FROM sales SHOW orders, gross_sales, net_sales, returns, average_order_value SINCE startOfDay(-30d) UNTIL today
  Refund analysis:    FROM sales SHOW gross_sales, net_sales, returns SINCE startOfDay(-30d) UNTIL today

═══════════════════════════════════════════════════════
VALID SOURCE 2: FROM sessions
═══════════════════════════════════════════════════════
SHOW columns (pick one or more):
  sessions, online_store_visitors, pageviews, pageviews_per_session,
  bounce_rate, bounces, average_session_duration,
  added_to_cart_rate, sessions_with_cart_additions,
  reached_checkout_rate, sessions_that_reached_checkout,
  checkout_conversion_rate, sessions_that_completed_checkout,
  sessions_that_reached_and_completed_checkout,
  completed_checkout_rate, conversion_rate

WHERE clause (optional): WHERE human_or_bot_session IN ('human')

⚠️ FROM sessions does NOT support GROUP BY — never add it.
⚠️ FROM sessions does NOT support TIMESERIES — never add it.
⚠️ FROM sessions only returns aggregate totals for the date window.

WORKING EXAMPLES for FROM sessions:
  Conversion summary:  FROM sessions SHOW sessions, conversion_rate, added_to_cart_rate SINCE startOfDay(-30d) UNTIL today
  7-day sessions:      FROM sessions SHOW sessions, conversion_rate SINCE startOfDay(-7d) UNTIL today
  Bounce & pageviews:  FROM sessions SHOW sessions, pageviews, bounce_rate, pageviews_per_session SINCE startOfDay(-30d) UNTIL today
  Funnel summary:      FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout SINCE startOfDay(-30d) UNTIL today
  Human sessions only: FROM sessions SHOW sessions, conversion_rate WHERE human_or_bot_session IN ('human') SINCE startOfDay(-30d) UNTIL today

═══════════════════════════════════════════════════════
ABSOLUTE RULES — violating these will produce an error
═══════════════════════════════════════════════════════
❌ NEVER use: FROM orders, FROM products, FROM customers, FROM checkouts, FROM fulfillments
❌ NEVER use GROUP BY with FROM sessions
❌ NEVER use TIMESERIES with FROM sessions
❌ NEVER use GROUP BY with TIMESERIES in the same query (incompatible)
❌ NEVER invent column names — only use the columns listed above
❌ product_title is ONLY valid as a GROUP BY column on FROM sales, NOT as a SHOW column

MAPPING COMMON QUESTIONS:
- "top products" → FROM sales GROUP BY product_title
- "revenue over time" → FROM sales TIMESERIES day
- "conversion rate" → FROM sessions SHOW conversion_rate
- "add to cart rate" → FROM sessions SHOW added_to_cart_rate
- "cart additions" → FROM sessions SHOW sessions_with_cart_additions, added_to_cart_rate
- "checkout rate" → FROM sessions SHOW sessions_that_reached_checkout, reached_checkout_rate
- "checkout conversion" → FROM sessions SHOW sessions_that_completed_checkout, checkout_conversion_rate
- "funnel" → FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout
- "bounce rate" → FROM sessions SHOW sessions, bounce_rate, bounces
- "pageviews" → FROM sessions SHOW pageviews, pageviews_per_session, sessions
- "session duration" → FROM sessions SHOW sessions, average_session_duration
- "visitors" → FROM sessions SHOW online_store_visitors, sessions
- "orders by country" → FROM sales GROUP BY shipping_country
- "refund rate" → FROM sales SHOW gross_sales, net_sales, returns
- "AOV trend" → FROM sales SHOW average_order_value TIMESERIES day
- "best selling country" → FROM sales GROUP BY shipping_country ORDER BY orders DESC
- "weekly sales" → FROM sales SHOW net_sales TIMESERIES week

═══════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════
Respond with ONLY valid JSON (no markdown fences, no extra text):
{ "query": "<exact ShopifyQL query>", "chartType": "line" | "bar" | "table", "explanation": "<one sentence>" }

chartType guidance:
- "line" → queries with TIMESERIES (trend over time)
- "bar"  → queries with GROUP BY (ranking/comparison)
- "table" → aggregate totals without grouping (FROM sessions, summary FROM sales)

If the question cannot be answered with these constraints:
{ "error": "<short explanation of why, suggest what they CAN ask instead>" }`;

// ── Rule-based validator ──────────────────────────────────────────────────────
function validateQuery(query: string): string | null {
  const q = query.toUpperCase().trim();

  // Must start with FROM
  if (!q.startsWith('FROM ')) return 'Query must start with FROM';

  // Only valid FROM sources
  const fromMatch = q.match(/^FROM\s+(\w+)/);
  const source = fromMatch?.[1];
  if (!source || !['SALES', 'SESSIONS'].includes(source)) {
    return `"FROM ${source?.toLowerCase()}" is not a valid data source. Use "FROM sales" or "FROM sessions"`;
  }

  if (source === 'SESSIONS') {
    if (q.includes('GROUP BY')) {
      return '"FROM sessions" does not support GROUP BY. Use "FROM sales GROUP BY product_title" for product breakdowns';
    }
    if (q.includes('TIMESERIES')) {
      return '"FROM sessions" does not support TIMESERIES';
    }
  }

  if (source === 'SALES') {
    if (q.includes('GROUP BY') && q.includes('TIMESERIES')) {
      return 'Cannot combine GROUP BY and TIMESERIES in the same query';
    }
    // Check GROUP BY column validity
    const gbMatch = query.match(/GROUP\s+BY\s+(\w+)/i);
    if (gbMatch) {
      const col = gbMatch[1].toLowerCase();
      if (!['product_title', 'shipping_country'].includes(col)) {
        return `"${col}" is not a valid GROUP BY column. Use "product_title" or "shipping_country"`;
      }
    }
  }

  // Check for forbidden FROM sources explicitly mentioned
  for (const bad of ['ORDERS', 'PRODUCTS', 'CUSTOMERS', 'CHECKOUTS', 'FULFILLMENTS']) {
    if (q.includes(`FROM ${bad}`)) {
      return `"FROM ${bad.toLowerCase()}" is not supported. Use "FROM sales" or "FROM sessions"`;
    }
  }

  return null; // valid
}

// ─────────────────────────────────────────────────────────────────────────────

async function callClaude(question: string, extraContext = ''): Promise<{ query?: string; chartType?: string; explanation?: string; error?: string }> {
  const userMsg = extraContext ? `${question}\n\n[Previous attempt failed: ${extraContext}]` : question;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
}

export async function POST(request: Request) {
  try {
    const { question, slug } = await request.json();

    if (!question || !slug) {
      return NextResponse.json({ error: 'Missing question or slug' }, { status: 400 });
    }

    // ── First attempt ────────────────────────────────────────────────────────
    let parsed: { query?: string; chartType?: string; explanation?: string; error?: string };
    try {
      parsed = await callClaude(question);
    } catch {
      return NextResponse.json({ error: 'AI returned an invalid response. Please rephrase your question.' }, { status: 500 });
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error });
    }

    if (!parsed.query) {
      return NextResponse.json({ error: 'Could not generate a query for this question.' });
    }

    // ── Validate the generated query ─────────────────────────────────────────
    const validationError = validateQuery(parsed.query);
    if (validationError) {
      // Retry once with the validation error as context
      try {
        parsed = await callClaude(question, validationError);
      } catch {
        return NextResponse.json({ error: `Could not generate a valid query: ${validationError}` });
      }

      if (parsed.error) {
        return NextResponse.json({ error: parsed.error });
      }

      if (!parsed.query) {
        return NextResponse.json({ error: `Could not generate a valid query for this question. ${validationError}` });
      }

      // Check again after retry
      const retryValidationError = validateQuery(parsed.query);
      if (retryValidationError) {
        return NextResponse.json({ error: `This question can't be answered with ShopifyQL. ${retryValidationError}. Try asking about revenue, top products, orders by country, AOV trends, or conversion rate.` });
      }
    }

    return NextResponse.json({
      query: parsed.query,
      chartType: parsed.chartType || 'bar',
      explanation: parsed.explanation || '',
    });
  } catch (error) {
    console.error('Metrics generate error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
