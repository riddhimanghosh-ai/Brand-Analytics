'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
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

interface ProfitData {
  shopifyRevenue: number;
  shopifyOrders: number;
  metaSpend: number;
  metaRevenue: number;
  googleSpend: number;
  googleRevenue: number;
  totalAdSpend: number;
  mer: number;
  breakEvenRoas: number;
  cogsPercent: number;
  dailySeries: { date: string; revenue: number; adSpend: number; cogs: number; profit: number }[];
}

export default function MerPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/profit?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const metaRoas = data && data.metaSpend > 0 ? data.metaRevenue / data.metaSpend : 0;
  const googleRoas = data && data.googleSpend > 0 ? data.googleRevenue / data.googleSpend : 0;
  // aMER: ad spend as % of total revenue (a.k.a. marketing cost ratio)
  const adSpendPct = data && data.shopifyRevenue > 0 ? (data.totalAdSpend / data.shopifyRevenue) * 100 : 0;

  // Daily MER series — only days where there was spend
  const series = (data?.dailySeries ?? []).map(d => ({
    ...d,
    mer: d.adSpend > 0 ? +(d.revenue / d.adSpend).toFixed(2) : null,
  }));

  const merColor = (m: number) => m >= 4 ? '#22c55e' : m >= 2.5 ? '#f59e0b' : '#f43f5e';

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              ⚖️ Blended ROAS (MER)
            </h2>
            <p>Total Shopify revenue ÷ total ad spend — the only ROAS that can&apos;t lie</p>
          </div>
          <DateRangeDropdown />
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
            {/* Hero MER */}
            <div className="chart-card" style={{ marginBottom: '24px', textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Marketing Efficiency Ratio
              </div>
              <div style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-0.04em', color: merColor(data.mer), lineHeight: 1 }}>
                {data.totalAdSpend > 0 ? `${data.mer.toFixed(2)}x` : '—'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '10px' }}>
                {fmt(data.shopifyRevenue)} revenue ÷ {fmt(data.totalAdSpend)} ad spend
                {data.breakEvenRoas > 0 && (
                  <> · break-even at <strong style={{ color: data.mer >= data.breakEvenRoas ? '#22c55e' : '#f43f5e' }}>{data.breakEvenRoas.toFixed(2)}x</strong></>
                )}
              </div>
              {data.totalAdSpend === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px' }}>
                  No ad spend found · <Link href={`/dashboard/${slug}/settings`} style={{ color: 'var(--accent-blue)' }}>Connect ad platforms</Link>
                </div>
              )}
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Ad Spend % of Revenue', value: adSpendPct > 0 ? `${adSpendPct.toFixed(1)}%` : '—',
                  sub: 'Lower is more efficient', color: adSpendPct > 0 && adSpendPct <= 25 ? '#22c55e' : adSpendPct <= 40 ? '#f59e0b' : '#f43f5e',
                },
                {
                  label: 'Meta ROAS (platform)', value: metaRoas > 0 ? `${metaRoas.toFixed(2)}x` : '—',
                  sub: `${fmt(data.metaSpend)} spend · attributed ${fmt(data.metaRevenue)}`, color: 'var(--text-primary)',
                },
                {
                  label: 'Google ROAS (platform)', value: googleRoas > 0 ? `${googleRoas.toFixed(2)}x` : '—',
                  sub: `${fmt(data.googleSpend)} spend · attributed ${fmt(data.googleRevenue)}`, color: 'var(--text-primary)',
                },
                {
                  label: 'Attribution Gap', value: data.totalAdSpend > 0 && (data.metaRevenue + data.googleRevenue) > 0
                    ? `${(((data.metaRevenue + data.googleRevenue) / data.shopifyRevenue) * 100).toFixed(0)}%`
                    : '—',
                  sub: 'Of revenue claimed by ad platforms', color: 'var(--text-secondary)',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Daily chart */}
            {series.length > 1 && (
              <div className="chart-card" style={{ marginBottom: '24px' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📈 Daily Revenue vs Spend vs MER</div>
                    <div className="chart-card-subtitle">Bars = money in/out · line = daily MER (right axis)</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tickFormatter={fmtDate} />
                    <YAxis yAxisId="money" stroke="var(--text-dim)" fontSize={11} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis yAxisId="mer" orientation="right" stroke="#a78bfa" fontSize={11} tickFormatter={v => `${v}x`} />
                    <Tooltip
                      formatter={(value, name) => name === 'MER' ? [`${value}x`, name] : [fmt(Number(value)), name]}
                      labelFormatter={(d) => fmtDate(String(d))}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar yAxisId="money" dataKey="revenue" name="Revenue" fill="#3b82f6" opacity={0.75} radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="money" dataKey="adSpend" name="Ad Spend" fill="#f59e0b" opacity={0.75} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="mer" type="monotone" dataKey="mer" name="MER" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    {data.breakEvenRoas > 0 && (
                      <ReferenceLine yAxisId="mer" y={data.breakEvenRoas} stroke="#f43f5e" strokeDasharray="5 3" label={{ value: 'Break-even', fontSize: 10, fill: '#f43f5e', position: 'insideTopRight' }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Explanation */}
            <div className="chart-card" style={{ background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Why MER beats platform ROAS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>No attribution games</strong><br />
                  Meta and Google both claim credit for the same sale. MER uses actual Shopify revenue, so platforms can&apos;t inflate their numbers.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>The attribution gap</strong><br />
                  If platforms together claim more than ~100% of your revenue, they are over-attributing. If far below, your tracking is leaky.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Healthy zones</strong><br />
                  <span style={{ color: '#22c55e' }}>≥ 4x great</span> · <span style={{ color: '#f59e0b' }}>2.5–4x typical D2C</span> · <span style={{ color: '#f43f5e' }}>&lt; 2.5x check break-even</span>. Always compare against YOUR break-even ROAS from the Profitability page.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
