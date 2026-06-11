'use client';

import { useState } from 'react';
import type { TrackedStore, SitemapEntry } from '@/types';
import { refreshStore, persistStores, relativeTime } from '@/lib/competitor-scan';

interface Props {
  slug: string;
  initialStores: TrackedStore[];
}

const KIND_META: Record<SitemapEntry['kind'], { label: string; icon: string; color: string }> = {
  page:       { label: 'Landing page', icon: '📄', color: '#3b82f6' },
  collection: { label: 'Collection',   icon: '🗂️', color: '#a78bfa' },
  blog:       { label: 'Blog post',    icon: '✍️', color: '#06b6d4' },
};

function pathOf(loc: string): string {
  try { return new URL(loc).pathname; } catch { return loc; }
}

export function CampaignWatch({ slug, initialStores }: Props) {
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

  const scannedStores = stores.filter(s => s.sitemap?.length);
  const lastScan = scannedStores.map(s => s.sitemapScannedAt).filter(Boolean).sort().pop();

  // Detected diffs (from repeat scans), newest first
  const additions = stores.flatMap(store =>
    (store.sitemapChanges ?? [])
      .filter(c => c.type === 'added')
      .map(c => ({ store, change: c }))
  ).sort((a, b) => new Date(b.change.date).getTime() - new Date(a.change.date).getTime());

  // First-scan fallback: recently modified URLs by lastmod (last 30 days)
  const cutoff = Date.now() - 30 * 86_400_000;
  const recentlyModified = stores.flatMap(store =>
    (store.sitemap ?? [])
      .filter(e => e.lastmod && new Date(e.lastmod).getTime() >= cutoff)
      .map(e => ({ store, entry: e }))
  ).sort((a, b) => new Date(b.entry.lastmod!).getTime() - new Date(a.entry.lastmod!).getTime());

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          {scannedStores.length > 0 &&
            `${scannedStores.reduce((s, st) => s + (st.sitemap?.length ?? 0), 0)} URLs watched across ${scannedStores.length} store${scannedStores.length > 1 ? 's' : ''}`}
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
            {scanning ? 'Scanning…' : '↻ Scan all sitemaps'}
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
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📰</div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{stores.length} store{stores.length > 1 ? 's' : ''} tracked — sitemaps not scanned yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>First scan builds the baseline; new pages show up on every scan after that.</div>
        </div>
      )}

      {/* New URLs detected via diff */}
      {additions.length > 0 && (
        <div className="chart-card" style={{ marginBottom: '20px' }}>
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="chart-card-title">🚨 {additions.length} New URL{additions.length > 1 ? 's' : ''} Detected</div>
              <div className="chart-card-subtitle">Appeared in competitor sitemaps since your previous scan — campaigns usually follow within days</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {additions.map(({ store, change }, i) => {
              const meta = KIND_META[change.kind];
              return (
                <a
                  key={`${store.id}-${change.loc}-${i}`}
                  href={change.loc}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '8px',
                    background: `${meta.color}08`, border: `1px solid ${meta.color}30`,
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--f-mono)' }}>
                      {pathOf(change.loc)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>
                      <span style={{ color: meta.color, fontWeight: 600 }}>{store.name ?? store.url}</span>
                      {' · '}{meta.label}{' · detected '}{relativeTime(change.date)}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently modified (lastmod) — useful even on first scan */}
      {scannedStores.length > 0 && (
        <div className="chart-card">
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="chart-card-title">🕐 Recently Updated Pages (30 days)</div>
              <div className="chart-card-subtitle">By sitemap lastmod — updated landing pages and collections often precede a push</div>
            </div>
          </div>
          {recentlyModified.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
              No pages modified in the last 30 days.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentlyModified.slice(0, 40).map(({ store, entry }, i) => {
                const meta = KIND_META[entry.kind];
                return (
                  <a
                    key={`${store.id}-${entry.loc}-${i}`}
                    href={entry.loc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '7px 12px', borderRadius: '6px',
                      textDecoration: 'none', color: 'inherit',
                      background: 'rgba(255,255,255,0.015)',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{meta.icon}</span>
                    <span style={{ flex: 1, fontSize: '12px', fontFamily: 'var(--f-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pathOf(entry.loc)}
                    </span>
                    <span style={{ fontSize: '11px', color: meta.color, fontWeight: 600, flexShrink: 0 }}>{store.name ?? store.url}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', width: '70px', textAlign: 'right', flexShrink: 0 }}>
                      {relativeTime(entry.lastmod!)}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* How to use */}
      <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
        <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Reading the signals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>New landing pages</strong><br />
            A <code>/pages/rakhi-gifting</code> URL in July tells you their campaign calendar weeks before the ads run. Plan your counter-offer for the same window.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>New collections</strong><br />
            A new collection = a new range or a re-merchandised push. Check what&apos;s in it — the products they group together reveal their positioning strategy.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Blog cadence</strong><br />
            A sudden burst of blog posts on one theme (e.g. &ldquo;long-lasting perfumes&rdquo;) signals an SEO land-grab on those keywords. Decide if you want to contest them.
          </div>
        </div>
      </div>
    </>
  );
}
