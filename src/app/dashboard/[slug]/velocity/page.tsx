'use client';

import { useState, useEffect, useCallback } from 'react';

interface VelocityRow {
  title: string;
  unitsLast7: number;
  dailyAvgLast7: number;
  dailyAvgPrior28: number;
  ratio: number;
  status: 'surging' | 'slowing' | 'stalled' | 'steady';
  lastSoldDate: string | null;
}

interface InsightsData {
  velocity: VelocityRow[];
  rangeDays: number;
}

const STATUS_META = {
  surging: { label: 'Surging', icon: '🚀', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  slowing: { label: 'Slowing', icon: '📉', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  stalled: { label: 'Stalled', icon: '🧊', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  steady:  { label: 'Steady',  icon: '➡️', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
} as const;

export default function VelocityPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | VelocityRow['status']>('all');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    // Velocity only needs the last 35 days but shares the insights API (90d min)
    fetch(`/api/insights?slug=${slug}&days=90`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.velocity ?? [];
  const counts = {
    surging: rows.filter(r => r.status === 'surging').length,
    slowing: rows.filter(r => r.status === 'slowing').length,
    stalled: rows.filter(r => r.status === 'stalled').length,
    steady: rows.filter(r => r.status === 'steady').length,
  };
  const visible = rows.filter(r => filter === 'all' || r.status === filter);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🏎️ Product Velocity
            </h2>
            <p>Units this week vs your 4-week baseline — what&apos;s taking off, what&apos;s dying</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', height: '28px', margin: '8px 0' }} />
              </div>
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
            {/* Status KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map(key => {
                const meta = STATUS_META[key];
                return (
                  <div key={key} className="kpi-card" onClick={() => setFilter(filter === key ? 'all' : key)} style={{ cursor: 'pointer', borderColor: filter === key ? meta.color : undefined }}>
                    <div className="kpi-label">{meta.icon} {meta.label}</div>
                    <div className="kpi-value" style={{ color: meta.color }}>{counts[key]}</div>
                    <div className="kpi-subtext">
                      {key === 'surging' && 'Selling 1.5×+ faster — check stock!'}
                      {key === 'slowing' && 'Under half the usual rate'}
                      {key === 'stalled' && 'No sales in 14+ days'}
                      {key === 'steady' && 'Within the normal band'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">
                    {filter === 'all' ? 'All Products' : `${STATUS_META[filter].icon} ${STATUS_META[filter].label} Products`} ({visible.length})
                  </div>
                  <div className="chart-card-subtitle">Click a status card above to filter · sorted by units sold this week</div>
                </div>
              </div>

              {visible.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: '13px' }}>
                  No products in this category
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Product</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Units (7d)</th>
                        <th style={{ textAlign: 'right' }}>Daily Now</th>
                        <th style={{ textAlign: 'right' }}>Daily Baseline</th>
                        <th style={{ textAlign: 'right' }}>Velocity</th>
                        <th style={{ textAlign: 'right' }}>Last Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.slice(0, 80).map(r => {
                        const meta = STATUS_META[r.status];
                        return (
                          <tr key={r.title}>
                            <td style={{ fontWeight: 600, fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.title}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
                              }}>
                                {meta.icon} {meta.label}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{r.unitsLast7}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{r.dailyAvgLast7.toFixed(1)}/day</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{r.dailyAvgPrior28.toFixed(1)}/day</td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              <span style={{ color: meta.color, fontWeight: 700 }}>
                                {r.ratio >= 99 ? 'NEW' : `${r.ratio.toFixed(1)}×`}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '12px' }}>
                              {r.lastSoldDate ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visible.length > 80 && (
                    <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                      Showing top 80 of {visible.length}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* How to read */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to act on this</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: '#22c55e' }}>🚀 Surging</strong><br />
                  Demand is spiking — verify inventory cover immediately, consider raising ad budget on these SKUs while the wave lasts.
                </div>
                <div>
                  <strong style={{ color: '#f59e0b' }}>📉 Slowing</strong><br />
                  Was it seasonal, a price change, or an out-of-stock variant? If intentional (e.g. promo ended), fine — otherwise investigate.
                </div>
                <div>
                  <strong style={{ color: '#f43f5e' }}>🧊 Stalled</strong><br />
                  Dead stock ties up working capital. Bundle it with a bestseller, discount it, or cut it from the catalog.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
