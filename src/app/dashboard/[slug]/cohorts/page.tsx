'use client';

import { useState, useEffect, useCallback } from 'react';

interface CohortRow {
  cohort: string;
  customers: number;
  retention: number[];
}

interface InsightsData {
  cohorts: CohortRow[];
  totalCustomers: number;
  rangeDays: number;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/** Green heat scale: 0% → transparent, 30%+ → strong green */
function cellBg(pct: number): string {
  const intensity = Math.min(1, pct / 30);
  return `rgba(34, 197, 94, ${(intensity * 0.45).toFixed(3)})`;
}

export default function CohortsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [days, setDays] = useState<180 | 365>(365);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const maxMonths = data?.cohorts.reduce((m, c) => Math.max(m, c.retention.length), 0) ?? 0;
  // Skip the current (incomplete) month's cohort for averages
  const matureCohorts = (data?.cohorts ?? []).slice(0, -1);
  const m1Avg = matureCohorts.length
    ? matureCohorts.reduce((s, c) => s + (c.retention[0] ?? 0), 0) / matureCohorts.length
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              📅 Retention Cohorts
            </h2>
            <p>Of customers who first bought in month X, how many came back?</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {([180, 365] as const).map(d => (
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
                {d === 365 ? '1 year' : '6 months'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="chart-card">
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: '100%', height: '32px', marginBottom: '6px' }} />
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
            {/* Headline metric */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Month-1 Repurchase Rate', value: `${m1Avg.toFixed(1)}%`,
                  sub: 'Avg % buying again the following month',
                  color: m1Avg >= 15 ? '#22c55e' : m1Avg >= 8 ? '#f59e0b' : '#f43f5e',
                },
                {
                  label: 'Cohorts Tracked', value: String(data.cohorts.length),
                  sub: `${data.totalCustomers.toLocaleString('en-IN')} customers over ${data.rangeDays} days`,
                  color: 'var(--text-primary)',
                },
                {
                  label: 'Benchmark', value: '10–20%',
                  sub: 'Typical D2C month-1 repurchase for beauty/personal care',
                  color: 'var(--text-secondary)',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">🔥 Retention Heatmap</div>
                  <div className="chart-card-subtitle">Each row is a first-purchase cohort · cells show % who ordered again N months later</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', padding: '6px 8px', fontWeight: 600 }}>Cohort</th>
                      <th style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)', padding: '6px 8px', fontWeight: 600 }}>New buyers</th>
                      {Array.from({ length: maxMonths }).map((_, i) => (
                        <th key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', padding: '6px 8px', fontWeight: 600 }}>
                          M+{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohorts.map((row, rowIdx) => {
                      const isCurrentMonth = rowIdx === data.cohorts.length - 1;
                      return (
                        <tr key={row.cohort}>
                          <td style={{ fontSize: '13px', fontWeight: 600, padding: '8px', whiteSpace: 'nowrap' }}>
                            {monthLabel(row.cohort)}
                            {isCurrentMonth && <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '4px' }}>(current)</span>}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontSize: '12px', padding: '8px', color: 'var(--text-secondary)' }}>
                            {row.customers.toLocaleString('en-IN')}
                          </td>
                          {Array.from({ length: maxMonths }).map((_, i) => {
                            const pct = row.retention[i];
                            // Months that haven't happened yet for this cohort
                            const notYet = pct === undefined || (i >= data.cohorts.length - 1 - rowIdx);
                            return (
                              <td key={i} style={{
                                textAlign: 'center', fontSize: '12px', padding: '8px 6px',
                                borderRadius: '6px', minWidth: '52px',
                                fontFamily: 'var(--font-mono, monospace)',
                                background: notYet ? 'transparent' : cellBg(pct ?? 0),
                                color: notYet ? 'var(--text-dim)' : 'var(--text-primary)',
                                fontWeight: !notYet && (pct ?? 0) >= 15 ? 700 : 400,
                              }}>
                                {notYet ? '·' : `${(pct ?? 0).toFixed(1)}%`}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* How to read */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to read this</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Reading a row</strong><br />
                  The &ldquo;Mar 25&rdquo; row tracks everyone whose FIRST order was in March. M+1 shows the % who bought again in April, M+2 in May, and so on.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>What good looks like</strong><br />
                  Darker green columns = stickier customers. If newer cohorts are getting lighter, your recent acquisition (or first-purchase experience) is attracting worse-fit customers.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Why it matters for ads</strong><br />
                  If 15% repurchase within a month, a customer is worth ~1.15× their first order within 30 days — this is the number that justifies (or kills) higher acquisition costs.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
