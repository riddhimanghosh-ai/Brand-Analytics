'use client';

import { useState, useEffect, useCallback } from 'react';

interface RestockRow {
  title: string;
  stock: number;
  reserveStock: number;
  listingEmpty: boolean;
  dailyRate: number;
  daysOfCover: number;
  status: 'critical' | 'low' | 'healthy' | 'overstocked' | 'dead';
  suggestedReorder: number;
}

interface RestockData {
  rows: RestockRow[];
  leadTimeDays: number;
  bufferDays: number;
}

const STATUS_META = {
  critical:    { label: 'Critical',    icon: '🚨', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  desc: 'Under 7 days of stock' },
  low:         { label: 'Low',         icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'Under 3 weeks of stock' },
  healthy:     { label: 'Healthy',     icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  desc: 'Comfortable cover' },
  overstocked: { label: 'Overstocked', icon: '📦', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', desc: '120+ days of cover' },
  dead:        { label: 'Dead Stock',  icon: '🧊', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', desc: 'Stock but no sales' },
} as const;

export default function RestockPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [leadTime, setLeadTime] = useState(30);
  const [appliedLeadTime, setAppliedLeadTime] = useState(30);
  const [data, setData] = useState<RestockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | RestockRow['status']>('all');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/restock?slug=${slug}&leadTime=${appliedLeadTime}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, appliedLeadTime]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.rows ?? [];
  const counts = {
    critical: rows.filter(r => r.status === 'critical').length,
    low: rows.filter(r => r.status === 'low').length,
    healthy: rows.filter(r => r.status === 'healthy').length,
    overstocked: rows.filter(r => r.status === 'overstocked').length,
    dead: rows.filter(r => r.status === 'dead').length,
  };
  const visible = rows.filter(r => filter === 'all' || r.status === filter);
  const reorderList = rows.filter(r => r.suggestedReorder > 0);

  function exportReorderCsv() {
    const header = 'product,current_stock,daily_sales_rate,days_of_cover,suggested_reorder_units\n';
    const body = reorderList.map(r =>
      `"${r.title.replace(/"/g, '""')}",${r.stock},${r.dailyRate},${r.daysOfCover},${r.suggestedReorder}`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reorder-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              📦 Restock Advisor
            </h2>
            <p>Live stock × sales velocity — what to reorder before you sell out</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Supplier lead time</label>
            <input
              type="number"
              value={leadTime}
              onChange={e => setLeadTime(Number(e.target.value))}
              onBlur={() => { if (leadTime !== appliedLeadTime && leadTime >= 7) setAppliedLeadTime(leadTime); }}
              onKeyDown={e => { if (e.key === 'Enter' && leadTime >= 7) setAppliedLeadTime(leadTime); }}
              min={7} max={120}
              className="form-input"
              style={{ width: '70px', padding: '7px 10px', fontSize: '13px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>days</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
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
            {/* Reorder call-to-action */}
            {reorderList.length > 0 && (
              <div style={{
                padding: '16px 20px', borderRadius: '10px', marginBottom: '24px',
                background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '2px' }}>
                    🛒 {reorderList.length} products need reordering
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Quantities sized for {data.leadTimeDays}-day lead time + {data.bufferDays}-day buffer at current sales rates
                  </div>
                </div>
                <button onClick={exportReorderCsv} className="btn btn-primary btn-sm">
                  ⬇️ Export Reorder List ({reorderList.length})
                </button>
              </div>
            )}

            {/* Status KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map(key => {
                const meta = STATUS_META[key];
                return (
                  <div
                    key={key}
                    className="kpi-card"
                    onClick={() => setFilter(filter === key ? 'all' : key)}
                    style={{ cursor: 'pointer', borderColor: filter === key ? meta.color : undefined }}
                  >
                    <div className="kpi-label">{meta.icon} {meta.label}</div>
                    <div className="kpi-value" style={{ color: meta.color }}>{counts[key]}</div>
                    <div className="kpi-subtext">{meta.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">
                    {filter === 'all' ? 'All Tracked Products' : `${STATUS_META[filter].icon} ${STATUS_META[filter].label}`} ({visible.length})
                  </div>
                  <div className="chart-card-subtitle">Sorted by urgency — fewest days of cover first</div>
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
                        <th style={{ textAlign: 'right' }}>Live Stock</th>
                        <th style={{ textAlign: 'right' }}>Reserve (drafts)</th>
                        <th style={{ textAlign: 'right' }}>Selling / Day</th>
                        <th style={{ textAlign: 'right' }}>Days of Cover</th>
                        <th style={{ textAlign: 'right' }}>Reorder Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.slice(0, 100).map(r => {
                        const meta = STATUS_META[r.status];
                        return (
                          <tr key={r.title}>
                            <td style={{ fontWeight: 600, fontSize: '13px', maxWidth: '320px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                              {r.listingEmpty && (
                                <div style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 700 }}>
                                  ⚠️ Live listing at 0 — move reserve stock to the listing!
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
                              }}>
                                {meta.icon} {meta.label}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: r.stock <= 0 ? '#f43f5e' : undefined }}>
                              {r.stock.toLocaleString('en-IN')}
                            </td>
                            <td className="mono" style={{ textAlign: 'right', color: r.reserveStock > 0 ? '#3b82f6' : 'var(--text-dim)' }}>
                              {r.reserveStock > 0 ? r.reserveStock.toLocaleString('en-IN') : '—'}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>{r.dailyRate.toFixed(1)}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              <span style={{ color: meta.color, fontWeight: 700 }}>
                                {r.daysOfCover >= 9999 ? '∞' : `${r.daysOfCover.toFixed(0)}d`}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              {r.suggestedReorder > 0
                                ? <strong style={{ color: '#f59e0b' }}>+{r.suggestedReorder.toLocaleString('en-IN')}</strong>
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visible.length > 100 && (
                    <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                      Showing 100 of {visible.length}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How quantities are calculated</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Sales rate</strong><br />
                  Blended daily rate: 60% weight on the last 7 days, 40% on the prior 4 weeks — responsive to spikes without overreacting.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Days of cover</strong><br />
                  Current stock ÷ daily rate. If a supplier takes {data.leadTimeDays} days to deliver, anything under {data.leadTimeDays + data.bufferDays} days of cover is at risk of a stock-out.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Reorder quantity</strong><br />
                  (Daily rate × (lead time + {data.bufferDays}-day buffer)) − current stock. Adjust the lead time above to match your supplier and it recalculates.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
