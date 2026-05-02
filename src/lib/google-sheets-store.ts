/**
 * Google Sheets Brand Store
 *
 * Uses Google Apps Script as a backend to store/retrieve encrypted brand data
 * from a Google Sheet. Provides the same interface as github-store.ts.
 *
 * Environment variables required:
 * - GOOGLE_SHEETS_API_URL: Apps Script web app deployment URL
 * - ENCRYPTION_KEY: Secret key for encrypting/decrypting credentials
 */

export interface BrandData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  shopifyStoreUrl?: string | null;
  shopifyAccessToken?: string | null;
  ga4PropertyId?: string | null;
  ga4ServiceAccountJson?: string | null;
  metaAppId?: string | null;
  metaAppSecret?: string | null;
  metaAccessToken?: string | null;
  metaAdAccountId?: string | null;
  googleAdsDevToken?: string | null;
  googleAdsClientId?: string | null;
  googleAdsClientSecret?: string | null;
  googleAdsRefreshToken?: string | null;
  googleAdsCustomerId?: string | null;
  geminiApiKey?: string | null;
  savedMetrics?: { name: string; query: string; chartType: string }[];
  createdAt: string;
  updatedAt: string;
}

const API_URL = process.env.GOOGLE_SHEETS_API_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// Cache for 5 minutes
interface CacheEntry {
  data: BrandData | BrandData[] | null;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Make request to Google Apps Script API
 */
async function callApi(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  slug?: string,
  body?: Partial<BrandData>
): Promise<any> {
  if (!API_URL) {
    throw new Error('GOOGLE_SHEETS_API_URL environment variable not set');
  }

  let url = `${API_URL}?action=${action}`;
  if (slug) url += `&slug=${encodeURIComponent(slug)}`;

  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || 'Unknown error from API');
    }

    return json.data;
  } catch (error) {
    console.error(`Google Sheets API error (${action}):`, error);
    throw error;
  }
}

/**
 * Clear cache entry
 */
function clearCache(key: string) {
  cache.delete(key);
}

/**
 * Clear all cache
 */
function clearAllCache() {
  cache.clear();
}

/**
 * Get from cache if available and not expired
 */
function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cache entry
 */
function setCache(key: string, data: any) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get all brands
 */
export async function getBrands(): Promise<BrandData[]> {
  const cached = getFromCache('brands:all');
  if (cached) return cached;

  try {
    const brands = await callApi('list');
    setCache('brands:all', brands);
    return brands || [];
  } catch (error) {
    console.warn('Failed to fetch brands from Google Sheets:', error);
    return [];
  }
}

/**
 * Get single brand by slug
 */
export async function getBrand(slug: string): Promise<BrandData | null> {
  const cached = getFromCache(`brand:${slug}`);
  if (cached !== undefined) return cached;

  try {
    const brand = await callApi('get', 'GET', slug);
    setCache(`brand:${slug}`, brand);
    return brand || null;
  } catch (error) {
    console.warn(`Failed to fetch brand ${slug} from Google Sheets:`, error);
    return null;
  }
}

/**
 * Create new brand
 */
export async function createBrand(
  brandData: Omit<BrandData, 'createdAt' | 'updatedAt'>
): Promise<BrandData> {
  const now = new Date().toISOString();
  const brand: BrandData = {
    ...brandData,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const created = await callApi('create', 'POST', undefined, brand);
    clearAllCache(); // Invalidate all cache
    return created;
  } catch (error) {
    console.error('Failed to create brand in Google Sheets:', error);
    throw error;
  }
}

/**
 * Update existing brand
 */
export async function updateBrand(
  slug: string,
  updates: Partial<BrandData>
): Promise<BrandData> {
  const updated = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await callApi('update', 'POST', slug, updated);
    clearCache(`brand:${slug}`); // Invalidate specific cache
    clearCache('brands:all'); // Invalidate list cache
    return result;
  } catch (error) {
    console.error(`Failed to update brand ${slug} in Google Sheets:`, error);
    throw error;
  }
}

/**
 * Delete brand
 */
export async function deleteBrand(slug: string): Promise<void> {
  try {
    await callApi('delete', 'POST', slug);
    clearCache(`brand:${slug}`); // Invalidate specific cache
    clearCache('brands:all'); // Invalidate list cache
  } catch (error) {
    console.error(`Failed to delete brand ${slug} from Google Sheets:`, error);
    throw error;
  }
}

/**
 * Clear cache manually (useful for testing or after external updates)
 */
export function invalidateCache() {
  clearAllCache();
}

export type { BrandData };
