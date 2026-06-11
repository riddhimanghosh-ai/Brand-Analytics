'use client';

// Shared client helpers for the competitor-watch suite
// (New Launch Detector, Stockout Sniper, Campaign Watch).
// All three read/write brand.trackedStores — same store list as Price Tracker.

import type {
  TrackedStore, TrackedProductSnapshot, PriceChangeEvent,
  SitemapEntry, SitemapChangeEvent,
} from '@/types';

export const MAX_CHANGES_KEPT = 150;

export async function persistStores(slug: string, updated: TrackedStore[]) {
  await fetch(`/api/brands/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackedStores: updated }),
  });
}

export async function scanStore(url: string, what: 'products' | 'sitemap' | 'both' = 'both'): Promise<{
  products?: TrackedProductSnapshot[];
  sitemap?: SitemapEntry[];
  productsError?: string;
  sitemapError?: string;
}> {
  const res = await fetch(`/api/competitor-watch?url=${encodeURIComponent(url)}&what=${what}`);
  const data = await res.json();
  if (data.error && !data.products?.length && !data.sitemap?.length) throw new Error(data.error);
  return data;
}

/** Same diff logic as Price Tracker — kept in sync so changes feed one log */
export function diffProducts(
  prev: TrackedProductSnapshot[],
  next: TrackedProductSnapshot[],
): PriceChangeEvent[] {
  const now = new Date().toISOString();
  const changes: PriceChangeEvent[] = [];
  const prevById = new Map(prev.map(p => [p.id, p]));
  const nextById = new Map(next.map(p => [p.id, p]));

  for (const n of next) {
    const p = prevById.get(n.id);
    if (!p) {
      changes.push({ date: now, productId: n.id, productTitle: n.title, handle: n.handle, type: 'new_product', oldPrice: null, newPrice: n.price });
      continue;
    }
    if (Math.abs(n.price - p.price) > 0.5) {
      changes.push({
        date: now, productId: n.id, productTitle: n.title, handle: n.handle,
        type: n.price > p.price ? 'price_up' : 'price_down',
        oldPrice: p.price, newPrice: n.price,
      });
    }
    if (p.available && !n.available) {
      changes.push({ date: now, productId: n.id, productTitle: n.title, handle: n.handle, type: 'out_of_stock', oldPrice: p.price, newPrice: n.price });
    } else if (!p.available && n.available) {
      changes.push({ date: now, productId: n.id, productTitle: n.title, handle: n.handle, type: 'back_in_stock', oldPrice: p.price, newPrice: n.price });
    }
  }
  for (const p of prev) {
    if (!nextById.has(p.id)) {
      changes.push({ date: now, productId: p.id, productTitle: p.title, handle: p.handle, type: 'removed', oldPrice: p.price, newPrice: null });
    }
  }
  return changes;
}

export function diffSitemap(prev: SitemapEntry[], next: SitemapEntry[]): SitemapChangeEvent[] {
  const now = new Date().toISOString();
  const prevLocs = new Set(prev.map(e => e.loc));
  const nextLocs = new Set(next.map(e => e.loc));
  const changes: SitemapChangeEvent[] = [];
  for (const e of next) {
    if (!prevLocs.has(e.loc)) changes.push({ date: now, loc: e.loc, kind: e.kind, type: 'added' });
  }
  for (const e of prev) {
    if (!nextLocs.has(e.loc)) changes.push({ date: now, loc: e.loc, kind: e.kind, type: 'removed' });
  }
  return changes;
}

/** Scan one store for products+sitemap and merge results/changes into it */
export async function refreshStore(store: TrackedStore): Promise<TrackedStore> {
  const result = await scanStore(store.url, 'both');
  const now = new Date().toISOString();
  const updated: TrackedStore = { ...store };

  if (result.products) {
    const productChanges = store.products?.length ? diffProducts(store.products, result.products) : [];
    updated.products = result.products;
    updated.changes = [...productChanges, ...(store.changes ?? [])].slice(0, MAX_CHANGES_KEPT);
    updated.lastScanned = now;
  }
  if (result.sitemap) {
    const sitemapChanges = store.sitemap?.length ? diffSitemap(store.sitemap, result.sitemap) : [];
    updated.sitemap = result.sitemap;
    updated.sitemapChanges = [...sitemapChanges, ...(store.sitemapChanges ?? [])].slice(0, MAX_CHANGES_KEPT);
    updated.sitemapScannedAt = now;
  }
  return updated;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
