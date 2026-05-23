/**
 * Meta Ad Library API service — Competitor Ad Intelligence
 *
 * Uses the public `ads_archive` endpoint with the brand's existing
 * metaAccessToken. No extra credentials required.
 *
 * ⚠️  Coverage limitation: Meta Ad Library reliably returns ads that ran
 *     in EU countries or are political/social-cause ads globally. Ads
 *     targeting India only may not appear. Spend/impressions are ranges.
 */

const AD_LIBRARY_URL = 'https://graph.facebook.com/v19.0/ads_archive';

// Countries to query — broad set to maximise result coverage
const DEFAULT_COUNTRIES = ['IN', 'US', 'GB', 'AU', 'SG', 'AE'];

const AD_FIELDS = [
  'id',
  'page_name',
  'page_id',
  'ad_creative_bodies',
  'ad_creative_link_titles',
  'ad_snapshot_url',
  'ad_delivery_start_time',
  'ad_delivery_stop_time',
  'publisher_platforms',
  'spend',
  'impressions',
  'media_type',
  'currency',
].join(',');

export interface CompetitorConfig {
  accessToken: string;
}

export interface SpendRange {
  lower: number;
  upper: number;
  currency: string;
}

export interface ImpressionsRange {
  lower: number;
  upper: number;
}

export interface CompetitorAd {
  id: string;
  pageName: string;
  pageId: string;
  adCopy: string[];
  linkTitle: string;
  snapshotUrl: string;
  startDate: string;
  endDate: string | null;
  platforms: string[];
  spendRange: SpendRange | null;
  impressionsRange: ImpressionsRange | null;
  mediaType: string;
  status: 'active' | 'inactive';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRange<T extends { lower_bound?: string; upper_bound?: string }>(
  raw: T | undefined
): { lower: number; upper: number } | null {
  if (!raw) return null;
  const lower = parseFloat(raw.lower_bound ?? '0') || 0;
  const upper = parseFloat(raw.upper_bound ?? '0') || 0;
  if (lower === 0 && upper === 0) return null;
  return { lower, upper };
}

interface RawAd {
  id: string;
  page_name?: string;
  page_id?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  publisher_platforms?: string[];
  spend?: { lower_bound?: string; upper_bound?: string };
  impressions?: { lower_bound?: string; upper_bound?: string };
  media_type?: string;
  currency?: string;
}

function normaliseAd(raw: RawAd): CompetitorAd {
  const spendBase = parseRange(raw.spend);
  const impressBase = parseRange(raw.impressions);

  return {
    id: raw.id,
    pageName: raw.page_name ?? '(unknown)',
    pageId: raw.page_id ?? '',
    adCopy: raw.ad_creative_bodies ?? [],
    linkTitle: raw.ad_creative_link_titles?.[0] ?? '',
    snapshotUrl: raw.ad_snapshot_url ?? '',
    startDate: raw.ad_delivery_start_time ?? '',
    endDate: raw.ad_delivery_stop_time ?? null,
    platforms: raw.publisher_platforms ?? [],
    spendRange: spendBase ? { ...spendBase, currency: raw.currency ?? 'USD' } : null,
    impressionsRange: impressBase,
    mediaType: raw.media_type ?? 'UNKNOWN',
    status: raw.ad_delivery_stop_time ? 'inactive' : 'active',
  };
}

async function fetchLibrary(
  params: Record<string, string>,
  accessToken: string
): Promise<CompetitorAd[]> {
  const url = new URL(AD_LIBRARY_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('fields', AD_FIELDS);
  url.searchParams.set('limit', '50');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta Ad Library error (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    data?: RawAd[];
    error?: { message: string };
  };

  if (json.error) throw new Error(`Meta Ad Library: ${json.error.message}`);
  return (json.data ?? []).map(normaliseAd);
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Fetch ads for specific Facebook page IDs (saved competitor tracking).
 * If a pageId is non-numeric (e.g. a username like "secretalchemist"), falls
 * back to keyword search so competitors work before numeric IDs are resolved.
 */
export async function getAdsByPageIds(
  config: CompetitorConfig,
  pageIds: string[],
  adActiveStatus: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ALL'
): Promise<CompetitorAd[]> {
  if (pageIds.length === 0) return [];

  const numericIds  = pageIds.filter(id => /^\d+$/.test(id));
  const usernameIds = pageIds.filter(id => !/^\d+$/.test(id));

  const results = await Promise.all([
    // Numeric IDs → use search_page_ids (exact match)
    numericIds.length > 0
      ? fetchLibrary(
          {
            ad_reached_countries: JSON.stringify(DEFAULT_COUNTRIES),
            search_page_ids: numericIds.join(','),
            ad_active_status: adActiveStatus,
            ad_type: 'ALL',
          },
          config.accessToken
        )
      : Promise.resolve([] as CompetitorAd[]),

    // Usernames → fall back to keyword search
    ...usernameIds.map(username =>
      fetchLibrary(
        {
          ad_reached_countries: JSON.stringify(DEFAULT_COUNTRIES),
          search_terms: username.replace(/[._-]/g, ' '),
          ad_active_status: adActiveStatus,
          ad_type: 'ALL',
        },
        config.accessToken
      ).catch(() => [] as CompetitorAd[])
    ),
  ]);

  return results.flat();
}

/**
 * Search competitor ads by keyword (brand name, product name, etc.).
 */
export async function searchAdsByKeyword(
  config: CompetitorConfig,
  keyword: string,
  adActiveStatus: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ALL'
): Promise<CompetitorAd[]> {
  if (!keyword.trim()) return [];

  return fetchLibrary(
    {
      ad_reached_countries: JSON.stringify(DEFAULT_COUNTRIES),
      search_terms: keyword.trim().slice(0, 100), // API limit: 100 chars
      ad_active_status: adActiveStatus,
      ad_type: 'ALL',
    },
    config.accessToken
  );
}

// ── Industry benchmarks ───────────────────────────────────────────────────────

export interface BenchmarkRange {
  low: number;
  high: number;
  unit: string;
  label: string;
  higherIsBetter: boolean;
}

export const E_COMM_BENCHMARKS: {
  meta: Record<string, BenchmarkRange>;
  google: Record<string, BenchmarkRange>;
} = {
  meta: {
    ctr:       { low: 0.9,  high: 1.5,  unit: '%', label: 'CTR',             higherIsBetter: true  },
    cpc:       { low: 30,   high: 80,   unit: '₹', label: 'CPC',             higherIsBetter: false },
    cpm:       { low: 150,  high: 350,  unit: '₹', label: 'CPM',             higherIsBetter: false },
    roas:      { low: 2.0,  high: 4.0,  unit: '×', label: 'ROAS',            higherIsBetter: true  },
    frequency: { low: 2.0,  high: 5.0,  unit: '×', label: 'Ad Frequency',    higherIsBetter: false },
  },
  google: {
    ctr:       { low: 2.0,  high: 5.0,  unit: '%', label: 'CTR',             higherIsBetter: true  },
    cpc:       { low: 20,   high: 60,   unit: '₹', label: 'CPC',             higherIsBetter: false },
    roas:      { low: 3.0,  high: 6.0,  unit: '×', label: 'ROAS',            higherIsBetter: true  },
  },
};
