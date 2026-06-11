'use client';

import { useState } from 'react';
import type { TrackedStore } from '@/types';
import { refreshStore, persistStores, relativeTime, fmtINR } from '@/lib/competitor-scan';

interface Props {
  slug: string;
  initialStores: TrackedStore[];
}

export function StockoutSniper({ slug, initialStores }: Props) {
  const [stores, setStores] = useState<TrackedStore[]>(initialStores);
  const [scanning, setScanning] = useState(false);
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

  // When did this product first go OOS? Search the change log.
  function oosSince(store: TrackedStore, productId: string): string | null {
    const events = (store.changes ?? []).filter(c => c.productId === productId);
    // changes are newest-first; find latest out_of_stock not followed by back_in_stock
    for (const e of events) {
      if (e.type === 'back_in_stock') return null; // restocked after the stockout
      if (e.type === 'out_of_stock') return e.date;
    }
    return null;
  }

  const stockouts = stores.flatMap(store =>
    (store.products ?? [])
      .filter(p => !p.available)
      .map(p => ({ store, product: p, since: oosSince(store, p.id) }))
  ).sort((a, b) => {
    // Known-duration stockouts first (oldest first = biggest window)
    if (a.since && b.since) return new Date(a.since).getTime() - new Date(b.since).getTime();
    if (a.since) return -1;
    if (b.since) return 1;
    return 0;
  });

  const scannedStores = stores.filter(s => s.products?.length);
  const lastScan = scannedStores.map(s => s.lastScanned).filter(Boolean).sort().pop();
  const totalProducts = scannedStores.reduce((s, st) => s + (st.products?.length ?? 0), 0);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          {scannedStores.length > 0 && `${totalProducts} products watched across ${scannedStores.length} store${scannedStores.length > 1 ? 's' : ''}`}
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
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{stores.length} store{stores.length > 1 ? 's' : ''} tracked — not scanned yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hit &ldquo;Scan all stores&rdquo; to check stock levels.</div>
        </div>
      )}

      {scannedStores.length > 0 && (
        stockouts.length === 0 ? (
          <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontWeight: 700, color: '#22c55e' }}>No competitor stockouts right now</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Re-scan daily — the window opens when their bestsellers run dry.</div>
          </div>
        ) : (
          <div className="chart-card">
            <div className="chart-card-header" style={{ marginBottom: '16px' }}>
              <div>
                <div className="chart-card-title">🎯 {stockouts.length} Competitor Stockout{stockouts.length > 1 ? 's' : ''} — Open Windows</div>
                <div className="chart-card-subtitle">Their demand has nowhere to go. Aim your ads at these scent profiles now.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stockouts.map(({ store, product, since }) => (
                <a
                  key={`${store.id}-${product.id}`}
                  href={`${store.url}/products/${product.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 14px', borderRadius: '10px',
                    background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, filter: 'grayscale(60%)' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⊘</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{store.name ?? store.url}</span>
                      {since
                        ? <span style={{ color: '#f43f5e', fontWeight: 600 }}> · out of stock since {relativeTime(since)}</span>
                        : ' · currently out of stock'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-secondary)' }}>{fmtINR(product.price)}</div>
                    <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold out</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )
      )}

      {/* How to use */}
      <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
        <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Exploiting a stockout window</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Push the closest match</strong><br />
            If their oud bestseller is dry and you have an oud, raise budget on that ad set now. Their warm audience is actively searching for an alternative.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Bid on their search terms</strong><br />
            Google Search ads on the sold-out product&apos;s name convert unusually well during a stockout — the buyer already decided to purchase, just not from whom.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Move fast</strong><br />
            Stockout windows usually last days, not weeks. Scan daily; the moment it flips back in stock the arbitrage is gone.
          </div>
        </div>
      </div>
    </>
  );
}
