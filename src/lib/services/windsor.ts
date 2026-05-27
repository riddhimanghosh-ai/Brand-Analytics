/**
 * Windsor.ai connector — drop-in replacement for the Google Ads API service.
 * Returns identical data shapes (GoogleAdsKPIs, GoogleAdsCampaign, GoogleAdsSpendPoint)
 * so the ads route can switch between the two transparently.
 *
 * Windsor docs: https://windsor.ai/connector-api/
 */

import type { GoogleAdsKPIs, GoogleAdsCampaign, GoogleAdsSpendPoint } from './google-ads';

const BASE = 'https://connectors.windsor.ai/all';

// ---- Date helpers ----

function dateParams(dateRange: string): string {
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
    const [from, to] = dateRange.split(':');
    return `date_from=${from}&date_to=${to}`;
  }
  const preset: Record<string, string> = {
    '7d':  'last_7d',
    '30d': 'last_30d',
    '90d': 'last_90d',
  };
  return `date_preset=${preset[dateRange] ?? 'last_30d'}`;
}

interface WindsorRow {
  date?: string;
  campaign?: string;
  clicks?: number;
  spend?: number;
  impressions?: number;
  conversions?: number;
  conversion_value?: number;
  ctr?: number;
  cpc?: number;
  roas?: number;
}

async function query(apiKey: string, fields: string, dateRange: string): Promise<WindsorRow[]> {
  const url = `${BASE}?api_key=${apiKey}&${dateParams(dateRange)}&fields=${fields}&datasource_filter=google_ads`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Windsor API error: ${res.status}`);
  const json = await res.json() as { data?: WindsorRow[]; error?: string };
  if (json.error) throw new Error(`Windsor error: ${json.error}`);
  return json.data ?? [];
}

function n(v: number | undefined) { return v ?? 0; }

// ---- Exports (same signatures as google-ads.ts) ----

export async function getKPIs(apiKey: string, dateRange: string): Promise<GoogleAdsKPIs> {
  const rows = await query(
    apiKey,
    'clicks,spend,impressions,conversions,conversion_value,ctr,cpc,roas',
    dateRange
  );

  let spend = 0, impressions = 0, clicks = 0, conversions = 0, conversionValue = 0;
  for (const r of rows) {
    spend          += n(r.spend);
    impressions    += n(r.impressions);
    clicks         += n(r.clicks);
    conversions    += n(r.conversions);
    conversionValue += n(r.conversion_value);
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
  const rows = await query(
    apiKey,
    'campaign,clicks,spend,impressions,conversions,conversion_value,ctr,cpc,roas',
    dateRange
  );

  // Aggregate by campaign name (Windsor returns one row per day per campaign)
  const map = new Map<string, GoogleAdsCampaign>();
  for (const r of rows) {
    const name = r.campaign ?? 'Unknown';
    const existing = map.get(name);
    if (existing) {
      existing.spend           += n(r.spend);
      existing.impressions     += n(r.impressions);
      existing.clicks          += n(r.clicks);
      existing.conversions     += n(r.conversions);
      existing.conversionValue += n(r.conversion_value);
    } else {
      map.set(name, {
        id: name,
        name,
        status: 'ENABLED',
        spend:           n(r.spend),
        impressions:     n(r.impressions),
        clicks:          n(r.clicks),
        ctr:             0,
        avgCpc:          0,
        conversions:     n(r.conversions),
        conversionValue: n(r.conversion_value),
        roas:            0,
      });
    }
  }

  // Recalculate derived metrics after aggregation
  return Array.from(map.values())
    .map(c => ({
      ...c,
      ctr:   c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      avgCpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      roas:  c.spend > 0 ? c.conversionValue / c.spend : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

export async function getSpendOverTime(apiKey: string, dateRange: string): Promise<GoogleAdsSpendPoint[]> {
  const rows = await query(
    apiKey,
    'date,spend,impressions,clicks,conversions',
    dateRange
  );

  // Aggregate by date
  const map = new Map<string, GoogleAdsSpendPoint>();
  for (const r of rows) {
    const date = r.date ?? '';
    const existing = map.get(date);
    if (existing) {
      existing.spend       += n(r.spend);
      existing.impressions += n(r.impressions);
      existing.clicks      += n(r.clicks);
      existing.conversions += n(r.conversions);
    } else {
      map.set(date, {
        date,
        spend:       n(r.spend),
        impressions: n(r.impressions),
        clicks:      n(r.clicks),
        conversions: n(r.conversions),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
