'use client';

import { useState, useEffect, useCallback } from 'react';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

interface SegmentCustomer {
  email: string;
  orders: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

interface CustomerSegment {
  key: string;
  label: string;
  description: string;
  customers: number;
  revenue: number;
  avgOrders: number;
  avgSpent: number;
  list: SegmentCustomer[];
}

interface InsightsData {
  segments: CustomerSegment[];
  totalCustomers: number;
  rangeDays: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  champions: '#22c55e',
  loyal: '#3b82f6',
  new: '#a78bfa',
  promising: '#06b6d4',
  at_risk: '#f59e0b',
  lost: '#6b7280',
};

const SEGMENT_ICONS: Record<string, string> = {
  champions: '🏆', loyal: '💙', new: '✨', promising: '🌱', at_risk: '⚠️', lost: '💤',
};

function downloadCsv(segment: CustomerSegment) {
  const header = 'email,orders,total_spent,first_order,last_order\n';
  const rows = segment.list.map(c =>
    `${c.email},${c.orders},${c.totalSpent},${c.firstOrderDate},${c.lastOrderDate}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${segment.key}-customers.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SegmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [days, setDays] = useState<90 | 180 | 365>(180);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/insights?slug=${slug}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, days]);

  useEffect(() => { load(); }, [load]);

  const selectedSegment = data?.segments.find(s => s.key === selected) ?? null;
  const totalRevenue = data ? data.segments.reduce((s, x) => s + x.revenue, 0) : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              👥 Customer Segments
            </h2>
            <p>RFM segmentation — who to protect, who to win back, who to let go</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', height: '28px', margin: '8px 0' }} />
                <div className="skeleton skeleton-text" style={{ width: '80%' }} />
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
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
              {data.totalCustomers.toLocaleString('en-IN')} customers analysed over the last {data.rangeDays} days
            </div>

            {/* Segment cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {data.segments.map(seg => {
                const color = SEGMENT_COLORS[seg.key] ?? '#6b7280';
                const share = data.totalCustomers > 0 ? (seg.customers / data.totalCustomers) * 100 : 0;
                const revShare = totalRevenue > 0 ? (seg.revenue / totalRevenue) * 100 : 0;
                const isSel = selected === seg.key;
                return (
                  <div
                    key={seg.key}
                    onClick={() => setSelected(isSel ? null : seg.key)}
                    className="chart-card"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSel ? color : 'var(--glass-border)',
                      background: isSel ? `${color}0a` : 'var(--bg-card)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color }}>
                        {SEGMENT_ICONS[seg.key]} {seg.label}
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: 800 }}>{seg.customers.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }}>
                      <div style={{ height: '100%', width: `${share}%`, background: color, borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                      {share.toFixed(1)}% of customers · {revShare.toFixed(1)}% of revenue ({fmt(seg.revenue)})<br />
                      Avg {seg.avgOrders.toFixed(1)} orders · {fmt(seg.avgSpent)} lifetime
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {seg.description}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected segment detail */}
            {selectedSegment && (
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">
                      {SEGMENT_ICONS[selectedSegment.key]} {selectedSegment.label} — {selectedSegment.customers.toLocaleString('en-IN')} customers
                    </div>
                    <div className="chart-card-subtitle">
                      Sorted by lifetime spend{selectedSegment.list.length < selectedSegment.customers ? ` · export includes top ${selectedSegment.list.length.toLocaleString('en-IN')}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadCsv(selectedSegment)}
                    className="btn btn-primary btn-sm"
                  >
                    ⬇️ Export CSV ({selectedSegment.list.length.toLocaleString('en-IN')})
                  </button>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Email</th>
                        <th style={{ textAlign: 'right' }}>Orders</th>
                        <th style={{ textAlign: 'right' }}>Lifetime Spend</th>
                        <th style={{ textAlign: 'right' }}>First Order</th>
                        <th style={{ textAlign: 'right' }}>Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSegment.list.slice(0, 100).map(c => (
                        <tr key={c.email}>
                          <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>{c.email}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{c.orders}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.totalSpent)}</td>
                          <td className="mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{c.firstOrderDate}</td>
                          <td className="mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{c.lastOrderDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedSegment.list.length > 100 && (
                    <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                      Showing first 100 — use Export CSV for the full list
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedSegment && (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '12px' }}>
                Click a segment card to see its customer list and export a CSV for Klaviyo / WhatsApp campaigns
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
