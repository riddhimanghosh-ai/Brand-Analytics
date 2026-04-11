export interface GoogleAdsConfig {
  devToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
}

export interface GoogleAdsKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  costPerConversion: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
}

export interface GoogleAdsSpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

// ---- Helpers ----

async function getAccessToken(config: GoogleAdsConfig): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      `Google Ads auth failed: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }

  return data.access_token;
}

function cleanCustomerId(id: string): string {
  return id.replace(/-/g, '');
}

function periodClause(dateRange: string): string {
  return (
    ({ '7d': 'LAST_7_DAYS', '30d': 'LAST_30_DAYS', '90d': 'LAST_90_DAYS' } as Record<
      string,
      string
    >)[dateRange] ?? 'LAST_30_DAYS'
  );
}

type AdsRow = Record<string, Record<string, string | number>>;

async function search(
  config: GoogleAdsConfig,
  accessToken: string,
  query: string
): Promise<AdsRow[]> {
  const cid = cleanCustomerId(config.customerId);
  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${cid}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': config.devToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { results?: AdsRow[] };
  return data.results ?? [];
}

function micros(value: string | number | undefined): number {
  return (parseInt(String(value ?? '0')) || 0) / 1_000_000;
}

function num(value: string | number | undefined): number {
  return parseInt(String(value ?? '0')) || 0;
}

function flt(value: string | number | undefined): number {
  return parseFloat(String(value ?? '0')) || 0;
}

// ---- Exports ----

export async function getKPIs(
  config: GoogleAdsConfig,
  dateRange: string
): Promise<GoogleAdsKPIs> {
  const accessToken = await getAccessToken(config);
  const period = periodClause(dateRange);

  const query = `
    SELECT
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date DURING ${period}
  `;

  const results = await search(config, accessToken, query);

  let spendMicros = 0,
    impressions = 0,
    clicks = 0,
    conversions = 0,
    conversionValue = 0;

  for (const r of results) {
    const m = r.metrics as Record<string, string>;
    spendMicros += parseInt(m.cost_micros ?? '0') || 0;
    impressions += parseInt(m.impressions ?? '0') || 0;
    clicks += parseInt(m.clicks ?? '0') || 0;
    conversions += parseFloat(m.conversions ?? '0') || 0;
    conversionValue += parseFloat(m.conversions_value ?? '0') || 0;
  }

  const spend = spendMicros / 1_000_000;

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

export async function getCampaigns(
  config: GoogleAdsConfig,
  dateRange: string
): Promise<GoogleAdsCampaign[]> {
  const accessToken = await getAccessToken(config);
  const period = periodClause(dateRange);

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING ${period}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  const results = await search(config, accessToken, query);

  return results.map((r) => {
    const camp = r.campaign as Record<string, string>;
    const m = r.metrics as Record<string, string>;
    const spend = micros(m.cost_micros);
    const convValue = flt(m.conversions_value);

    return {
      id: String(camp.id),
      name: camp.name,
      status: camp.status,
      spend,
      impressions: num(m.impressions),
      clicks: num(m.clicks),
      ctr: flt(m.ctr) * 100,
      avgCpc: micros(m.average_cpc),
      conversions: flt(m.conversions),
      conversionValue: convValue,
      roas: spend > 0 ? convValue / spend : 0,
    };
  });
}

export async function getSpendOverTime(
  config: GoogleAdsConfig,
  dateRange: string
): Promise<GoogleAdsSpendPoint[]> {
  const accessToken = await getAccessToken(config);
  const period = periodClause(dateRange);

  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM customer
    WHERE segments.date DURING ${period}
    ORDER BY segments.date ASC
  `;

  const results = await search(config, accessToken, query);

  return results.map((r) => {
    const seg = r.segments as Record<string, string>;
    const m = r.metrics as Record<string, string>;
    return {
      date: seg.date,
      spend: micros(m.cost_micros),
      impressions: num(m.impressions),
      clicks: num(m.clicks),
      conversions: flt(m.conversions),
    };
  });
}
