// Google Ads API version. Current stable: v21 (as of 2026).
// Google deprecates major versions roughly every 12 months — check
// https://developers.google.com/google-ads/api/docs/release-notes
const API_VERSION = 'v21';

export interface GoogleAdsConfig {
  devToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  /**
   * Manager Account (MCC) customer ID — required when the developer token
   * belongs to an MCC and customerId is a client account under it.
   * Sent as the `login-customer-id` header. Digits only, no hyphens.
   * Optional: omit when the dev token is on the customer account itself.
   */
  loginCustomerId?: string;
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

/** Returns the full WHERE date fragment — e.g. "DURING LAST_30_DAYS" or "BETWEEN '2024-04-01' AND '2024-05-14'" */
function periodClause(dateRange: string): string {
  // Custom range: "YYYY-MM-DD:YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
    const [from, to] = dateRange.split(':');
    return `BETWEEN '${from}' AND '${to}'`;
  }
  const preset = ({ '7d': 'LAST_7_DAYS', '30d': 'LAST_30_DAYS', '90d': 'LAST_90_DAYS' } as Record<string, string>)[dateRange] ?? 'LAST_30_DAYS';
  return `DURING ${preset}`;
}

type AdsRow = Record<string, Record<string, string | number>>;

async function search(
  config: GoogleAdsConfig,
  accessToken: string,
  query: string
): Promise<AdsRow[]> {
  const cid = cleanCustomerId(config.customerId);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': config.devToken,
    'Content-Type': 'application/json',
  };
  // When the dev token comes from a Manager Account (MCC), Google requires
  // the login-customer-id header pointing at the MCC. Without it, queries
  // against a client account fail with USER_PERMISSION_DENIED.
  if (config.loginCustomerId) {
    headers['login-customer-id'] = cleanCustomerId(config.loginCustomerId);
  }

  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${cid}/googleAds:search`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const raw = await res.text();
    // Try to extract a clean JSON error message; fall back to a brief HTML strip.
    let msg = raw;
    try {
      const parsed = JSON.parse(raw);
      msg = parsed?.error?.message ?? parsed?.[0]?.error?.message ?? raw;
    } catch {
      // Not JSON — likely Google's HTML 404 page. Strip tags and trim.
      msg = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    }
    throw new Error(`Google Ads API error (${res.status}): ${msg}`);
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
    WHERE segments.date ${period}
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
    WHERE segments.date ${period}
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
    WHERE segments.date ${period}
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
