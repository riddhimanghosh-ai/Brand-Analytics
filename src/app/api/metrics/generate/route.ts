import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a ShopifyQL query generator. Convert natural language questions into valid ShopifyQL queries.

ShopifyQL rules:
- Valid FROM sources: sales, sessions
- FROM sales valid columns (SHOW): orders, total_sales, gross_sales, net_sales, returns, average_order_value
- FROM sales valid GROUP BY: product_title, shipping_country
- FROM sessions valid columns (SHOW): sessions, conversion_rate, added_to_cart_rate
- Date syntax: SINCE startOfDay(-30d) UNTIL today  (use -7d, -30d, -90d, or -365d)
- Time series: TIMESERIES day  or  TIMESERIES week
- Example: FROM sales SHOW net_sales TIMESERIES day SINCE startOfDay(-30d) UNTIL today ORDER BY day ASC

Chart type guidance:
- "line" for time-series queries (those with TIMESERIES)
- "bar" for grouped data (those with GROUP BY)
- "table" for multi-column non-visual data

Respond with ONLY valid JSON in this exact format:
{ "query": "<ShopifyQL query>", "chartType": "line" | "bar" | "table", "explanation": "<brief explanation>" }

If you cannot generate a valid query, respond with:
{ "error": "<reason why the question cannot be answered with ShopifyQL>" }`;

export async function POST(request: Request) {
  try {
    const { question, slug } = await request.json();

    if (!question || !slug) {
      return NextResponse.json({ error: 'Missing question or slug' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: question },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed: { query?: string; chartType?: string; explanation?: string; error?: string };
    try {
      // Strip markdown code fences if present
      const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'AI returned an invalid response. Please rephrase your question.' }, { status: 500 });
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error });
    }

    if (!parsed.query) {
      return NextResponse.json({ error: 'Could not generate a query for this question.' });
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
