'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function pct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }
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
  cogsCost: number;
  shippingCost: number;
  returnCost: number;
  netRevenue: number;
  grossProfit: number;
  contributionMargin: number;
  mer: number;
  grossMarginPct: number;
  netMarginPct: number;
  breakEvenRoas: number;
  cogsPercent: number;
  avgShippingCost: number;
  avgReturnRate: number;
  dailySeries: { date: string; revenue: number; adSpend: number; cogs: number; profit: number }[];
}

interface CogSettings {
  cogsPercent: string;
  avgShippingCost: string;
  avgReturnRate: string;
}

export default function ProfitPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settings, setSettings] = useState<CogSettings>({ cogsPercent: '', avgShippingCost: '', avgReturnRate: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/profit?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setSettings({
          cogsPercent: d.cogsPercent ? String(d.cogsPercent) : '',
          avgShippingCost: d.avgShippingCost ? String(d.avgShippingCost) : '',
          avgReturnRate: d.avgReturnRate ? String(d.avgReturnRate) : '',
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    setSaving(true);
    setSaveMsg('');
    try {
      const r = await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cogsPercent: settings.cogsPercent ? parseFloat(settings.cogsPercent) : null,
          avgShippingCost: settings.avgShippingCost ? parseFloat(settings.avgShippingCost) : null,
          avgReturnRate: settings.avgReturnRate ? parseFloat(settings.avgReturnRate) : null,
        }),
      });
      if (r.ok) {
        setSaveMsg('Saved!');
        setEditingSettings(false);
        load();
      } else {
        setSaveMsg('Save failed');
      }
    } catch {
      setSaveMsg('Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  const noSettings = !data?.cogsPercent && !data?.avgShippingCost;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              💰 Profitability
            </h2>
            <p>P&amp;L breakdown — Revenue vs Costs vs Contribution Margin</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setEditingSettings(v => !v)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ⚙️ Cost Settings
            </button>
            <DateRangeDropdown />
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* Cost Settings Panel */}
        {(editingSettings || noSettings) && (
          <div className="chart-card" style={{ marginBottom: '24px', background: noSettings ? 'rgba(59,130,246,0.04)' : 'var(--bg-card)', borderColor: noSettings ? 'rgba(59,130,246,0.2)' : 'var(--glass-border)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">⚙️ Cost Settings</div>
                <div className="chart-card-subtitle">{noSettings ? 'Set your costs to see true profitability — these are stored per brand' : 'Update your cost assumptions'}</div>
              </div>
              {saveMsg && <span style={{ fontSize: '12px', color: saveMsg === 'Saved!' ? '#22c55e' : '#f43f5e', fontWeight: 600 }}>{saveMsg}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
              {[
                { key: 'cogsPercent', label: 'COGS %', placeholder: 'e.g. 35', suffix: '%', help: 'Cost of goods as % of revenue' },
                { key: 'avgShippingCost', label: 'Avg Shipping / Order', placeholder: 'e.g. 80', suffix: '₹', help: 'Average fulfilment cost per order' },
                { key: 'avgReturnRate', label: 'Return Rate', placeholder: 'e.g. 3', suffix: '%', help: 'Average % of revenue from returns' },
              ].map(f => (
                <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={settings[f.key as keyof CogSettings]}
                      onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      min="0" max={f.suffix === '%' ? '100' : undefined} step="0.1"
                      style={{ paddingRight: '32px' }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '13px' }}>{f.suffix}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{f.help}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving ? 'Saving…' : '💾 Save Cost Settings'}
              </button>
              {!noSettings && (
                <button onClick={() => setEditingSettings(false)} className="btn btn-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="kpi-card"><div className="skeleton skeleton-text" style={{ width: '60%' }} /><div className="skeleton skeleton-text" style={{ width: '40%', height: '28px', margin: '8px 0' }} /></div>
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
            {/* Waterfall KPIs */}
            <div style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📊 P&amp;L Waterfall</div>
                    <div className="chart-card-subtitle">Revenue → deductions → contribution margin</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {[
                    { label: 'Gross Revenue', value: data.shopifyRevenue, type: 'revenue', icon: '💚', sub: `${data.shopifyOrders.toLocaleString('en-IN')} orders` },
                    { label: 'Returns / Refunds', value: -data.returnCost, type: 'deduct', icon: '🔴', sub: data.avgReturnRate ? `${data.avgReturnRate}% return rate` : 'Set return rate in settings' },
                    { label: 'Net Revenue', value: data.netRevenue, type: 'subtotal', icon: '📥', sub: '' },
                    { label: 'Cost of Goods (COGS)', value: -data.cogsCost, type: 'deduct', icon: '🔴', sub: data.cogsPercent ? `${data.cogsPercent}% of revenue` : 'Set COGS % in settings' },
                    { label: 'Gross Profit', value: data.grossProfit, type: 'subtotal', icon: '📊', sub: `${data.grossMarginPct.toFixed(1)}% margin` },
                    { label: 'Meta Ad Spend', value: -data.metaSpend, type: 'deduct', icon: '🔴', sub: data.metaSpend > 0 ? `MER ${(data.shopifyRevenue / (data.metaSpend + data.googleSpend || 1)).toFixed(2)}x` : 'Not connected' },
                    { label: 'Google Ad Spend', value: -data.googleSpend, type: 'deduct', icon: '🔴', sub: data.googleSpend > 0 ? `${((data.googleSpend / data.totalAdSpend) * 100).toFixed(0)}% of total spend` : 'Not connected' },
                    { label: 'Shipping / Fulfilment', value: -data.shippingCost, type: 'deduct', icon: '🔴', sub: data.avgShippingCost ? `₹${data.avgShippingCost}/order × ${data.shopifyOrders} orders` : 'Set shipping cost in settings' },
                    { label: 'Contribution Margin', value: data.contributionMargin, type: 'result', icon: data.contributionMargin >= 0 ? '✅' : '❌', sub: `${data.netMarginPct.toFixed(1)}% net margin` },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 4px',
                      borderBottom: row.type !== 'result' ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: row.type === 'result' ? (data.contributionMargin >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : row.type === 'subtotal' ? 'rgba(255,255,255,0.02)' : 'transparent',
                      borderRadius: row.type === 'result' ? '8px' : '0',
                      marginTop: row.type === 'result' ? '4px' : '0',
                    }}>
                      <div style={{ width: '28px', textAlign: 'center', fontSize: '16px' }}>{row.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: row.type === 'result' || row.type === 'subtotal' ? 700 : 400, color: row.type === 'subtotal' || row.type === 'result' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {row.label}
                        </div>
                        {row.sub && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>{row.sub}</div>}
                      </div>
                      <div style={{
                        fontWeight: row.type === 'result' || row.type === 'subtotal' ? 700 : 500,
                        fontSize: row.type === 'result' ? '18px' : '14px',
                        color: row.value >= 0
                          ? (row.type === 'deduct' ? 'var(--text-primary)' : '#22c55e')
                          : '#f43f5e',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}>
                        {row.value >= 0 ? '' : '− '}{fmt(Math.abs(row.value))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'MER (Blended ROAS)', value: data.mer.toFixed(2) + 'x', sub: 'Revenue ÷ Total Ad Spend', color: data.mer >= 3 ? '#22c55e' : data.mer >= 1.5 ? '#f59e0b' : '#f43f5e' },
                { label: 'Gross Margin', value: data.grossMarginPct.toFixed(1) + '%', sub: 'After COGS', color: data.grossMarginPct >= 50 ? '#22c55e' : data.grossMarginPct >= 30 ? '#f59e0b' : '#f43f5e' },
                { label: 'Net Margin', value: data.netMarginPct.toFixed(1) + '%', sub: 'After all costs', color: data.netMarginPct >= 15 ? '#22c55e' : data.netMarginPct >= 5 ? '#f59e0b' : '#f43f5e' },
                { label: 'Break-even ROAS', value: data.breakEvenRoas > 0 ? data.breakEvenRoas.toFixed(2) + 'x' : 'Set COGS', sub: 'Min ROAS to not lose money', color: 'var(--text-secondary)' },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Spend breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Ad Spend Split */}
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📱 Ad Spend Split</div>
                    <div className="chart-card-subtitle">Meta vs Google — total {fmt(data.totalAdSpend)}</div>
                  </div>
                </div>
                {data.totalAdSpend > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                    {[
                      { label: 'Meta Ads', spend: data.metaSpend, revenue: data.metaRevenue, color: '#3b82f6' },
                      { label: 'Google Ads', spend: data.googleSpend, revenue: data.googleRevenue, color: '#10b981' },
                    ].filter(r => r.spend > 0).map(r => (
                      <div key={r.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r.label}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{fmt(r.spend)}</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${data.totalAdSpend > 0 ? (r.spend / data.totalAdSpend) * 100 : 0}%`, background: r.color, borderRadius: '4px' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
                          {data.totalAdSpend > 0 ? `${((r.spend / data.totalAdSpend) * 100).toFixed(0)}% of spend` : ''} · Attributed revenue: {fmt(r.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontSize: '13px' }}>
                    No ad spend data · <Link href={`/dashboard/${slug}/settings`} style={{ color: 'var(--accent-blue)' }}>Connect Meta or Google Ads</Link>
                  </div>
                )}
              </div>

              {/* Cost Breakdown Donut */}
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">🥧 Cost Breakdown</div>
                    <div className="chart-card-subtitle">Where each rupee of revenue goes</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                  {[
                    { label: 'COGS', value: data.cogsCost, color: '#f43f5e' },
                    { label: 'Ad Spend', value: data.totalAdSpend, color: '#f59e0b' },
                    { label: 'Shipping', value: data.shippingCost, color: '#8b5cf6' },
                    { label: 'Returns', value: data.returnCost, color: '#06b6d4' },
                    { label: 'Contribution Margin', value: Math.max(0, data.contributionMargin), color: '#22c55e' },
                  ].map(r => {
                    const pctVal = data.shopifyRevenue > 0 ? (r.value / data.shopifyRevenue) * 100 : 0;
                    return (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: r.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{r.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', width: '40px', textAlign: 'right' }}>{pctVal.toFixed(1)}%</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, width: '90px', textAlign: 'right' }}>{fmt(r.value)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Trend chart */}
            {data.dailySeries.length > 1 && (
              <div className="chart-card" style={{ marginBottom: '24px' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📈 Revenue vs Costs vs Profit</div>
                    <div className="chart-card-subtitle">Daily trend — green = profitable days</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.dailySeries} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tickFormatter={fmtDate} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value, name) => [fmt(Number(value)), name]}
                      labelFormatter={(d) => fmtDate(String(d))}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="adSpend" name="Ad Spend" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                    <Area type="monotone" dataKey="profit" name="Contribution Margin" stroke="#22c55e" fill="url(#profGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Profitability alert */}
            {data.netMarginPct < 0 && (
              <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '24px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>Negative Contribution Margin</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    You are spending more than you are earning after all costs. Current net margin: <strong style={{ color: '#f87171' }}>{data.netMarginPct.toFixed(1)}%</strong>.
                    {data.breakEvenRoas > 0 && <> You need a blended ROAS of at least <strong>{data.breakEvenRoas.toFixed(2)}x</strong> to break even, but your current MER is <strong>{data.mer.toFixed(2)}x</strong>.</>}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <Link href={`/dashboard/${slug}/ads`} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                      📱 Review Ads
                    </Link>
                    <button onClick={() => setEditingSettings(true)} className="btn btn-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                      ⚙️ Update Cost Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MER explanation */}
            <div className="chart-card" style={{ marginBottom: '24px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to read this</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>MER vs ROAS</strong><br />
                  MER (Marketing Efficiency Ratio) = Total Revenue ÷ Total Ad Spend. Unlike Meta ROAS, this uses actual Shopify revenue — not attributed. Always trust MER over platform-reported ROAS.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Break-even ROAS</strong><br />
                  The minimum blended ROAS needed to cover COGS + shipping. Formula: 1 ÷ (1 − COGS% − Shipping%). If your MER is below this, every rupee spent on ads loses money.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Contribution Margin</strong><br />
                  Revenue − COGS − Ad Spend − Shipping − Returns. This is what remains to cover overheads (salaries, warehouse, etc.) and become actual profit.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
