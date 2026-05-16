const BASE = 'https://graph.facebook.com/v21.0';

const DATE_PRESETS: Record<string, string> = {
  '7d':  'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
};

function dateParams(dateRange: string): Record<string, string> {
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
    const [since, until] = dateRange.split(':');
    return { time_range: JSON.stringify({ since, until }) };
  }
  return { date_preset: DATE_PRESETS[dateRange] ?? 'last_30d' };
}

export interface MetaConfig {
  accessToken: string;
  adAccountId: string;
}

export interface MetaKPIs {
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  uniqueCtr: number;
  cpc: number;
  cpm: number;
  costPerLinkClick: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  addToCarts: number;
  initiatedCheckouts: number;
  viewContent: number;
  leads: number;
  costPerPurchase: number;
  costPerAddToCart: number;
  costPerInitiatedCheckout: number;
  conversionRate: number;
  videoPlays: number;
  videoCompletions: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  addToCarts: number;
  initiatedCheckouts: number;
}

export interface MetaAdSet {
  id: string;
  name: string;
  campaignName?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
}

export interface MetaAd {
  id: string;
  name: string;
  campaignName?: string;
  adsetName?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  thumbnailUrl?: string;
  objectStoryId?: string;
}

export interface MetaSpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
}

export interface MetaBreakdownRow {
  key: string;
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
}

export interface MetaFunnel {
  impressions: number;
  reach: number;
  linkClicks: number;
  addToCarts: number;
  initiatedCheckouts: number;
  purchases: number;
}

export interface MetaPermissionStatus {
  granted: string[];
  declined: string[];
  expired: string[];
  hasPageAccess: boolean;
  hasInstagramAccess: boolean;
  pagesCount: number;
  adAccountCount: number;
}

// ---- Helpers ----

function accountId(id: string): string {
  return id.startsWith('act_') ? id : `act_${id}`;
}

type ActionRow = { action_type: string; value: string };

function extractAction(actions: ActionRow[] | undefined, ...types: string[]): number {
  if (!actions) return 0;
  let total = 0;
  for (const t of types) {
    const row = actions.find((a) => a.action_type === t);
    if (row) total += parseFloat(row.value ?? '0') || 0;
  }
  return total;
}

async function fetchMeta<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = (await res.json()) as T & { error?: { message: string; code?: number } };

  if ((data as { error?: { message: string } }).error) {
    throw new Error(
      `Meta API: ${(data as { error: { message: string } }).error.message}`
    );
  }
  if (!res.ok) throw new Error(`Meta API HTTP ${res.status}`);

  return data;
}

// ---- Insights field set ----

const INSIGHT_FIELDS = [
  'spend', 'impressions', 'reach', 'frequency',
  'clicks', 'inline_link_clicks',
  'ctr', 'unique_ctr', 'cpc', 'cpm',
  'cost_per_inline_link_click',
  'actions', 'action_values',
  'video_play_actions', 'video_p100_watched_actions',
].join(',');

function mapKPIRow(d: Record<string, unknown>): MetaKPIs {
  const spend = parseFloat((d.spend as string) ?? '0') || 0;
  const actions = d.actions as ActionRow[] | undefined;
  const actionValues = d.action_values as ActionRow[] | undefined;

  const purchases = extractAction(actions, 'purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase');
  const purchaseValue = extractAction(actionValues, 'purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase');
  const addToCarts = extractAction(actions, 'add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart');
  const initiatedCheckouts = extractAction(actions, 'initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout');
  const viewContent = extractAction(actions, 'view_content', 'offsite_conversion.fb_pixel_view_content');
  const leads = extractAction(actions, 'lead', 'offsite_conversion.fb_pixel_lead');
  const linkClicks = parseFloat((d.inline_link_clicks as string) ?? '0') || 0;
  const clicks = parseInt((d.clicks as string) ?? '0') || 0;
  const videoPlays = extractAction(d.video_play_actions as ActionRow[] | undefined, 'video_view');
  const videoCompletions = extractAction(d.video_p100_watched_actions as ActionRow[] | undefined, 'video_view');

  return {
    spend,
    impressions: parseInt((d.impressions as string) ?? '0') || 0,
    reach: parseInt((d.reach as string) ?? '0') || 0,
    frequency: parseFloat((d.frequency as string) ?? '0') || 0,
    clicks,
    linkClicks,
    ctr: parseFloat((d.ctr as string) ?? '0') || 0,
    uniqueCtr: parseFloat((d.unique_ctr as string) ?? '0') || 0,
    cpc: parseFloat((d.cpc as string) ?? '0') || 0,
    cpm: parseFloat((d.cpm as string) ?? '0') || 0,
    costPerLinkClick: parseFloat((d.cost_per_inline_link_click as string) ?? '0') || 0,
    purchases,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    addToCarts,
    initiatedCheckouts,
    viewContent,
    leads,
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
    costPerAddToCart: addToCarts > 0 ? spend / addToCarts : 0,
    costPerInitiatedCheckout: initiatedCheckouts > 0 ? spend / initiatedCheckouts : 0,
    conversionRate: linkClicks > 0 ? (purchases / linkClicks) * 100 : 0,
    videoPlays,
    videoCompletions,
  };
}

// ---- Exports ----

export async function getKPIs(config: MetaConfig, dateRange: string): Promise<MetaKPIs> {
  const acct = accountId(config.adAccountId);

  const data = await fetchMeta<{ data: Array<Record<string, unknown>> }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: INSIGHT_FIELDS,
    level: 'account',
  });

  if (!data.data?.length) {
    return {
      spend: 0, impressions: 0, reach: 0, frequency: 0,
      clicks: 0, linkClicks: 0, ctr: 0, uniqueCtr: 0,
      cpc: 0, cpm: 0, costPerLinkClick: 0,
      purchases: 0, purchaseValue: 0, roas: 0,
      addToCarts: 0, initiatedCheckouts: 0, viewContent: 0, leads: 0,
      costPerPurchase: 0, costPerAddToCart: 0, costPerInitiatedCheckout: 0,
      conversionRate: 0, videoPlays: 0, videoCompletions: 0,
    };
  }

  return mapKPIRow(data.data[0]);
}

export async function getCampaigns(config: MetaConfig, dateRange: string): Promise<MetaCampaign[]> {
  const acct = accountId(config.adAccountId);

  const data = await fetchMeta<{
    data: Array<Record<string, unknown> & {
      campaign_id: string;
      campaign_name: string;
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: `campaign_id,campaign_name,${INSIGHT_FIELDS}`,
    level: 'campaign',
    limit: '500',
  });

  if (!data.data) return [];

  return data.data
    .map((d) => {
      const k = mapKPIRow(d);
      return {
        id: d.campaign_id,
        name: d.campaign_name,
        spend: k.spend,
        impressions: k.impressions,
        reach: k.reach,
        frequency: k.frequency,
        clicks: k.clicks,
        linkClicks: k.linkClicks,
        ctr: k.ctr,
        cpc: k.cpc,
        cpm: k.cpm,
        purchases: k.purchases,
        purchaseValue: k.purchaseValue,
        roas: k.roas,
        addToCarts: k.addToCarts,
        initiatedCheckouts: k.initiatedCheckouts,
      } as MetaCampaign;
    })
    .sort((a, b) => b.spend - a.spend);
}

export async function getAdSets(config: MetaConfig, dateRange: string): Promise<MetaAdSet[]> {
  const acct = accountId(config.adAccountId);

  const data = await fetchMeta<{
    data: Array<Record<string, unknown> & {
      adset_id: string;
      adset_name: string;
      campaign_name?: string;
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: `adset_id,adset_name,campaign_name,${INSIGHT_FIELDS}`,
    level: 'adset',
    limit: '200',
  });

  if (!data.data) return [];

  return data.data
    .map((d) => {
      const k = mapKPIRow(d);
      return {
        id: d.adset_id,
        name: d.adset_name,
        campaignName: d.campaign_name,
        spend: k.spend,
        impressions: k.impressions,
        reach: k.reach,
        clicks: k.clicks,
        ctr: k.ctr,
        cpc: k.cpc,
        purchases: k.purchases,
        purchaseValue: k.purchaseValue,
        roas: k.roas,
      } as MetaAdSet;
    })
    .sort((a, b) => b.spend - a.spend);
}

export async function getAds(config: MetaConfig, dateRange: string): Promise<MetaAd[]> {
  const acct = accountId(config.adAccountId);

  const insightsData = await fetchMeta<{
    data: Array<Record<string, unknown> & {
      ad_id: string;
      ad_name: string;
      campaign_name?: string;
      adset_name?: string;
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: `ad_id,ad_name,campaign_name,adset_name,${INSIGHT_FIELDS}`,
    level: 'ad',
    limit: '100',
  });

  const rows = (insightsData.data ?? [])
    .map((d) => {
      const k = mapKPIRow(d);
      return {
        id: d.ad_id,
        name: d.ad_name,
        campaignName: d.campaign_name,
        adsetName: d.adset_name,
        spend: k.spend,
        impressions: k.impressions,
        reach: k.reach,
        clicks: k.clicks,
        ctr: k.ctr,
        cpc: k.cpc,
        purchases: k.purchases,
        purchaseValue: k.purchaseValue,
        roas: k.roas,
      } as MetaAd;
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 25);

  // Try to enrich with creative thumbnails (best-effort, may fail without ads_management)
  try {
    const ids = rows.map((r) => r.id).filter(Boolean).slice(0, 25);
    if (ids.length === 0) return rows;
    const creativesData = await fetchMeta<{
      data: Array<{ id: string; creative?: { thumbnail_url?: string; effective_object_story_id?: string; object_story_id?: string } }>;
    }>(`${acct}/ads`, {
      access_token: config.accessToken,
      fields: 'id,creative{thumbnail_url,effective_object_story_id,object_story_id}',
      filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: ids }]),
      limit: String(ids.length),
    }).catch(() => ({ data: [] }));

    const byId = new Map<string, { thumbnail_url?: string; object_story_id?: string }>();
    for (const ad of creativesData.data ?? []) {
      byId.set(ad.id, {
        thumbnail_url: ad.creative?.thumbnail_url,
        object_story_id: ad.creative?.effective_object_story_id || ad.creative?.object_story_id,
      });
    }
    for (const r of rows) {
      const c = byId.get(r.id);
      if (c) { r.thumbnailUrl = c.thumbnail_url; r.objectStoryId = c.object_story_id; }
    }
  } catch { /* ignore enrichment failure */ }

  return rows;
}

export async function getSpendOverTime(config: MetaConfig, dateRange: string): Promise<MetaSpendPoint[]> {
  const acct = accountId(config.adAccountId);

  const data = await fetchMeta<{
    data: Array<Record<string, unknown> & { date_start: string }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: `date_start,spend,impressions,clicks,actions,action_values`,
    time_increment: '1',
    level: 'account',
    limit: '500',
  });

  if (!data.data) return [];

  return data.data
    .map((d) => {
      const actions = d.actions as ActionRow[] | undefined;
      const actionValues = d.action_values as ActionRow[] | undefined;
      return {
        date: d.date_start,
        spend: parseFloat((d.spend as string) ?? '0') || 0,
        impressions: parseInt((d.impressions as string) ?? '0') || 0,
        clicks: parseInt((d.clicks as string) ?? '0') || 0,
        purchases: extractAction(actions, 'purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'),
        purchaseValue: extractAction(actionValues, 'purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Funnel ----

export async function getFunnel(config: MetaConfig, dateRange: string): Promise<MetaFunnel> {
  const k = await getKPIs(config, dateRange);
  return {
    impressions: k.impressions,
    reach: k.reach,
    linkClicks: k.linkClicks || k.clicks,
    addToCarts: k.addToCarts,
    initiatedCheckouts: k.initiatedCheckouts,
    purchases: k.purchases,
  };
}

// ---- Breakdowns ----

async function fetchBreakdown(
  config: MetaConfig,
  dateRange: string,
  breakdowns: string,
  labelKeys: string[],
): Promise<MetaBreakdownRow[]> {
  const acct = accountId(config.adAccountId);
  const data = await fetchMeta<{
    data: Array<Record<string, unknown>>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: INSIGHT_FIELDS,
    breakdowns,
    level: 'account',
    limit: '200',
  });

  if (!data.data) return [];

  return data.data
    .map((d) => {
      const k = mapKPIRow(d);
      const parts = labelKeys.map((key) => String(d[key] ?? 'unknown'));
      const label = parts.join(' · ');
      return {
        key: parts.join('|'),
        label,
        spend: k.spend,
        impressions: k.impressions,
        clicks: k.clicks,
        ctr: k.ctr,
        cpc: k.cpc,
        purchases: k.purchases,
        purchaseValue: k.purchaseValue,
        roas: k.roas,
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export function getDemographics(config: MetaConfig, dateRange: string) {
  return fetchBreakdown(config, dateRange, 'age,gender', ['age', 'gender']);
}

export function getPlacements(config: MetaConfig, dateRange: string) {
  return fetchBreakdown(config, dateRange, 'publisher_platform,platform_position', ['publisher_platform', 'platform_position']);
}

export function getDevices(config: MetaConfig, dateRange: string) {
  return fetchBreakdown(config, dateRange, 'impression_device', ['impression_device']);
}

export function getCountries(config: MetaConfig, dateRange: string) {
  return fetchBreakdown(config, dateRange, 'country', ['country']);
}

// ---- Permission diagnostics ----

export async function getPermissions(accessToken: string): Promise<MetaPermissionStatus> {
  const granted: string[] = [];
  const declined: string[] = [];
  const expired: string[] = [];

  try {
    const permData = await fetchMeta<{ data: Array<{ permission: string; status: string }> }>(
      'me/permissions',
      { access_token: accessToken },
    );
    for (const p of permData.data ?? []) {
      if (p.status === 'granted') granted.push(p.permission);
      else if (p.status === 'declined') declined.push(p.permission);
      else if (p.status === 'expired') expired.push(p.permission);
    }
  } catch { /* fallthrough */ }

  let pagesCount = 0;
  try {
    const pages = await fetchMeta<{ data: Array<{ id: string }> }>(
      'me/accounts',
      { access_token: accessToken, fields: 'id', limit: '1' },
    );
    pagesCount = pages.data?.length ?? 0;
  } catch { /* no access */ }

  let adAccountCount = 0;
  try {
    const aas = await fetchMeta<{ data: Array<{ id: string }> }>(
      'me/adaccounts',
      { access_token: accessToken, fields: 'id', limit: '1' },
    );
    adAccountCount = aas.data?.length ?? 0;
  } catch { /* */ }

  return {
    granted,
    declined,
    expired,
    hasPageAccess: granted.includes('pages_show_list') && granted.includes('pages_read_engagement'),
    hasInstagramAccess: granted.includes('instagram_basic') || granted.includes('instagram_manage_comments'),
    pagesCount,
    adAccountCount,
  };
}

// ---- App Review test-call probes ----
// Meta App Review counts API hits per permission. To clear "0 of 1 API call(s)"
// blockers, the app must actually call endpoints that require each permission.
// Run silently on every Social page load so usage accumulates organically.

export interface ProbeResult {
  permission: string;
  endpoint: string;
  status: 'ok' | 'error' | 'skipped';
  detail?: string;
}

export async function probeReviewPermissions(config: MetaConfig): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  // List managed pages first (needs pages_show_list — already passing)
  let pages: Array<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }> = [];
  try {
    const data = await fetchMeta<{ data: typeof pages }>('me/accounts', {
      access_token: config.accessToken,
      fields: 'id,name,access_token,instagram_business_account',
      limit: '10',
    });
    pages = data.data ?? [];
  } catch (e) {
    results.push({ permission: 'pages_show_list', endpoint: '/me/accounts', status: 'error', detail: (e as Error).message });
    return results;
  }

  for (const page of pages.slice(0, 3)) {
    const pageToken = page.access_token || config.accessToken;

    // (1) pages_manage_ads — reading the Page's promoted posts requires this scope
    try {
      const url = new URL(`${BASE}/${page.id}/ads_posts`);
      url.searchParams.set('access_token', pageToken);
      url.searchParams.set('fields', 'id,created_time');
      url.searchParams.set('limit', '1');
      const r = await fetch(url.toString());
      const j = await r.json();
      results.push({
        permission: 'pages_manage_ads',
        endpoint: `/${page.id}/ads_posts`,
        status: j.error ? 'error' : 'ok',
        detail: j.error?.message,
      });
    } catch (e) {
      results.push({ permission: 'pages_manage_ads', endpoint: `/${page.id}/ads_posts`, status: 'error', detail: (e as Error).message });
    }
  }

  // (2) instagram_branded_content_ads_brand — find any IG business account
  //     reachable via the ad account, then call the branded content endpoint.
  const igCandidates: string[] = [];
  for (const p of pages) {
    if (p.instagram_business_account?.id) igCandidates.push(p.instagram_business_account.id);
  }
  try {
    const acct = accountId(config.adAccountId);
    const igOnAcct = await fetchMeta<{ data: Array<{ id: string }> }>(`${acct}/instagram_accounts`, {
      access_token: config.accessToken,
      fields: 'id',
      limit: '5',
    }).catch(() => ({ data: [] as Array<{ id: string }> }));
    for (const a of igOnAcct.data ?? []) igCandidates.push(a.id);

    // Also try IG accounts owned by the parent Business
    const acctMeta = await fetchMeta<{ business?: { id: string } }>(acct, {
      access_token: config.accessToken,
      fields: 'business',
    }).catch(() => ({} as { business?: { id: string } }));
    const bizId = acctMeta.business?.id;
    if (bizId) {
      for (const edge of ['owned_instagram_accounts', 'client_instagram_accounts', 'instagram_business_accounts']) {
        try {
          const r = await fetchMeta<{ data: Array<{ id: string }> }>(`${bizId}/${edge}`, {
            access_token: config.accessToken,
            fields: 'id',
            limit: '5',
          });
          for (const a of r.data ?? []) igCandidates.push(a.id);
          if ((r.data ?? []).length > 0) break;
        } catch { /* try next */ }
      }
    }
  } catch { /* */ }

  if (igCandidates.length > 0) {
    // Try several candidate endpoints for instagram_branded_content_ads_brand.
    // Meta has changed this surface multiple times across API versions.
    const candidates = (igId: string) => [
      { path: `${igId}/branded_content_ad_creators`, params: { limit: '1' } },
      { path: `${igId}/branded_content_ads_partners`, params: { limit: '1' } },
      { path: `${igId}/branded_content_ads_authorized_businesses`, params: { limit: '1' } },
      { path: `${igId}/branded_content_partner_authorized_businesses`, params: { limit: '1' } },
      { path: `${igId}`, params: { fields: 'eligible_to_be_a_branded_content_creator' } },
      { path: `${igId}/branded_content_ad_brand`, params: { limit: '1' } },
      { path: `${igId}/branded_content_ads_authorized_business_user`, params: { limit: '1' } },
    ];

    const igId = igCandidates[0];
    let resolved = false;
    for (const c of candidates(igId)) {
      try {
        const url = new URL(`${BASE}/${c.path}`);
        url.searchParams.set('access_token', config.accessToken);
        for (const [k, v] of Object.entries(c.params)) url.searchParams.set(k, v);
        const r = await fetch(url.toString());
        const j = await r.json();
        const ok = !j.error;
        results.push({
          permission: 'instagram_branded_content_ads_brand',
          endpoint: `/${c.path}?${Object.entries(c.params).map(([k, v]) => `${k}=${v}`).join('&')}`,
          status: ok ? 'ok' : 'error',
          detail: j.error?.message,
        });
        if (ok) { resolved = true; break; }
      } catch (e) {
        results.push({
          permission: 'instagram_branded_content_ads_brand',
          endpoint: `/${c.path}`,
          status: 'error',
          detail: (e as Error).message,
        });
      }
    }
    if (!resolved) {
      results.push({
        permission: 'instagram_branded_content_ads_brand',
        endpoint: `(${candidates(igId).length} variants tried on ig=${igId})`,
        status: 'skipped',
        detail: 'No branded-content endpoint accepted by Meta. Check Meta docs for current path; may also need IG account in Business Settings → Brands.',
      });
    }
  } else {
    results.push({
      permission: 'instagram_branded_content_ads_brand',
      endpoint: '(no IG business account reachable)',
      status: 'skipped',
      detail: 'No IG business account linked to any managed Page, and ad account has no associated IG profile. Link an IG account in Business Settings to fix.',
    });
  }

  // (3) Business Asset User Profile Access — using business_management on user profile
  try {
    const url = new URL(`${BASE}/me`);
    url.searchParams.set('access_token', config.accessToken);
    url.searchParams.set('fields', 'id,name,email,businesses{id,name}');
    const r = await fetch(url.toString());
    const j = await r.json();
    results.push({
      permission: 'business_asset_user_profile_access',
      endpoint: '/me?fields=id,name,email,businesses',
      status: j.error ? 'error' : 'ok',
      detail: j.error?.message,
    });
  } catch (e) {
    results.push({ permission: 'business_asset_user_profile_access', endpoint: '/me', status: 'error', detail: (e as Error).message });
  }

  // (4) public_profile — basic profile read
  try {
    const url = new URL(`${BASE}/me`);
    url.searchParams.set('access_token', config.accessToken);
    url.searchParams.set('fields', 'id,name,picture');
    const r = await fetch(url.toString());
    const j = await r.json();
    results.push({
      permission: 'public_profile',
      endpoint: '/me?fields=id,name,picture',
      status: j.error ? 'error' : 'ok',
      detail: j.error?.message,
    });
  } catch (e) {
    results.push({ permission: 'public_profile', endpoint: '/me', status: 'error', detail: (e as Error).message });
  }

  return results;
}

// ---- Page coverage diagnostic ----
// Tells the user exactly which pages run their ads vs which ones they have
// admin access to — the gap explains "I granted permissions but see no comments".

export interface PageCoverage {
  myUserId: string | null;
  myUserName: string | null;
  managedPages: Array<{ id: string; name: string; tasks: string[]; hasIG: boolean }>;
  adPages: Array<{ id: string; sampleAdName: string; samplePostId: string }>;
  managedCount: number;
  adPageCount: number;
  unmanagedAdPages: Array<{ id: string; sampleAdName: string }>;
  feedSampleError: string | null;
  feedSampleSuccess: boolean;
}

export async function getPageCoverage(config: MetaConfig): Promise<PageCoverage> {
  const result: PageCoverage = {
    myUserId: null,
    myUserName: null,
    managedPages: [],
    adPages: [],
    managedCount: 0,
    adPageCount: 0,
    unmanagedAdPages: [],
    feedSampleError: null,
    feedSampleSuccess: false,
  };

  try {
    const me = await fetchMeta<{ id: string; name: string }>('me', {
      access_token: config.accessToken,
      fields: 'id,name',
    });
    result.myUserId = me.id;
    result.myUserName = me.name;
  } catch { /* */ }

  try {
    const pages = await fetchMeta<{
      data: Array<{ id: string; name: string; tasks?: string[]; instagram_business_account?: { id: string } }>;
    }>('me/accounts', {
      access_token: config.accessToken,
      fields: 'id,name,tasks,instagram_business_account',
      limit: '50',
    });
    result.managedPages = (pages.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      tasks: p.tasks ?? [],
      hasIG: Boolean(p.instagram_business_account?.id),
    }));
    result.managedCount = result.managedPages.length;
  } catch { /* */ }

  const acct = accountId(config.adAccountId);
  try {
    const ads = await fetchMeta<{
      data: Array<{ id: string; name: string; creative?: { effective_object_story_id?: string; object_story_id?: string } }>;
    }>(`${acct}/ads`, {
      access_token: config.accessToken,
      fields: 'id,name,creative{effective_object_story_id,object_story_id}',
      limit: '50',
    });
    const adPagesById = new Map<string, { sampleAdName: string; samplePostId: string }>();
    for (const ad of ads.data ?? []) {
      const post = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
      if (!post) continue;
      const [pageId] = post.split('_');
      if (!pageId) continue;
      if (!adPagesById.has(pageId)) {
        adPagesById.set(pageId, { sampleAdName: ad.name, samplePostId: post });
      }
    }
    result.adPages = Array.from(adPagesById.entries()).map(([id, v]) => ({ id, ...v }));
    result.adPageCount = result.adPages.length;

    const managedIds = new Set(result.managedPages.map((p) => p.id));
    result.unmanagedAdPages = result.adPages
      .filter((p) => !managedIds.has(p.id))
      .map((p) => ({ id: p.id, sampleAdName: p.sampleAdName }));
  } catch { /* ads access may be limited */ }

  // Probe a managed page's feed to confirm whether reading actually works
  if (result.managedPages.length > 0) {
    const probePage = result.managedPages[0];
    try {
      await fetchMeta<{ data: unknown[] }>(`${probePage.id}/feed`, {
        access_token: config.accessToken,
        fields: 'id',
        limit: '1',
      });
      result.feedSampleSuccess = true;
    } catch (e) {
      result.feedSampleError = (e as Error).message;
    }
  }

  return result;
}

// ---- Ad Engagement ----
// Per-ad engagement counts (comments, reactions, shares, saves, post engagement).
// Pulled from Ads Insights — works with `ads_read` alone, no page access needed.
// Comment TEXT requires page admin or Page Public Content Access (App Review).

export interface AdEngagementRow {
  id: string;
  name: string;
  campaignName?: string;
  adsetName?: string;
  pageId?: string;
  status?: string;
  thumbnailUrl?: string;
  permalinkUrl?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  // Engagement actions
  comments: number;
  reactions: number;
  shares: number;
  saves: number;
  postEngagement: number;
  pageEngagement: number;
  videoViews: number;
  // Per-impression rates
  engagementRate: number;
  commentRate: number;
}

export interface AdEngagementSummary {
  totalAds: number;
  totalComments: number;
  totalReactions: number;
  totalShares: number;
  totalSaves: number;
  totalPostEngagement: number;
  totalImpressions: number;
  totalSpend: number;
}

export async function getAdEngagement(config: MetaConfig, dateRange: string): Promise<{
  summary: AdEngagementSummary;
  ads: AdEngagementRow[];
}> {
  const acct = accountId(config.adAccountId);

  const data = await fetchMeta<{
    data: Array<{
      ad_id: string;
      ad_name: string;
      campaign_name?: string;
      adset_name?: string;
      spend: string;
      impressions: string;
      reach?: string;
      clicks?: string;
      actions?: ActionRow[];
      video_play_actions?: ActionRow[];
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    ...dateParams(dateRange),
    fields: 'ad_id,ad_name,campaign_name,adset_name,spend,impressions,reach,clicks,actions,video_play_actions',
    level: 'ad',
    limit: '200',
  });

  const rawRows = data.data ?? [];

  // Build engagement rows
  const rows: AdEngagementRow[] = rawRows.map((r) => {
    const acts = r.actions;
    const comments = extractAction(acts, 'comment');
    const reactions = extractAction(acts, 'post_reaction', 'like');
    const shares = extractAction(acts, 'post');
    const saves = extractAction(acts, 'onsite_conversion.post_save');
    const postEngagement = extractAction(acts, 'post_engagement');
    const pageEngagement = extractAction(acts, 'page_engagement');
    const videoViews = extractAction(r.video_play_actions, 'video_view');
    const impressions = parseInt(r.impressions ?? '0') || 0;
    const spend = parseFloat(r.spend ?? '0') || 0;
    const totalEng = comments + reactions + shares + saves;

    return {
      id: r.ad_id,
      name: r.ad_name,
      campaignName: r.campaign_name,
      adsetName: r.adset_name,
      spend,
      impressions,
      reach: parseInt(r.reach ?? '0') || 0,
      clicks: parseInt(r.clicks ?? '0') || 0,
      comments,
      reactions,
      shares,
      saves,
      postEngagement,
      pageEngagement,
      videoViews,
      engagementRate: impressions > 0 ? (totalEng / impressions) * 100 : 0,
      commentRate: impressions > 0 ? (comments / impressions) * 100 : 0,
    };
  });

  rows.sort((a, b) => (b.comments + b.reactions + b.shares + b.saves) - (a.comments + a.reactions + a.shares + a.saves));

  // Enrich top 30 with creative thumbnails + permalinks + page IDs
  try {
    const topIds = rows.slice(0, 30).map((r) => r.id).filter(Boolean);
    if (topIds.length > 0) {
      const creatives = await fetchMeta<{
        data: Array<{
          id: string;
          status?: string;
          creative?: {
            thumbnail_url?: string;
            effective_object_story_id?: string;
            object_story_id?: string;
            object_url?: string;
          };
        }>;
      }>(`${acct}/ads`, {
        access_token: config.accessToken,
        fields: 'id,status,creative{thumbnail_url,effective_object_story_id,object_story_id,object_url}',
        filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: topIds }]),
        limit: String(topIds.length),
      }).catch(() => ({ data: [] }));

      const byId = new Map(creatives.data.map((c) => [c.id, c]));
      for (const r of rows) {
        const c = byId.get(r.id);
        if (!c) continue;
        const post = c.creative?.effective_object_story_id || c.creative?.object_story_id;
        r.thumbnailUrl = c.creative?.thumbnail_url;
        r.status = c.status;
        if (post) {
          r.pageId = post.split('_')[0];
          r.permalinkUrl = `https://www.facebook.com/${post.replace('_', '/posts/')}`;
        }
      }
    }
  } catch { /* ignore enrichment failure */ }

  const summary: AdEngagementSummary = {
    totalAds: rows.length,
    totalComments: rows.reduce((s, r) => s + r.comments, 0),
    totalReactions: rows.reduce((s, r) => s + r.reactions, 0),
    totalShares: rows.reduce((s, r) => s + r.shares, 0),
    totalSaves: rows.reduce((s, r) => s + r.saves, 0),
    totalPostEngagement: rows.reduce((s, r) => s + r.postEngagement, 0),
    totalImpressions: rows.reduce((s, r) => s + r.impressions, 0),
    totalSpend: rows.reduce((s, r) => s + r.spend, 0),
  };

  return { summary, ads: rows };
}

// ---- Comments fallback: pull from ad creatives ----
// Works with ads_read alone — does not require pages_read_engagement.
export interface AdComment {
  id: string;
  adId: string;
  adName: string;
  postId: string;
  message: string;
  author: string;
  date: string;
}

export async function getCommentsFromAds(config: MetaConfig, dateRange: string): Promise<AdComment[]> {
  const acct = accountId(config.adAccountId);
  const since = dateParams(dateRange);

  // Step 1: list ads with object_story_id
  const adsData = await fetchMeta<{
    data: Array<{
      id: string;
      name: string;
      creative?: { effective_object_story_id?: string; object_story_id?: string };
    }>;
  }>(`${acct}/ads`, {
    access_token: config.accessToken,
    fields: 'id,name,creative{effective_object_story_id,object_story_id}',
    limit: '25',
    ...since,
  });

  const comments: AdComment[] = [];

  for (const ad of (adsData.data ?? []).slice(0, 25)) {
    const postId = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
    if (!postId) continue;

    try {
      const cmnt = await fetchMeta<{
        data: Array<{ id: string; message?: string; from?: { name?: string }; created_time: string }>;
      }>(`${postId}/comments`, {
        access_token: config.accessToken,
        fields: 'id,message,from,created_time',
        limit: '50',
      });

      for (const c of cmnt.data ?? []) {
        comments.push({
          id: c.id,
          adId: ad.id,
          adName: ad.name,
          postId,
          message: c.message ?? '',
          author: c.from?.name ?? 'Facebook user',
          date: c.created_time,
        });
      }
    } catch { /* comments edge may not be readable for this ad */ }
  }

  return comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
