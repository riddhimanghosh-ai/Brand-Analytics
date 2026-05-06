/**
 * Google Sheets Brand Store
 *
 * Primary store: Google Apps Script / Google Sheets (when GOOGLE_SHEETS_API_URL is set)
 * Fallback store: Local filesystem via github-store (when env var is NOT set)
 *
 * This means the app works out-of-the-box locally without any setup,
 * and automatically switches to Google Sheets once configured.
 */

// Lazy-load the local filesystem fallback to avoid fs errors in edge environments
async function getLocalStore() {
  return await import('./github-store');
}

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
// Shared secret between Next.js server and Apps Script — never sent to the browser
const API_SECRET = process.env.GOOGLE_SHEETS_API_SECRET || '';

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
  // Pass the shared secret so Apps Script can reject calls from unknown callers
  if (API_SECRET) url += `&secret=${encodeURIComponent(API_SECRET)}`;
  // Pass encryption key so Apps Script can encrypt/decrypt credentials
  if (ENCRYPTION_KEY) url += `&encKey=${encodeURIComponent(ENCRYPTION_KEY)}`;

  // Google Apps Script drops POST bodies on redirect — use GET for everything.
  // Write payloads (create/update) are passed as a base64-encoded URL parameter.
  if (body) {
    const encoded = Buffer.from(JSON.stringify(body)).toString('base64');
    url += `&payload=${encodeURIComponent(encoded)}`;
  }

  try {
    const response = await fetch(url, { method: 'GET' });

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from Apps Script: ${text.slice(0, 200)}`);
    }

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
  if (!API_URL) {
    const local = await getLocalStore();
    return local.getBrands();
  }

  const cached = getFromCache('brands:all');
  if (cached) return cached as BrandData[];

  try {
    const brands = await callApi('list');
    setCache('brands:all', brands);
    return brands || [];
  } catch (error) {
    console.warn('Failed to fetch brands from Google Sheets, falling back to local:', error);
    const local = await getLocalStore();
    return local.getBrands();
  }
}

/**
 * Get single brand by slug
 */
export async function getBrand(slug: string): Promise<BrandData | null> {
  if (!API_URL) {
    const local = await getLocalStore();
    return local.getBrand(slug);
  }

  const cached = getFromCache(`brand:${slug}`);
  if (cached !== undefined) return cached as BrandData | null;

  try {
    const brand = await callApi('get', 'GET', slug);
    setCache(`brand:${slug}`, brand);
    return brand || null;
  } catch (error) {
    console.warn(`Failed to fetch brand ${slug} from Google Sheets, falling back to local:`, error);
    const local = await getLocalStore();
    return local.getBrand(slug);
  }
}

/**
 * Create new brand
 */
export async function createBrand(
  brandData: Omit<BrandData, 'createdAt' | 'updatedAt'>
): Promise<BrandData> {
  if (!API_URL) {
    const local = await getLocalStore();
    return local.createBrand(brandData);
  }

  const now = new Date().toISOString();
  const brand: BrandData = { ...brandData, createdAt: now, updatedAt: now };

  try {
    const created = await callApi('create', 'POST', undefined, brand);
    clearAllCache();
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
  if (!API_URL) {
    const local = await getLocalStore();
    return local.updateBrand(slug, updates);
  }

  const updated = { ...updates, updatedAt: new Date().toISOString() };

  try {
    const result = await callApi('update', 'POST', slug, updated);
    clearCache(`brand:${slug}`);
    clearCache('brands:all');
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
  if (!API_URL) {
    const local = await getLocalStore();
    return local.deleteBrand(slug);
  }

  try {
    await callApi('delete', 'POST', slug);
    clearCache(`brand:${slug}`);
    clearCache('brands:all');
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

