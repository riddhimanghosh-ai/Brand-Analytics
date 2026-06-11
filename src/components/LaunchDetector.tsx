'use client';

import { useState } from 'react';
import type { TrackedStore } from '@/types';
import { refreshStore, persistStores, relativeTime, fmtINR } from '@/lib/competitor-scan';

interface Props {
  slug: string;
  initialStores: TrackedStore[];
}

type Window = 30 | 60 | 90;

export function LaunchDetector({ slug, initialStores }: Props) {
  const [stores, setStores] = useState<TrackedStore[]>(initialStores);
  const [scanning, setScanning] = useState(false);
  const [windowDays, setWindowDays] = useState<Window>(30);
  const [error, setError] = useState('');

  async function scanAll() {
    setScanning(true);
    setError('');
    try {
      const updated = await Promise.all(stores.map(async s => {
        try { return await refreshStore(s); } catch { return s; }
      }));
      setStores(updated);
      await persistStores(slug, updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  const cutoff = Date.now() - windowDays * 86_400_000;

  // All launches across stores within the window, newest first
  const launches = stores.flatMap(store =>
    (store.products ?? [])
      .filter(p => p.publishedAt && new Date(p.publishedAt).getTime() >= cutoff)
      .map(p => ({ store, product: p }))
  ).sort((a, b) =>
    new Date(b.product.publishedAt!).getTime() - new Date(a.product.publishedAt!).getTime()
  );

  const scannedStores = stores.filter(s => s.products?.length);
  const lastScan = scannedStores
    .map(s => s.lastScanned)
    .filter(Boolean)
    .sort()
    .pop();

  // Per-store launch counts
  const perStore = stores.map(s => ({
    name: s.name ?? s.url,
    count: (s.products ?? []).filter(p => p.publishedAt && new Date(p.publishedAt).getTime() >= cutoff).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {([30, 60, 90] as Window[]).map(w => (
            <button
              key={w}
              onClick={() => setWindowDays(w)}
              style={{
                padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${windowDays === w ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                background: windowDays === w ? 'rgba(59,130,246,0.12)' : 'var(--bg-card)',
                color: windowDays === w ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              Last {w} days
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastScan && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Last scan {relativeTime(lastScan)}</span>}
          <button
            onClick={scanAll}
            disabled={scanning || stores.length === 0}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: 'var(--accent-blue)', color: '#fff', border: 'none',
              opacity: scanning || stores.length === 0 ? 0.6 : 1,
            }}
          >
            {scanning ? 'Scanning…' : '↻ Scan all stores'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: '20px', fontSize: '13px' }}>
          ❌ {error}
        </div>
      )}

      {stores.length === 0 && (
        <div style={{ padding: '32px', borderRadius: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏪</div>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>No competitor stores tracked yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Add competitor stores in the <a href={`/dashboard/${slug}/price-tracker`} style={{ color: 'var(--accent-blue)' }}>Price Tracker</a> — this page shares the same list.
          </div>
        </div>
      )}

      {stores.length > 0 && scannedStores.length === 0 && !scanning && (
        <div style={{ padding: '32px', borderRadius: '12px', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛰️</div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{stores.length} store{stores.length > 1 ? 's' : ''} tracked — not scanned yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hit &ldquo;Scan all stores&rdquo; to pull their catalogs.</div>
        </div>
      )}

      {scannedStores.length > 0 && (
        <>
          {/* Per-store summary chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {perStore.map(s => (
              <div key={s.name} style={{
                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: s.count > 0 ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${s.count > 0 ? 'rgba(167,139,250,0.35)' : 'var(--glass-border)'}`,
                color: s.count > 0 ? '#a78bfa' : 'var(--text-dim)',
              }}>
                {s.name}: {s.count} launch{s.count !== 1 ? 'es' : ''}
              </div>
            ))}
          </div>

          {launches.length === 0 ? (
            <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
              No new products published by tracked competitors in the last {windowDays} days.
            </div>
          ) : (
            <div className="chart-card">
              <div className="chart-card-header" style={{ marginBottom: '16px' }}>
                <div>
                  <div className="chart-card-title">✨ {launches.length} New Launch{launches.length > 1 ? 'es' : ''}</div>
                  <div className="chart-card-subtitle">Published in the last {windowDays} days, newest first</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {launches.map(({ store, product }) => (
                  <a
                    key={`${store.id}-${product.id}`}
                    href={`${store.url}/products/${product.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '12px 14px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🧴</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        <span style={{ color: '#a78bfa', fontWeight: 600 }}>{store.name ?? store.url}</span>
                        {' · launched '}{relativeTime(product.publishedAt!)}
                        {!product.available && <span style={{ color: '#f59e0b' }}> · already sold out 🔥</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800 }}>{fmtINR(product.price)}</div>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{fmtINR(product.compareAtPrice)}</div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
