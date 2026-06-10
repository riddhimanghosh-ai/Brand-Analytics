'use client';

import { useState } from 'react';
import type { TrackedStore, TrackedProductSnapshot, PriceChangeEvent } from '@/types';

interface Props {
  slug: string;
  initialStores: TrackedStore[];
}

const MAX_CHANGES_KEPT = 150;

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Compare previous snapshot with fresh scan → change events */
function diffSnapshots(
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

const CHANGE_META: Record<PriceChangeEvent['type'], { label: string; icon: string; color: string }> = {
  price_down:    { label: 'Price drop', icon: '▼', color: '#f43f5e' },   // competitor undercutting = threat
  price_up:      { label: 'Price hike', icon: '▲', color: '#22c55e' },
  new_product:   { label: 'New launch', icon: '✨', color: '#a78bfa' },
  removed:       { label: 'Delisted',   icon: '✕', color: '#6b7280' },
  out_of_stock:  { label: 'Sold out',   icon: '⊘', color: '#f59e0b' },
  back_in_stock: { label: 'Restocked',  icon: '↻', color: '#06b6d4' },
};

export function PriceTrackerManager({ slug, initialStores }: Props) {
  const [stores, setStores] = useState<TrackedStore[]>(initialStores);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function persist(updated: TrackedStore[]) {
    await fetch(`/api/brands/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackedStores: updated }),
    });
  }

  async function scan(url: string): Promise<{ storeUrl: string; products: TrackedProductSnapshot[] }> {
    const res = await fetch(`/api/price-tracker?url=${encodeURIComponent(url)}`);
    const data = await res.json() as { storeUrl?: string; products?: TrackedProductSnapshot[]; error?: string };
    if (data.error && !data.products?.length) throw new Error(data.error);
    return { storeUrl: data.storeUrl ?? url, products: data.products ?? [] };
  }

  async function handleAdd() {
    const raw = urlInput.trim();
    if (!raw) return;
    setError('');

    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    let hostname = raw;
    try { hostname = new URL(url).hostname; } catch { /* keep raw */ }

    const newStore: TrackedStore = {
      id: Date.now().toString(),
      url,
      name: nameInput.trim() || hostname,
      addedAt: new Date().toISOString(),
    };

    const withNew = [...stores, newStore];
    setStores(withNew);
    setUrlInput('');
    setNameInput('');
    setScanningId(newStore.id);

    try {
      const { storeUrl, products } = await scan(url);
      const updated = withNew.map(s =>
        s.id === newStore.id
          ? { ...s, url: storeUrl, products, changes: [], lastScanned: new Date().toISOString() }
          : s
      );
      setStores(updated);
      await persist(updated);
    } catch (err) {
      setError((err as Error).message);
      setStores(stores); // roll back the optimistic add
    } finally {
      setScanningId(null);
    }
  }

  async function handleRescan(id: string) {
    const store = stores.find(s => s.id === id);
    if (!store) return;
    setError('');
    setScanningId(id);

    try {
      const { products } = await scan(store.url);
      const newChanges = diffSnapshots(store.products ?? [], products);
      const mergedChanges = [...newChanges, ...(store.changes ?? [])].slice(0, MAX_CHANGES_KEPT);
      const updated = stores.map(s =>
        s.id === id
          ? { ...s, products, changes: mergedChanges, lastScanned: new Date().toISOString() }
          : s
      );
      setStores(updated);
      await persist(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanningId(null);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeleteConfirm(null);
    const updated = stores.filter(s => s.id !== id);
    setStores(updated);
    await persist(updated);
  }

  return (
    <div style={{ maxWidth: 980 }}>
      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !scanningId && handleAdd()}
          placeholder="https://competitor-store.com"
          style={{
            flex: '1 1 240px', padding: '9px 12px', fontFamily: 'var(--f-mono)', fontSize: 12,
            background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 6,
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          placeholder="Label (optional)"
          style={{
            width: 160, padding: '9px 12px', fontFamily: 'var(--f-mono)', fontSize: 12,
            background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 6,
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!urlInput.trim() || !!scanningId}
          style={{
            padding: '9px 18px',
            background: !urlInput.trim() || scanningId ? 'var(--paper-2)' : 'var(--accent)',
            color: !urlInput.trim() || scanningId ? 'var(--muted)' : '#fff',
            border: 'none', borderRadius: 6, fontFamily: 'var(--f-mono)', fontSize: 12,
            fontWeight: 600, cursor: !urlInput.trim() || scanningId ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {scanningId ? 'Scanning…' : '+ Track Store'}
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 6,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--warn)', fontFamily: 'var(--f-mono)', fontSize: 11,
        }}>
          {error}
        </div>
      )}

      {stores.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          border: '1px dashed var(--rule)', borderRadius: 8, color: 'var(--muted)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.05em' }}>
            ADD A COMPETITOR&apos;S SHOPIFY STORE TO TRACK PRICES
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted-2)' }}>
            Each rescan detects price changes, new launches, and stock-outs across their full catalog
          </div>
        </div>
      )}

      {/* Store cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stores.map(store => {
          const isScanning = scanningId === store.id;
          const products = store.products ?? [];
          const changes = store.changes ?? [];
          const onSale = products.filter(p => p.compareAtPrice && p.compareAtPrice > p.price);
          const avgPrice = products.length ? products.reduce((s, p) => s + p.price, 0) / products.length : 0;
          const isExpanded = expanded === store.id;
          const filtered = search && isExpanded
            ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
            : products;

          return (
            <div key={store.id} style={{
              background: 'var(--paper)', border: '1px solid var(--rule)',
              borderRadius: 8, padding: '16px 18px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                    {store.name}
                  </div>
                  <a href={store.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--muted)', textDecoration: 'none' }}>
                    {store.url}
                  </a>
                  {store.lastScanned && (
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>
                      Last scanned: {relativeTime(store.lastScanned)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleRescan(store.id)}
                    disabled={!!scanningId}
                    style={{
                      padding: '5px 10px', background: 'var(--paper-2)', border: '1px solid var(--rule)',
                      borderRadius: 5, fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
                      color: scanningId ? 'var(--muted-2)' : 'var(--text-secondary)',
                      cursor: scanningId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isScanning ? 'Scanning…' : '↻ Rescan'}
                  </button>
                  <button
                    onClick={() => handleDelete(store.id)}
                    style={{
                      padding: '5px 10px',
                      background: deleteConfirm === store.id ? 'rgba(239,68,68,0.1)' : 'var(--paper-2)',
                      border: `1px solid ${deleteConfirm === store.id ? 'rgba(239,68,68,0.3)' : 'var(--rule)'}`,
                      borderRadius: 5, fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
                      color: deleteConfirm === store.id ? 'var(--warn)' : 'var(--muted)', cursor: 'pointer',
                    }}
                  >
                    {deleteConfirm === store.id ? 'Confirm?' : '✕'}
                  </button>
                </div>
              </div>

              {/* Summary chips */}
              {products.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[
                    { label: `${products.length} products`, color: '#6366f1' },
                    { label: `Avg ${fmt(avgPrice)}`, color: '#3b82f6' },
                    { label: `${onSale.length} on sale`, color: onSale.length > 0 ? '#f59e0b' : '#6b7280' },
                    { label: `${products.filter(p => !p.available).length} sold out`, color: '#6b7280' },
                  ].map(chip => (
                    <span key={chip.label} style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--f-mono)', background: `${chip.color}15`,
                      border: `1px solid ${chip.color}30`, color: chip.color,
                    }}>{chip.label}</span>
                  ))}
                </div>
              )}

              {/* Recent changes */}
              {changes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
                    color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    Recent Changes ({changes.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                    {changes.slice(0, 25).map((c, i) => {
                      const meta = CHANGE_META[c.type];
                      return (
                        <div key={`${c.productId}-${c.date}-${i}`} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                          borderRadius: 5, background: `${meta.color}08`, fontSize: 12,
                        }}>
                          <span style={{ color: meta.color, fontWeight: 700, width: 16, textAlign: 'center' }}>{meta.icon}</span>
                          <span style={{
                            fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 600, color: meta.color,
                            width: 76, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>{meta.label}</span>
                          <a
                            href={`${store.url}/products/${c.handle}`} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, color: 'var(--ink)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {c.productTitle}
                          </a>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                            {c.type === 'price_up' || c.type === 'price_down'
                              ? <><s style={{ opacity: 0.6 }}>{fmt(c.oldPrice ?? 0)}</s> → <strong style={{ color: meta.color }}>{fmt(c.newPrice ?? 0)}</strong></>
                              : c.newPrice !== null ? fmt(c.newPrice) : ''}
                          </span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--muted-2)', flexShrink: 0, width: 54, textAlign: 'right' }}>
                            {relativeTime(c.date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {products.length > 0 && changes.length === 0 && store.lastScanned && (
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted-2)', marginBottom: 12, fontStyle: 'italic' }}>
                  Baseline captured — rescan later to detect price changes and new launches
                </div>
              )}

              {/* Product catalog toggle */}
              {products.length > 0 && (
                <div>
                  <button
                    onClick={() => { setExpanded(isExpanded ? null : store.id); setSearch(''); }}
                    style={{
                      padding: '5px 12px', background: 'transparent', border: '1px solid var(--rule)',
                      borderRadius: 5, fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
                      color: 'var(--muted)', cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? '▾ Hide catalog' : `▸ View catalog (${products.length})`}
                  </button>

                  {isExpanded && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search products…"
                        style={{
                          width: '100%', padding: '7px 10px', fontFamily: 'var(--f-mono)', fontSize: 11,
                          background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 5,
                          color: 'var(--ink)', outline: 'none', marginBottom: 8,
                        }}
                      />
                      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {filtered.slice(0, 100).map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px',
                            borderBottom: '1px solid var(--rule)', fontSize: 12,
                          }}>
                            {p.imageUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={p.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                              : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--paper-2)', flexShrink: 0 }} />}
                            <a
                              href={`${store.url}/products/${p.handle}`} target="_blank" rel="noopener noreferrer"
                              style={{ flex: 1, color: 'var(--ink)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {p.title}
                            </a>
                            {!p.available && (
                              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: '#f59e0b', flexShrink: 0 }}>SOLD OUT</span>
                            )}
                            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, flexShrink: 0 }}>
                              {p.compareAtPrice && p.compareAtPrice > p.price && (
                                <s style={{ color: 'var(--muted-2)', marginRight: 6 }}>{fmt(p.compareAtPrice)}</s>
                              )}
                              <strong>{fmt(p.price)}</strong>
                            </span>
                          </div>
                        ))}
                        {filtered.length > 100 && (
                          <div style={{ padding: '8px 4px', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--muted-2)' }}>
                            Showing first 100 of {filtered.length} — use search to narrow down
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isScanning && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0',
                  fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted)',
                }}>
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  Fetching catalog from {store.url}…
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
