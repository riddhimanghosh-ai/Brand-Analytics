'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const TYPE_LABELS: Record<string, string> = {
  bogo: '🎁 BOGO',
  bundle: '📦 Bundle',
  discount_pct: '％ Discount',
  discount_fixed: '₹ Discount',
  flash_sale: '⚡ Flash Sale',
  free_shipping: '🚚 Free Shipping',
  loyalty: '💎 Loyalty',
  other: '📌 Other',
};

interface EventRow {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'ended' | 'ongoing' | 'upcoming';
  days: number;
  revenueDuring: number;
  ordersDuring: number;
  dailyDuring: number;
  dailyBaseline: number;
  liftPct: number | null;
  revenueTarget: number | null;
  targetAchievedPct: number | null;
}

interface EventRoiData {
  events: EventRow[];
  byType: { type: string; count: number; avgLiftPct: number; totalRevenue: number }[];
  note?: string;
}

export default function EventRoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState<EventRoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/event-roi?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const liftColor = (lift: number | null) =>
    lift === null ? 'var(--text-dim)' : lift >= 20 ? '#22c55e' : lift >= 0 ? '#f59e0b' : '#f43f5e';

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🧪 Event ROI
            </h2>
            <p>Did your campaigns actually lift revenue? Each event vs its pre-event baseline</p>
          </div>
          <Link href={`/dashboard/${slug}/events`} className="btn btn-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
            📅 Manage Events
          </Link>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="chart-card">
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: '100%', height: '40px', marginBottom: '8px' }} />
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
            {data.events.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>No past events to analyse</div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                  Log your promos in Events &amp; Campaigns — once they run, this page measures whether they lifted revenue.
                </div>
                <Link href={`/dashboard/${slug}/events`} className="btn btn-primary btn-sm">+ Add Events</Link>
              </div>
            )}

            {/* Verdict by type */}
            {data.byType.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, data.byType.length)}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
                {data.byType.map(t => (
                  <div key={t.type} className="kpi-card">
                    <div className="kpi-label">{TYPE_LABELS[t.type] ?? t.type} × {t.count}</div>
                    <div className="kpi-value" style={{ color: liftColor(t.avgLiftPct) }}>
                      {t.avgLiftPct >= 0 ? '+' : ''}{t.avgLiftPct.toFixed(0)}%
                    </div>
                    <div className="kpi-subtext">avg lift · {fmt(t.totalRevenue)} during events</div>
                  </div>
                ))}
              </div>
            )}

            {/* Events table */}
            {data.events.length > 0 && (
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📋 Event-by-Event Results</div>
                    <div className="chart-card-subtitle">Lift = daily revenue during the event vs the same number of days immediately before</div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Event</th>
                        <th style={{ textAlign: 'left' }}>Dates</th>
                        <th style={{ textAlign: 'right' }}>Revenue During</th>
                        <th style={{ textAlign: 'right' }}>Daily vs Baseline</th>
                        <th style={{ textAlign: 'right' }}>Lift</th>
                        <th style={{ textAlign: 'right' }}>Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events.map(e => (
                        <tr key={e.id}>
                          <td style={{ maxWidth: '240px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.title}
                              {e.status === 'ongoing' && <span style={{ marginLeft: 6, fontSize: '10px', color: '#22c55e' }}>● LIVE</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{TYPE_LABELS[e.type] ?? e.type}</div>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {fmtDate(e.startDate)} – {fmtDate(e.endDate)} <span style={{ color: 'var(--text-dim)' }}>({e.days}d)</span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(e.revenueDuring)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontSize: '12px' }}>
                            {fmt(e.dailyDuring)}/d <span style={{ color: 'var(--text-dim)' }}>vs {fmt(e.dailyBaseline)}/d</span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            <span style={{ color: liftColor(e.liftPct), fontWeight: 700 }}>
                              {e.liftPct === null ? '—' : `${e.liftPct >= 0 ? '+' : ''}${e.liftPct.toFixed(0)}%`}
                            </span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontSize: '12px' }}>
                            {e.targetAchievedPct !== null
                              ? <span style={{ color: e.targetAchievedPct >= 100 ? '#22c55e' : '#f59e0b' }}>{e.targetAchievedPct}%</span>
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Caveats */}
            {data.events.length > 0 && (
              <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
                <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Reading lift honestly</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Baseline bias</strong><br />
                    The baseline is the days right before the event. If you teased the sale ("coming soon"), the baseline dips and lift looks better than it is.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Pull-forward effect</strong><br />
                    Big lift followed by a post-event slump often means you sold tomorrow&apos;s orders today at a discount — check the days after each event too.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Repeat what works</strong><br />
                    Compare avg lift across event types above — run more of the type that lifts most, and question the ones near 0% (they cost margin for nothing).
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
