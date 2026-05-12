import crypto from 'crypto';

export interface GA4Config {
  propertyId: string;
  /** Service-account JSON (legacy manual setup) */
  serviceAccountJson?: string | null;
  /** OAuth refresh token (from one-click connect flow) */
  refreshToken?: string | null;
}

interface ParsedRow {
  dims: string[];
  metrics: number[];
}

export interface GA4KPIs {
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  pageviews: number;
  pagesPerSession: number;
  transactions: number;
  revenue: number;
  conversionRate: number;
  addToCarts: number;
  checkouts: number;
  prevSessions: number;
  prevUsers: number;
  prevRevenue: number;
  prevTransactions: number;
}

export interface GA4SessionsOverTime {
  date: string;
  sessions: number;
  users: number;
}

export interface GA4TrafficChannel {
  channel: string;
  sessions: number;
  users: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
}

export interface GA4LandingPage {
  page: string;
  sessions: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
}

export interface GA4KeyEvent {
  eventName: string;
  eventCount: number;
  users: number;
}

export interface GA4ConversionFunnel {
  stage: string;
  count: number;
  dropoffRate: number;
}

export interface GA4ProductFunnel {
  stage: string;
  count: number;
  dropoffRate: number;
}

export interface GA4DeviceBreakdown {
  device: string;
  sessions: number;
  percentage: number;
}

export interface GA4TopPage {
  page: string;
  pageviews: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

export interface GA4Country {
  country: string;
  sessions: number;
  users: number;
}

// ---- Auth ----

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

/** Get an access token from a service account JSON (legacy manual setup) */
async function getAccessTokenFromServiceAccount(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    throw new Error(
      `GA4 auth failed: ${tokenData.error_description ?? tokenData.error ?? JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token;
}

/** Get an access token from an OAuth refresh token (one-click connect flow) */
async function getAccessTokenFromRefreshToken(refreshToken: string): Promise<string> {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured on server');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    throw new Error(
      `GA4 OAuth refresh failed: ${tokenData.error_description ?? tokenData.error ?? JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token;
}

/** Get an access token using whichever auth method is configured */
async function getAccessToken(config: GA4Config): Promise<string> {
  if (config.refreshToken) {
    return getAccessTokenFromRefreshToken(config.refreshToken);
  }
  if (config.serviceAccountJson) {
    return getAccessTokenFromServiceAccount(config.serviceAccountJson);
  }
  throw new Error('GA4: no auth credentials configured (need refreshToken or serviceAccountJson)');
}

// ---- Helpers ----

function formatPropertyId(propertyId: string): string {
  return propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
}

function getDateRange(range: string): { startDate: string; endDate: string } {
  // Custom range: "YYYY-MM-DD:YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(range)) {
    const [startDate, endDate] = range.split(':');
    return { startDate, endDate };
  }
  const now = new Date();
  const days = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[range] ?? 30;
  const start = new Date(now.getTime() - days * 86_400_000);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}

function getDays(range: string): number {
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(range)) {
    const [from, to] = range.split(':').map((d) => new Date(d).getTime());
    return Math.round((to - from) / 86_400_000);
  }
  return ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[range] ?? 30;
}

async function runReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
): Promise<{
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
  }>;
}> {
  const propId = formatPropertyId(propertyId);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 report error (${res.status}): ${err}`);
  }

  return res.json();
}

function parseRows(data: {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
  }>;
}): ParsedRow[] {
  if (!data.rows) return [];
  return data.rows.map((row) => ({
    dims: row.dimensionValues?.map((d) => d.value) ?? [],
    metrics: row.metricValues?.map((m) => parseFloat(m.value) || 0) ?? [],
  }));
}

function val(arr: Array<{ value: string }> | undefined, i: number): number {
  return parseFloat(arr?.[i]?.value ?? '0') || 0;
}

// ---- Exported functions ----

export async function getKPIs(config: GA4Config, dateRange: string): Promise<GA4KPIs> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);
  const days = getDays(dateRange);

  const prevEndDate = new Date(new Date(startDate).getTime() - 86_400_000)
    .toISOString()
    .split('T')[0];
  const prevStartDate = new Date(new Date(prevEndDate).getTime() - days * 86_400_000)
    .toISOString()
    .split('T')[0];

  // GA4 limit: max 10 metrics per request — split into 2 parallel calls
  const [current, currentExtra, prev] = await Promise.all([
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViews' },
        { name: 'screenPageViewsPerSession' },
        { name: 'transactions' },
        { name: 'purchaseRevenue' },
        { name: 'sessionConversionRate' },
      ],
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'addToCarts' },
        { name: 'checkouts' },
      ],
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'transactions' },
        { name: 'purchaseRevenue' },
      ],
    }),
  ]);

  const c = current.rows?.[0]?.metricValues ?? [];
  const cx = currentExtra.rows?.[0]?.metricValues ?? [];
  const p = prev.rows?.[0]?.metricValues ?? [];

  return {
    sessions: val(c, 0),
    users: val(c, 1),
    newUsers: val(c, 2),
    bounceRate: val(c, 3) * 100,
    avgSessionDuration: val(c, 4),
    pageviews: val(c, 5),
    pagesPerSession: val(c, 6),
    transactions: val(c, 7),
    revenue: val(c, 8),
    // Use transactions/sessions for purchase conversion rate (sessionConversionRate
    // counts ALL key events including scroll/pageview which inflates it to ~99%)
    conversionRate: val(c, 0) > 0 ? (val(c, 7) / val(c, 0)) * 100 : 0,
    addToCarts: val(cx, 0),
    checkouts: val(cx, 1),
    prevSessions: val(p, 0),
    prevUsers: val(p, 1),
    prevTransactions: val(p, 2),
    prevRevenue: val(p, 3),
  };
}

export async function getSessionsOverTime(
  config: GA4Config,
  dateRange: string
): Promise<GA4SessionsOverTime[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  return parseRows(data).map(({ dims, metrics }) => {
    const d = dims[0]; // YYYYMMDD
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      sessions: metrics[0],
      users: metrics[1],
    };
  });
}

export async function getTrafficChannels(
  config: GA4Config,
  dateRange: string
): Promise<GA4TrafficChannel[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'bounceRate' },
      { name: 'conversions' },
      { name: 'purchaseRevenue' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  return parseRows(data).map(({ dims, metrics }) => ({
    channel: dims[0] || 'Unknown',
    sessions: metrics[0],
    users: metrics[1],
    bounceRate: metrics[2] * 100,
    conversions: metrics[3],
    revenue: metrics[4],
  }));
}

export async function getDeviceBreakdown(
  config: GA4Config,
  dateRange: string
): Promise<GA4DeviceBreakdown[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  const rows = parseRows(data);
  const total = rows.reduce((sum, r) => sum + r.metrics[0], 0);

  return rows.map(({ dims, metrics }) => ({
    device: dims[0].charAt(0).toUpperCase() + dims[0].slice(1),
    sessions: metrics[0],
    percentage: total > 0 ? (metrics[0] / total) * 100 : 0,
  }));
}

export async function getTopPages(
  config: GA4Config,
  dateRange: string
): Promise<GA4TopPage[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 15,
  });

  return parseRows(data).map(({ dims, metrics }) => ({
    page: dims[0],
    pageviews: metrics[0],
    avgTimeOnPage: metrics[1],
    bounceRate: metrics[2] * 100,
  }));
}

export async function getTopCountries(
  config: GA4Config,
  dateRange: string
): Promise<GA4Country[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });

  return parseRows(data).map(({ dims, metrics }) => ({
    country: dims[0],
    sessions: metrics[0],
    users: metrics[1],
  }));
}

export async function getLandingPages(
  config: GA4Config,
  dateRange: string
): Promise<GA4LandingPage[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'conversions' },
      { name: 'purchaseRevenue' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });

  return parseRows(data).map(({ dims, metrics }) => ({
    page: dims[0] || '/',
    sessions: metrics[0],
    bounceRate: metrics[1] * 100,
    conversions: metrics[2],
    revenue: metrics[3],
  }));
}

export async function getKeyEvents(
  config: GA4Config,
  dateRange: string
): Promise<GA4KeyEvent[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const data = await runReport(accessToken, config.propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 25,
  });

  return parseRows(data).map(({ dims, metrics }) => ({
    eventName: dims[0],
    eventCount: metrics[0],
    users: metrics[1],
  }));
}

export async function getConversionFunnel(
  config: GA4Config,
  dateRange: string
): Promise<GA4ConversionFunnel[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const [sessionsData, cartData, checkoutData, purchaseData] = await Promise.all([
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'sessions' }],
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'addToCarts' }],
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'checkouts' }],
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'transactions' }],
    }),
  ]);

  const sessions = val(sessionsData.rows?.[0]?.metricValues, 0);
  const carts = val(cartData.rows?.[0]?.metricValues, 0);
  const checkouts = val(checkoutData.rows?.[0]?.metricValues, 0);
  const purchases = val(purchaseData.rows?.[0]?.metricValues, 0);

  const funnel: GA4ConversionFunnel[] = [
    {
      stage: 'Sessions',
      count: sessions,
      dropoffRate: 0,
    },
    {
      stage: 'Add to Cart',
      count: carts,
      dropoffRate: sessions > 0 ? ((sessions - carts) / sessions) * 100 : 0,
    },
    {
      stage: 'Checkout',
      count: checkouts,
      dropoffRate: carts > 0 ? ((carts - checkouts) / carts) * 100 : 0,
    },
    {
      stage: 'Purchase',
      count: purchases,
      dropoffRate: checkouts > 0 ? ((checkouts - purchases) / checkouts) * 100 : 0,
    },
  ];

  return funnel;
}

export async function getProductConversionFunnel(
  config: GA4Config,
  dateRange: string
): Promise<GA4ProductFunnel[]> {
  const accessToken = await getAccessToken(config);
  const { startDate, endDate } = getDateRange(dateRange);

  const [viewData, cartData, purchaseData] = await Promise.all([
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'screenPageViews' }],
      dimensions: [{ name: 'pagePath' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: 'product' },
        },
      },
      limit: 1000,
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'addToCarts' }],
    }),
    runReport(accessToken, config.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'transactions' }],
    }),
  ]);

  // Sum all product page views across all matching paths
  const views = (viewData.rows ?? []).reduce((sum, row) => sum + val(row.metricValues, 0), 0);
  const carts = val(cartData.rows?.[0]?.metricValues, 0);
  const purchases = val(purchaseData.rows?.[0]?.metricValues, 0);

  const funnel: GA4ProductFunnel[] = [
    {
      stage: 'Product Views',
      count: views,
      dropoffRate: 0,
    },
    {
      stage: 'Add to Cart',
      count: carts,
      dropoffRate: views > 0 ? ((views - carts) / views) * 100 : 0,
    },
    {
      stage: 'Purchase',
      count: purchases,
      dropoffRate: carts > 0 ? ((carts - purchases) / carts) * 100 : 0,
    },
  ];

  return funnel;
}
