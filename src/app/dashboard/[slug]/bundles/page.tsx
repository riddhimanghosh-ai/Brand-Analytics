'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

interface ProductPair {
  a: string;
  b: string;
  together: number;
  aOrders: number;
  bOrders: number;
  confidence: number;
  lift: number;
  avgPairRevenue: number;
}

interface PatternsData {
  pairs: ProductPair[];
  ordersAnalysed: number;
  multiItemOrderShare: number;
  rangeDays: number;
}

export default function BundlesPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [days, setDays] = useState<90 | 180 | 365>(180);
  const [data, setData] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/purchase-patterns?slug=${slug}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, days]);

  useEffect(() => { load(); }, [load]);

  const strongPairs = (data?.pairs ?? []).filter(p => p.lift >= 1.5 && p.together >= 10);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🎁 Bundle Builder
            </h2>
            <p>What customers already buy together — your next bundle is in this data</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {([90, 180, 365] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${days === d ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                  background: days === d ? 'rgba(59,130,246,0.12)' : 'var(--bg-card)',
                  color: days === d ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                {d === 365 ? '1 year' : `${d} days`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Analysing baskets — first run can take a minute…</div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="chart-card"><div className="skeleton skeleton-text" style={{ width: '60%' }} /></div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: '24px' }}>
            ❌ {error}
          </div>
        )}

        {data && !loading && (
          <>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>
              {data.ordersAnalysed.toLocaleString('en-IN')} orders analysed over {data.rangeDays} days · {data.multiItemOrderShare}% contain 2+ products
            </div>

            {/* Top bundle candidates */}
            {strongPairs.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⭐ Strongest bundle candidates</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {strongPairs.slice(0, 6).map((p, i) => (
                    <div key={i} className="chart-card" style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🎁</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {p.lift.toFixed(1)}× more than chance
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.5 }}>
                        {p.a}<br />
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>+ </span>{p.b}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', lineHeight: 1.5 }}>
                        Bought together in <strong style={{ color: 'var(--text-secondary)' }}>{p.together}</strong> orders ·
                        {' '}{p.confidence.toFixed(0)}% of {p.a.length > 24 ? p.a.slice(0, 24) + '…' : p.a} buyers also took the second item ·
                        avg order {fmt(p.avgPairRevenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full pairs table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">📋 All Frequent Pairs ({data.pairs.length})</div>
                  <div className="chart-card-subtitle">Min 5 co-occurrences · lift &gt; 1 means the pairing is real, not coincidence</div>
                </div>
              </div>
              {data.pairs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: '13px' }}>
                  Not enough multi-product orders to find pairs
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Product A</th>
                        <th style={{ textAlign: 'left' }}>Product B</th>
                        <th style={{ textAlign: 'right' }}>Together</th>
                        <th style={{ textAlign: 'right' }}>Attach Rate</th>
                        <th style={{ textAlign: 'right' }}>Lift</th>
                        <th style={{ textAlign: 'right' }}>Avg Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pairs.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.a}</td>
                          <td style={{ fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.b}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{p.together}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{p.confidence.toFixed(0)}%</td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            <span style={{ color: p.lift >= 2 ? '#22c55e' : p.lift >= 1.2 ? '#f59e0b' : 'var(--text-dim)', fontWeight: 700 }}>
                              {p.lift.toFixed(1)}×
                            </span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{fmt(p.avgPairRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* How to use */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Turning pairs into money</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Why bundles matter for you</strong><br />
                  Your <Link href={`/dashboard/${slug}/event-roi`} style={{ color: 'var(--accent-blue)' }}>Event ROI</Link> shows bundles are your best offer type (+69% lift), and <Link href={`/dashboard/${slug}/payback`} style={{ color: 'var(--accent-blue)' }}>CAC payback</Link> shows first-order value must rise. Bundles do both.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Attach rate</strong><br />
                  &ldquo;62% attach&rdquo; means nearly two-thirds of people buying the smaller product also took the partner item — bundle them at a small discount and you formalise behaviour that already exists.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Lift sanity check</strong><br />
                  High &ldquo;together&rdquo; count with lift near 1 just means both products are popular. Real bundle candidates have lift ≥ 1.5 — the green cards above.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
