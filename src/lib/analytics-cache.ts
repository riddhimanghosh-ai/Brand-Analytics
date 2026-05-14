/**
 * analytics-cache.ts
 *
 * MongoDB-backed cache for computed Shopify analytics results.
 * Survives Lambda cold starts unlike in-memory maps.
 *
 * Strategy:
 *  - Cache the fully-computed result (not raw orders) — small documents (~50-200 KB each)
 *  - TTL: 2 hours for ranges that include today (data changes); 24 hours for historical
 *  - "Refresh data" button calls invalidate() to force a fresh fetch
 *  - MongoDB TTL index auto-expires old documents so storage stays tiny
 */

import { getDb } from './mongodb-store';

const COLLECTION = 'analytics_cache';

// TTL in milliseconds
const TTL_CURRENT  = 2  * 60 * 60 * 1000; // 2h  — range includes today
const TTL_HISTORIC = 24 * 60 * 60 * 1000; // 24h — fully historical range

interface CacheDoc {
  _cacheKey: string;
  slug: string;
  data: unknown;
  cachedAt: Date;
  expiresAt: Date;
}

async function getCollection() {
  const db = await getDb();
  const col = db.collection<CacheDoc>(COLLECTION);

  // Ensure TTL index exists (MongoDB auto-deletes expired docs)
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
  await col.createIndex({ _cacheKey: 1 }, { unique: true, background: true });

  return col;
}

/**
 * Returns true if the dateRange string includes today's date.
 * If yes, we use a shorter TTL (data is still accumulating).
 */
function includesDay(dateRange: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  // Custom range format: "YYYY-MM-DD:YYYY-MM-DD"
  if (dateRange.includes(':')) {
    const [, end] = dateRange.split(':');
    return end >= today;
  }
  // Preset ranges like "7d", "30d", "90d" always end today
  return true;
}

function buildKey(slug: string, action: string, dateRange: string): string {
  return `${slug}:${action}:${dateRange}`;
}

/** Get cached result — returns null on miss or expiry */
export async function cacheGet(
  slug: string,
  action: string,
  dateRange: string,
): Promise<unknown | null> {
  try {
    const col = await getCollection();
    const key = buildKey(slug, action, dateRange);
    const doc = await col.findOne({ _cacheKey: key });
    if (!doc) return null;
    // Belt-and-suspenders: also check in-app expiry (TTL index fires async)
    if (doc.expiresAt < new Date()) {
      await col.deleteOne({ _cacheKey: key });
      return null;
    }
    return doc.data;
  } catch (err) {
    // Cache failures are non-fatal — fall through to live fetch
    console.warn('[analytics-cache] get error:', err);
    return null;
  }
}

/** Store a computed result in the cache */
export async function cacheSet(
  slug: string,
  action: string,
  dateRange: string,
  data: unknown,
): Promise<void> {
  try {
    const col = await getCollection();
    const key = buildKey(slug, action, dateRange);
    const ttl = includesDay(dateRange) ? TTL_CURRENT : TTL_HISTORIC;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    await col.updateOne(
      { _cacheKey: key },
      { $set: { _cacheKey: key, slug, data, cachedAt: now, expiresAt } },
      { upsert: true },
    );
  } catch (err) {
    console.warn('[analytics-cache] set error:', err);
  }
}

/** Delete all cached entries for a brand (called on "Refresh data") */
export async function cacheInvalidate(slug: string): Promise<void> {
  try {
    const col = await getCollection();
    await col.deleteMany({ slug });
    console.log(`[analytics-cache] invalidated all cache for ${slug}`);
  } catch (err) {
    console.warn('[analytics-cache] invalidate error:', err);
  }
}
