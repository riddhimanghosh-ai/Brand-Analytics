'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

interface PaybackCohort {
  cohort: string;
  newCustomers: number;
  adSpend: number;
  cac: number;
  cumRevenuePerCustomer: number[];
  cumGrossPerCustomer: number[];
  paybackMonth: number | null;
}

interface PaybackData {
  cohorts: PaybackCohort[];
  avgCac: number;
  m0RecoveryPct: number;
  paidBackCohorts: number;
  matureCohorts: number;
  grossMarginUsed: number;
  cogsConfigured: boolean;
  rangeDays: number;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export default function PaybackPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [days, setDays] = useState<180 | 365>(180);
  const [data, setData] = useState<PaybackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/payback?slug=${slug}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, days]);

  useEffect(() => { load(); }, [load]);

  const maxOffsets = data?.cohorts.reduce((m, c) => Math.max(m, c.cumGrossPerCustomer.length), 0) ?? 0;
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              ⏱️ CAC Payback
            </h2>
            <p>What a customer costs to acquire vs what they pay back — and how fast</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
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
            {!data.cogsConfigured && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', marginBottom: '20px', fontSize: '13px' }}>
                ⚠️ COGS not configured — payback below is on <strong>revenue</strong>, not gross profit. Real payback is slower.{' '}
                <Link href={`/dashboard/${slug}/profit`} style={{ color: '#f59e0b', textDecoration: 'underline' }}>Set COGS in Profitability</Link> for honest numbers.
              </div>
            )}

            {/* Headline KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Avg CAC (Meta)', value: data.avgCac > 0 ? fmt(data.avgCac) : '—',
                  sub: 'Ad spend ÷ new customers, per cohort month',
                  color: 'var(--text-primary)',
                },
                {
                  label: 'First-Month Recovery', value: `${data.m0RecoveryPct.toFixed(0)}%`,
                  sub: `Of CAC recovered in month 0 (at ${data.grossMarginUsed}% margin)`,
                  color: data.m0RecoveryPct >= 100 ? '#22c55e' : data.m0RecoveryPct >= 60 ? '#f59e0b' : '#f43f5e',
                },
                {
                  label: 'Cohorts Paid Back', value: `${data.paidBackCohorts} of ${data.matureCohorts}`,
                  sub: 'Cohorts whose gross profit has covered their CAC',
                  color: data.matureCohorts > 0 && data.paidBackCohorts === data.matureCohorts ? '#22c55e' : data.paidBackCohorts > 0 ? '#f59e0b' : '#f43f5e',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Cohort table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">💸 Payback by Cohort</div>
                  <div className="chart-card-subtitle">
                    Cumulative {data.cogsConfigured ? 'gross profit' : 'revenue'} per customer · green cells = CAC covered
                  </div>
                </div>
              </div>

              {data.cohorts.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: '13px' }}>
                  No cohorts with both ad spend and customer data in this window
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Cohort</th>
                        <th style={{ textAlign: 'right' }}>New Customers</th>
                        <th style={{ textAlign: 'right' }}>Ad Spend</th>
                        <th style={{ textAlign: 'right' }}>CAC</th>
                        {Array.from({ length: maxOffsets }).map((_, i) => (
                          <th key={i} style={{ textAlign: 'right' }}>{i === 0 ? 'M0' : `M+${i}`}</th>
                        ))}
                        <th style={{ textAlign: 'center' }}>Payback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cohorts.map(c => {
                        const isCurrent = c.cohort === currentMonth;
                        return (
                          <tr key={c.cohort} style={{ opacity: isCurrent ? 0.55 : 1 }}>
                            <td style={{ fontWeight: 600 }}>
                              {monthLabel(c.cohort)}{isCurrent && <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}> (current)</span>}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>{c.newCustomers.toLocaleString('en-IN')}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(c.adSpend)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.cac)}</td>
                            {Array.from({ length: maxOffsets }).map((_, i) => {
                              const v = c.cumGrossPerCustomer[i];
                              const covered = v !== undefined && v >= c.cac;
                              return (
                                <td key={i} className="mono" style={{
                                  textAlign: 'right',
                                  background: v === undefined ? 'transparent' : covered ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.05)',
                                  color: v === undefined ? 'var(--text-dim)' : covered ? '#22c55e' : 'var(--text-secondary)',
                                  fontWeight: covered ? 700 : 400,
                                }}>
                                  {v === undefined ? '·' : fmt(v)}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center' }}>
                              {c.paybackMonth !== null ? (
                                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e', whiteSpace: 'nowrap' }}>
                                  ✅ {c.paybackMonth === 0 ? 'Month 0' : `M+${c.paybackMonth}`}
                                </span>
                              ) : (
                                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', whiteSpace: 'nowrap' }}>
                                  ❌ Not yet
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* How to read */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to read this</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>CAC</strong><br />
                  That month&apos;s Meta spend ÷ first-time customers acquired. (Google spend isn&apos;t split by month by Synter, so CAC here is Meta-only — slightly understated.)
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>The M0…M+N columns</strong><br />
                  Cumulative {data.cogsConfigured ? 'gross profit' : 'revenue'} per customer from that cohort. A cell turns green once it crosses the cohort&apos;s CAC — that&apos;s the payback moment.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>The decision</strong><br />
                  If cohorts never pay back, you must either lower CAC (better ads/offers), raise first-order value (bundles), or fix the repurchase rate (see <Link href={`/dashboard/${slug}/cohorts`} style={{ color: 'var(--accent-blue)' }}>Retention Cohorts</Link>).
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
