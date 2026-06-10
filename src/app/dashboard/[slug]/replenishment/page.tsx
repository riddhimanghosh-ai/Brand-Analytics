'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

interface ReplenishmentRow {
  title: string;
  repurchases: number;
  medianDays: number;
  p25Days: number;
  p75Days: number;
}

interface PatternsData {
  replenishment: {
    overallMedianDays: number;
    overallSamples: number;
    gapHistogram: Array<{ bucket: string; count: number }>;
    byProduct: ReplenishmentRow[];
  };
  ordersAnalysed: number;
  rangeDays: number;
}

export default function ReplenishmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [days, setDays] = useState<180 | 365>(365);
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

  const r = data?.replenishment;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              ⏰ Replenishment Clock
            </h2>
            <p>When repeat buyers actually come back — so your reminder lands before they re-buy elsewhere</p>
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

        {data && r && !loading && (
          <>
            {/* Headline KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Median Reorder Gap', value: r.overallSamples > 0 ? `${r.overallMedianDays} days` : '—',
                  sub: `Across ${r.overallSamples.toLocaleString('en-IN')} repeat purchases`,
                  color: 'var(--text-primary)',
                },
                {
                  label: 'Send the Nudge At', value: r.overallSamples > 0 ? `Day ${Math.max(1, Math.round(r.overallMedianDays * 0.75))}` : '—',
                  sub: '~75% of the median gap — ahead of the re-buy decision',
                  color: '#22c55e',
                },
                {
                  label: 'Repeat Purchases Analysed', value: r.overallSamples.toLocaleString('en-IN'),
                  sub: `From ${data.ordersAnalysed.toLocaleString('en-IN')} orders over ${data.rangeDays} days`,
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

            {/* Gap histogram */}
            {r.gapHistogram.some(b => b.count > 0) && (
              <div className="chart-card" style={{ marginBottom: '24px' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📊 Time Between Orders</div>
                    <div className="chart-card-subtitle">How long customers wait before ordering again</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={r.gapHistogram} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="bucket" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} />
                    <Tooltip
                      formatter={(v) => [v, 'repeat purchases']}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-product table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">🧴 Product Reorder Cycles ({r.byProduct.length})</div>
                  <div className="chart-card-subtitle">Products with 8+ observed repurchases — the timing for product-specific flows</div>
                </div>
              </div>
              {r.byProduct.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: '13px' }}>
                  Not enough same-product repurchases yet — check back as repeat purchases accumulate
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Product</th>
                        <th style={{ textAlign: 'right' }}>Repurchases</th>
                        <th style={{ textAlign: 'right' }}>Typical Gap (P25–P75)</th>
                        <th style={{ textAlign: 'right' }}>Median</th>
                        <th style={{ textAlign: 'right' }}>📬 Nudge On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.byProduct.map(row => (
                        <tr key={row.title}>
                          <td style={{ fontWeight: 600, fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.title}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{row.repurchases}</td>
                          <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {row.p25Days}–{row.p75Days} days
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{row.medianDays}d</td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>Day {Math.max(1, Math.round(row.medianDays * 0.75))}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* How to use */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Wiring this into flows</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>The 75% rule</strong><br />
                  Send the replenishment reminder at ~75% of the median gap — early enough to beat the &ldquo;running low, reorder anywhere&rdquo; moment, late enough not to annoy.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Set it up in Klaviyo / WhatsApp</strong><br />
                  Create a flow triggered on purchase of each product above, delayed by its &ldquo;Nudge On&rdquo; day. Combine with the <Link href={`/dashboard/${slug}/segments`} style={{ color: 'var(--accent-blue)' }}>Promising segment</Link> export for one-time buyers.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Why this is your #1 lever</strong><br />
                  Your repurchase rate is ~4% (see <Link href={`/dashboard/${slug}/cohorts`} style={{ color: 'var(--accent-blue)' }}>Cohorts</Link>) and CAC never pays back on one order (see <Link href={`/dashboard/${slug}/payback`} style={{ color: 'var(--accent-blue)' }}>Payback</Link>). Every point of repurchase rate is worth more than any ad optimisation.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
