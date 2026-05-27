/**
 * Synter Media AI — Google Ads data via MCP/REST.
 * Uses pull_google_ads_performance tool which calls the real Google Ads API.
 * Returns same data shapes as google-ads.ts so the ads route is drop-in compatible.
 */

import type { GoogleAdsKPIs, GoogleAdsCampaign, GoogleAdsSpendPoint } from './google-ads';

const MCP_URL = 'https://mcp.syntermedia.ai';

// ---- Date range helpers ----

function synterDateRange(dateRange: string): string {
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
    // Custom range not directly supported as preset — use LAST_30_DAYS as fallback
    // Synter supports custom via date_from/date_to but pull_google_ads_performance uses date_range enum
    return 'LAST_30_DAYS';
  }
  const map: Record<string, string> = {
    '7d':  'LAST_7_DAYS',
    '30d': 'LAST_30_DAYS',
    '90d': 'LAST_90_DAYS',
  };
  return map[dateRange] ?? 'LAST_30_DAYS';
}

interface SynterCampaign {
  id: string;
  name: string;
  status: string;
  channel_type: string;
  daily_budget: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

interface SynterResponse {
  success: boolean;
  customer_id: string;
  date_range: { start: string; end: string };
  count: number;
  campaigns: SynterCampaign[];
  error?: string;
}

async function callTool(apiKey: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'X-Synter-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`Synter API error: ${res.status}`);
  const json = await res.json() as {
    result?: { content: Array<{ text: string }> };
    error?: { message: string };
  };
  if (json.error) throw new Error(`Synter error: ${json.error.message}`);
  const text = json.result?.content?.[0]?.text;
  if (!text) throw new Error('Synter: empty response');
  return JSON.parse(text);
}

async function fetchCampaigns(apiKey: string, dateRange: string): Promise<SynterCampaign[]> {
  const data = await callTool(apiKey, 'pull_google_ads_performance', {
    date_range: synterDateRange(dateRange),
    metrics: ['clicks', 'impressions', 'cost_micros', 'conversions', 'conversions_value', 'ctr', 'average_cpc'],
    dimensions: ['campaign'],
  }) as SynterResponse;

  if (!data.success) throw new Error(data.error ?? 'Synter: pull failed');
  return data.campaigns ?? [];
}

// ---- Exports ----

export async function getKPIs(apiKey: string, dateRange: string): Promise<GoogleAdsKPIs> {
  const campaigns = await fetchCampaigns(apiKey, dateRange);

  let spend = 0, impressions = 0, clicks = 0, conversions = 0, conversionValue = 0;
  for (const c of campaigns) {
    spend          += c.cost ?? 0;
    impressions    += c.impressions ?? 0;
    clicks         += c.clicks ?? 0;
    conversions    += c.conversions ?? 0;
    conversionValue += c.conversion_value ?? 0;
  }

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    avgCpc: clicks > 0 ? spend / clicks : 0,
    conversions,
    conversionValue,
    roas: spend > 0 ? conversionValue / spend : 0,
    costPerConversion: conversions > 0 ? spend / conversions : 0,
  };
}

export async function getCampaigns(apiKey: string, dateRange: string): Promise<GoogleAdsCampaign[]> {
  const campaigns = await fetchCampaigns(apiKey, dateRange);

  return campaigns
    .filter(c => c.cost > 0 || c.status === 'ENABLED')
    .map(c => ({
      id: String(c.id),
      name: c.name,
      status: c.status,
      spend: c.cost,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr,
      avgCpc: c.cpc,
      conversions: c.conversions,
      conversionValue: c.conversion_value,
      roas: c.roas,
    }))
    .sort((a, b) => b.spend - a.spend);
}

export async function getSpendOverTime(apiKey: string, dateRange: string): Promise<GoogleAdsSpendPoint[]> {
  // Synter's pull_google_ads_performance aggregates at campaign level, not daily.
  // For spend-over-time we return a single aggregated point as fallback.
  // TODO: use daily breakdown when Synter exposes date dimension.
  const kpis = await getKPIs(apiKey, dateRange);
  const today = new Date().toISOString().split('T')[0];
  return [{ date: today, spend: kpis.spend, impressions: kpis.impressions, clicks: kpis.clicks, conversions: kpis.conversions }];
}
