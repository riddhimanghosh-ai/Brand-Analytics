'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie,
} from 'recharts';
import type {
  MetaKPIs, MetaCampaign, MetaSpendPoint, MetaAdSet, MetaAd,
  MetaFunnel, MetaBreakdownRow, MetaAdCommentAnalytics,
} from '@/lib/services/meta';
import type { GoogleAdsKPIs, GoogleAdsCampaign, GoogleAdsSpendPoint } from '@/lib/services/google-ads';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function formatDateLabel(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function SpendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label ? formatDateLabel(label) : ''}</div>
      {payload.map((p, i) => (
        <div key={i} className="value" style={{ color: p.color }}>
          {p.name}: {p.name.toLowerCase().includes('spend') ? formatCurrency(p.value) : p.value.toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  );
}

// ---- Meta Ads Section ----
function FunnelStrip({ funnel }: { funnel: MetaFunnel }) {
  const stages = [
    { key: 'impressions', label: 'Impressions', value: funnel.impressions, color: '#60a5fa' },
    { key: 'reach', label: 'Reach', value: funnel.reach, color: '#3b82f6' },
    { key: 'linkClicks', label: 'Link Clicks', value: funnel.linkClicks, color: '#8b5cf6' },
    { key: 'addToCarts', label: 'Add to Cart', value: funnel.addToCarts, color: '#06b6d4' },
    { key: 'initiatedCheckouts', label: 'Initiate Checkout', value: funnel.initiatedCheckouts, color: '#f59e0b' },
    { key: 'purchases', label: 'Purchases', value: funnel.purchases, color: '#10b981' },
  ];
  const max = stages[0].value || 1;

  return (
    <div className="chart-card" style={{ marginTop: '24px' }}>
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">🛒 Conversion Funnel</div>
          <div className="chart-card-subtitle">From impression to purchase — with drop-off at each step</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px' }}>
        {stages.map((s, i) => {
          const pct = (s.value / max) * 100;
          const prev = i > 0 ? stages[i - 1].value : null;
          const stagePct = prev && prev > 0 ? (s.value / prev) * 100 : null;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '140px', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</div>
              <div style={{ flex: 1, position: 'relative', height: '30px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.max(pct, 1.5)}%`,
                  background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`,
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', paddingLeft: '12px',
                  fontSize: '12px', fontWeight: 600, color: '#0f172a',
                }}>
                  {formatNum(s.value)}
                </div>
              </div>
              <div style={{ width: '120px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)' }}>
                {stagePct != null ? `${stagePct.toFixed(1)}% step · ${((s.value / max) * 100).toFixed(2)}% of top` : `${pct.toFixed(2)}% baseline`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownCard({ title, subtitle, rows, max = 6 }: { title: string; subtitle: string; rows: MetaBreakdownRow[]; max?: number }) {
  if (!rows.length) return null;
  const top = rows.slice(0, max);
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          <div className="chart-card-subtitle">{subtitle}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={top} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" stroke="var(--text-dim)" fontSize={11} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
          <YAxis type="category" dataKey="label" stroke="var(--text-dim)" fontSize={11} width={130} />
          <Tooltip
            formatter={(value, name) => {
              const n = Number(value ?? 0);
              return name === 'spend' ? formatCurrency(n) : n.toLocaleString('en-IN');
            }}
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
          />
          <Bar dataKey="spend" name="Spend" radius={[0, 4, 4, 0]}>
            {top.map((r, i) => (
              <Cell key={i} fill={r.roas >= 3 ? '#10b981' : r.roas >= 1.5 ? '#f59e0b' : '#f43f5e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ padding: '8px 4px 0', fontSize: '11px', color: 'var(--text-dim)' }}>
        Bars colored by ROAS · <span style={{ color: '#10b981' }}>≥3x</span> · <span style={{ color: '#f59e0b' }}>≥1.5x</span> · <span style={{ color: '#f43f5e' }}>&lt;1.5x</span>
      </div>
    </div>
  );
}

function MetaSection({ slug, from, to, connected }: { slug: string; from: string; to: string; connected: boolean }) {
  const [kpis, setKpis] = useState<MetaKPIs | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [adsets, setAdsets] = useState<MetaAdSet[]>([]);
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [spend, setSpend] = useState<MetaSpendPoint[]>([]);
  const [funnel, setFunnel] = useState<MetaFunnel | null>(null);
  const [demographics, setDemographics] = useState<MetaBreakdownRow[]>([]);
  const [placements, setPlacements] = useState<MetaBreakdownRow[]>([]);
  const [devices, setDevices] = useState<MetaBreakdownRow[]>([]);
  const [countries, setCountries] = useState<MetaBreakdownRow[]>([]);
  const [commentAnalytics, setCommentAnalytics] = useState<MetaAdCommentAnalytics | null>(null);
  const [activeTable, setActiveTable] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!connected) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const q = `slug=${slug}&platform=meta&from=${from}&to=${to}`;
    Promise.all([
      fetch(`/api/ads?${q}&action=kpis`).then((r) => r.json()),
      fetch(`/api/ads?${q}&action=campaigns`).then((r) => r.json()),
      fetch(`/api/ads?${q}&action=adsets`).then((r) => r.json()).catch(() => []),
      fetch(`/api/ads?${q}&action=ads`).then((r) => r.json()).catch(() => []),
      fetch(`/api/ads?${q}&action=spend`).then((r) => r.json()),
      fetch(`/api/ads?${q}&action=demographics`).then((r) => r.json()).catch(() => []),
      fetch(`/api/ads?${q}&action=placements`).then((r) => r.json()).catch(() => []),
      fetch(`/api/ads?${q}&action=devices`).then((r) => r.json()).catch(() => []),
      fetch(`/api/ads?${q}&action=countries`).then((r) => r.json()).catch(() => []),
      fetch(`/api/ads?${q}&action=comment_analytics`).then((r) => r.json()).catch(() => null),
    ])
      .then(([k, c, as, a, s, dem, pl, dev, ctry, cm]) => {
        if (k?.error) { setError(k.error); return; }
        setKpis(k);
        setCampaigns(Array.isArray(c) ? c : []);
        setAdsets(Array.isArray(as) ? as : []);
        setAds(Array.isArray(a) ? a : []);
        setSpend(Array.isArray(s) ? s : []);
        setDemographics(Array.isArray(dem) ? dem : []);
        setPlacements(Array.isArray(pl) ? pl : []);
        setDevices(Array.isArray(dev) ? dev : []);
        setCountries(Array.isArray(ctry) ? ctry : []);
        setCommentAnalytics(cm && !cm.error ? cm : null);
        if (k) {
          setFunnel({
            impressions: k.impressions,
            reach: k.reach,
            linkClicks: k.linkClicks || k.clicks,
            addToCarts: k.addToCarts,
            initiatedCheckouts: k.initiatedCheckouts,
            purchases: k.purchases,
          });
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to, connected]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!connected) {
    return (
      <div className="connection-required" style={{ marginTop: '16px' }}>
        <div className="cr-icon">📱</div>
        <h3>Meta Ads Not Connected</h3>
        <p>Connect your Facebook / Instagram ad account to see campaign performance, ROAS, and spend analytics.</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">⚙️ Connect Meta Ads</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <div className="kpi-grid" style={{ marginTop: '16px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-title" />
            </div>
          ))}
        </div>
        <div className="chart-card" style={{ marginTop: '16px' }}><div className="skeleton skeleton-chart" /></div>
      </>
    );
  }

  if (error) {
    return (
      <div className="connection-required" style={{ marginTop: '16px' }}>
        <div className="cr-icon">⚠️</div>
        <h3>Error Loading Meta Ads</h3>
        <p>{error}</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary">Check Settings</Link>
      </div>
    );
  }

  if (!kpis) return null;

  const placementPie = placements.slice(0, 6).map((p) => ({ name: p.label, value: p.spend }));

  return (
    <>
      {/* Headline KPIs */}
      <div className="kpi-grid" style={{ marginTop: '16px' }}>
        <div className="kpi-card blue">
          <div className="kpi-icon">💸</div>
          <div className="kpi-label">Total Spend</div>
          <div className="kpi-value">{formatCurrency(kpis.spend)}</div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Purchase ROAS</div>
          <div className="kpi-value">{kpis.roas.toFixed(2)}x</div>
          <div className="kpi-subtext">{kpis.roas >= 3 ? 'Strong' : kpis.roas >= 1.5 ? 'Moderate' : 'Below target'}</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Purchase Revenue</div>
          <div className="kpi-value">{formatCurrency(kpis.purchaseValue)}</div>
          <div className="kpi-subtext">{kpis.purchases.toFixed(0)} purchases</div>
        </div>
        <div className="kpi-card rose">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-label">Cost / Purchase</div>
          <div className="kpi-value">{formatCurrency(kpis.costPerPurchase)}</div>
          <div className="kpi-subtext">CR: {kpis.conversionRate.toFixed(2)}%</div>
        </div>
        <div className="kpi-card violet">
          <div className="kpi-icon">👆</div>
          <div className="kpi-label">Link Clicks</div>
          <div className="kpi-value">{formatNum(kpis.linkClicks || kpis.clicks)}</div>
          <div className="kpi-subtext">{formatCurrency(kpis.costPerLinkClick || kpis.cpc)} / click</div>
        </div>
        <div className="kpi-card cyan">
          <div className="kpi-icon">👁️</div>
          <div className="kpi-label">Impressions</div>
          <div className="kpi-value">{formatNum(kpis.impressions)}</div>
          <div className="kpi-subtext">CPM: {formatCurrency(kpis.cpm)}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-label">Reach</div>
          <div className="kpi-value">{formatNum(kpis.reach)}</div>
          <div className="kpi-subtext">Freq: {kpis.frequency.toFixed(2)}x</div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-icon">📊</div>
          <div className="kpi-label">CTR / Unique CTR</div>
          <div className="kpi-value">{kpis.ctr.toFixed(2)}%</div>
          <div className="kpi-subtext">Unique: {kpis.uniqueCtr.toFixed(2)}%</div>
        </div>
      </div>

      {/* Secondary KPI row — conversion intermediates */}
      <div className="kpi-grid" style={{ marginTop: '16px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card cyan">
          <div className="kpi-icon">🛍️</div>
          <div className="kpi-label">Add to Cart</div>
          <div className="kpi-value">{formatNum(kpis.addToCarts)}</div>
          <div className="kpi-subtext">{formatCurrency(kpis.costPerAddToCart)} / ATC</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-icon">💳</div>
          <div className="kpi-label">Initiated Checkout</div>
          <div className="kpi-value">{formatNum(kpis.initiatedCheckouts)}</div>
          <div className="kpi-subtext">{formatCurrency(kpis.costPerInitiatedCheckout)} / IC</div>
        </div>
        <div className="kpi-card violet">
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">View Content</div>
          <div className="kpi-value">{formatNum(kpis.viewContent)}</div>
          <div className="kpi-subtext">Product page visits</div>
        </div>
        <div className="kpi-card rose">
          <div className="kpi-icon">🎬</div>
          <div className="kpi-label">Video Plays</div>
          <div className="kpi-value">{formatNum(kpis.videoPlays)}</div>
          <div className="kpi-subtext">{formatNum(kpis.videoCompletions)} watched to end</div>
        </div>
      </div>

      {/* ROAS alert */}
      {kpis && kpis.roas < 1 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>ROAS Below 1x — Spending More Than Earning</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Meta attributes ₹{kpis.roas.toFixed(2)} in purchase revenue per ₹1 spent. Check campaign-level breakdown below — pause underperforming campaigns and shift budget to ROAS &gt; 1x campaigns.
            </div>
          </div>
        </div>
      )}

      {/* Funnel */}
      {funnel && <FunnelStrip funnel={funnel} />}

      {/* Spend trend with revenue overlay */}
      {spend.length > 0 && (
        <div className="chart-card" style={{ marginTop: '24px' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Spend vs Revenue Over Time</div>
              <div className="chart-card-subtitle">Daily spend, clicks, and purchase revenue</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={spend}>
              <defs>
                <linearGradient id="metaSpendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="metaRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} />
              <Tooltip content={<SpendTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="spend" stroke="#3b82f6" fill="url(#metaSpendGrad)" strokeWidth={2} name="Spend (₹)" />
              <Area type="monotone" dataKey="purchaseValue" stroke="#10b981" fill="url(#metaRevGrad)" strokeWidth={2} name="Revenue (₹)" />
              <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" fill="none" strokeWidth={2} name="Clicks" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdowns row */}
      <div className="charts-grid cols-2" style={{ marginTop: '24px' }}>
        <BreakdownCard title="👥 Age × Gender" subtitle="Spend distribution by demographic — colored by ROAS" rows={demographics} />
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">📍 Placement Mix</div>
              <div className="chart-card-subtitle">Spend share across FB / IG / Stories / Reels</div>
            </div>
          </div>
          {placementPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={placementPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={2}>
                  {placementPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>No placement data for this period</div>
          )}
        </div>
      </div>

      <div className="charts-grid cols-2" style={{ marginTop: '24px' }}>
        <BreakdownCard title="📱 Devices" subtitle="Spend by device — iPhone, Android, desktop" rows={devices} />
        <BreakdownCard title="🎯 Placement Performance" subtitle="Where your spend converts best" rows={placements} max={6} />
      </div>

      {/* Countries + Frequency row */}
      <div className="charts-grid cols-2" style={{ marginTop: '24px' }}>
        <BreakdownCard title="🌍 Top Countries" subtitle="Spend distribution by country — colored by ROAS" rows={countries} max={8} />

        {kpis && (
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">🔁 Reach & Frequency</div>
                <div className="chart-card-subtitle">How many unique people saw your ads and how often</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              {/* Frequency gauge */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Frequency</span>
                  <span style={{
                    fontWeight: 600,
                    color: kpis.frequency > 5 ? '#f43f5e' : kpis.frequency > 3 ? '#f59e0b' : '#10b981'
                  }}>
                    {kpis.frequency.toFixed(2)}x
                    {kpis.frequency > 5 ? ' ⚠️ Oversaturated' : kpis.frequency > 3 ? ' · Refresh creatives soon' : ' · Healthy'}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((kpis.frequency / 7) * 100, 100)}%`,
                    background: kpis.frequency > 5 ? '#f43f5e' : kpis.frequency > 3 ? '#f59e0b' : '#10b981',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  <span>1x</span><span style={{ color: '#f59e0b' }}>3x refresh</span><span style={{ color: '#f43f5e' }}>5x saturated</span><span>7x</span>
                </div>
              </div>
              {/* Reach stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Unique Reach', value: formatNum(kpis.reach), color: '#3b82f6' },
                  { label: 'Impressions', value: formatNum(kpis.impressions), color: '#8b5cf6' },
                  { label: 'CPM', value: formatCurrency(kpis.cpm), color: '#f59e0b' },
                ].map((s) => (
                  <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Video completion if available */}
              {kpis.videoPlays > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Video Completion Rate</span>
                    <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                      {kpis.videoPlays > 0 ? ((kpis.videoCompletions / kpis.videoPlays) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${kpis.videoPlays > 0 ? Math.min((kpis.videoCompletions / kpis.videoPlays) * 100, 100) : 0}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      borderRadius: '4px',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <span>{formatNum(kpis.videoPlays)} plays</span>
                    <span>{formatNum(kpis.videoCompletions)} completed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {commentAnalytics && (
        <div className="chart-card" style={{ marginTop: '24px' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Comment Analytics</div>
              <div className="chart-card-subtitle">Ad-linked comment activity, with readable-text coverage where Meta allows it</div>
            </div>
          </div>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '16px' }}>
            {[
              { label: 'Comment Actions', value: commentAnalytics.summary.totalCommentActions, color: '#3b82f6' },
              { label: 'Readable Text', value: commentAnalytics.summary.readableComments, color: '#22c55e' },
              { label: 'Blocked Text', value: commentAnalytics.summary.unreadableCommentEstimate, color: '#f59e0b' },
              { label: 'Ads With Comments', value: commentAnalytics.summary.adsWithCommentActivity, color: '#8b5cf6' },
            ].map((item) => (
              <div key={item.label} className="kpi-card" style={{ textAlign: 'center' }}>
                <div className="kpi-value" style={{ color: item.color }}>{formatNum(item.value)}</div>
                <div className="kpi-label">{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Campaign / Ad set</th>
                  <th>Platform</th>
                  <th>Comment Actions</th>
                  <th>Readable Text</th>
                  <th>Spend</th>
                  <th>Inbox</th>
                </tr>
              </thead>
              <tbody>
                {commentAnalytics.ads.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>No ad comment activity in this date range.</td></tr>
                ) : commentAnalytics.ads.slice(0, 12).map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {ad.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ad.thumbnailUrl} alt="" width={36} height={36} style={{ borderRadius: '6px', objectFit: 'cover', flex: 'none' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flex: 'none' }}>💬</div>
                        )}
                        <div className="highlight" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', lineHeight: 1.3 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.campaignName ?? '—'}</div>
                      <div style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.adsetName ?? ''}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{ad.platform}</td>
                    <td className="mono">{formatNum(ad.comments)}</td>
                    <td>
                      <span className={`badge ${ad.textAvailable ? 'green' : 'amber'}`}>
                        {ad.textAvailable ? `${formatNum(ad.readableComments)} readable` : `${formatNum(ad.unreadableCommentEstimate)} blocked`}
                      </span>
                    </td>
                    <td className="mono">{formatCurrency(ad.spend)}</td>
                    <td><Link href={`/dashboard/${slug}/social?adId=${encodeURIComponent(ad.id)}`}>Open inbox</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hierarchy tables — switch between Campaigns / Ad Sets / Ads */}
      <div className="data-table-wrapper" style={{ marginTop: '24px' }}>
        <div className="data-table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="data-table-title">📋 Performance Breakdown</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['campaigns', 'adsets', 'ads'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: activeTable === t ? 'var(--accent-blue)' : 'var(--bg-card)',
                  color: activeTable === t ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)', cursor: 'pointer', fontSize: '12px',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'adsets' ? 'Ad Sets' : t} ({t === 'campaigns' ? campaigns.length : t === 'adsets' ? adsets.length : ads.length})
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {activeTable === 'campaigns' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Spend</th>
                  <th>Reach</th>
                  <th>Impressions</th>
                  <th>Link Clicks</th>
                  <th>CTR</th>
                  <th>CPC</th>
                  <th>ATC</th>
                  <th>IC</th>
                  <th>ATC→IC%</th>
                  <th>IC→Pur%</th>
                  <th>Purchases</th>
                  <th>Revenue</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="highlight" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td className="mono">{formatCurrency(c.spend)}</td>
                    <td className="mono">{formatNum(c.reach)}</td>
                    <td className="mono">{formatNum(c.impressions)}</td>
                    <td className="mono">{formatNum(c.linkClicks || c.clicks)}</td>
                    <td className="mono">{c.ctr.toFixed(2)}%</td>
                    <td className="mono">{formatCurrency(c.cpc)}</td>
                    <td className="mono">{formatNum(c.addToCarts)}</td>
                    <td className="mono">{formatNum(c.initiatedCheckouts)}</td>
                    <td className="mono">{c.addToCarts > 0 ? ((c.initiatedCheckouts / c.addToCarts) * 100).toFixed(0) + '%' : '—'}</td>
                    <td className="mono">{c.initiatedCheckouts > 0 ? ((c.purchases / c.initiatedCheckouts) * 100).toFixed(0) + '%' : '—'}</td>
                    <td className="mono">{c.purchases.toFixed(0)}</td>
                    <td className="mono">{formatCurrency(c.purchaseValue)}</td>
                    <td>
                      <span className={`badge ${c.roas >= 2 ? 'green' : c.roas >= 1 ? 'amber' : 'rose'}`}>
                        {c.roas.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTable === 'adsets' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad Set</th>
                  <th>Campaign</th>
                  <th>Spend</th>
                  <th>Reach</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>CPC</th>
                  <th>Purchases</th>
                  <th>Revenue</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {adsets.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>No ad sets in this date range.</td></tr>
                ) : adsets.map((a) => (
                  <tr key={a.id}>
                    <td className="highlight" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campaignName ?? '—'}</td>
                    <td className="mono">{formatCurrency(a.spend)}</td>
                    <td className="mono">{formatNum(a.reach)}</td>
                    <td className="mono">{formatNum(a.impressions)}</td>
                    <td className="mono">{formatNum(a.clicks)}</td>
                    <td className="mono">{a.ctr.toFixed(2)}%</td>
                    <td className="mono">{formatCurrency(a.cpc)}</td>
                    <td className="mono">{a.purchases.toFixed(0)}</td>
                    <td className="mono">{formatCurrency(a.purchaseValue)}</td>
                    <td>
                      <span className={`badge ${a.roas >= 2 ? 'green' : a.roas >= 1 ? 'amber' : 'rose'}`}>
                        {a.roas.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTable === 'ads' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Campaign / Ad set</th>
                  <th>Spend</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>CPC</th>
                  <th>Purchases</th>
                  <th>Revenue</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {ads.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>No ads in this date range.</td></tr>
                ) : ads.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {a.thumbnailUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={a.thumbnailUrl} alt="" width={40} height={40} style={{ borderRadius: '6px', objectFit: 'cover', flex: 'none' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flex: 'none' }}>🎯</div>
                        )}
                        <div className="highlight" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', lineHeight: 1.3 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campaignName ?? '—'}</div>
                      <div style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.adsetName ?? ''}</div>
                    </td>
                    <td className="mono">{formatCurrency(a.spend)}</td>
                    <td className="mono">{formatNum(a.impressions)}</td>
                    <td className="mono">{formatNum(a.clicks)}</td>
                    <td className="mono">{a.ctr.toFixed(2)}%</td>
                    <td className="mono">{formatCurrency(a.cpc)}</td>
                    <td className="mono">{a.purchases.toFixed(0)}</td>
                    <td className="mono">{formatCurrency(a.purchaseValue)}</td>
                    <td>
                      <span className={`badge ${a.roas >= 2 ? 'green' : a.roas >= 1 ? 'amber' : 'rose'}`}>
                        {a.roas.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Google Ads Section ----
function GoogleAdsSection({ slug, from, to, connected, configError }: { slug: string; from: string; to: string; connected: boolean; configError?: string | null }) {
  const [kpis, setKpis] = useState<GoogleAdsKPIs | null>(null);
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [spend, setSpend] = useState<GoogleAdsSpendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!connected) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/ads?slug=${slug}&platform=google&action=kpis&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/ads?slug=${slug}&platform=google&action=campaigns&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/ads?slug=${slug}&platform=google&action=spend&from=${from}&to=${to}`).then((r) => r.json()),
    ])
      .then(([k, c, s]) => {
        if (k.error) { setError(k.error); return; }
        setKpis(k);
        setCampaigns(Array.isArray(c) ? c : []);
        setSpend(Array.isArray(s) ? s : []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to, connected]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!connected) {
    return (
      <div className="connection-required" style={{ marginTop: '16px' }}>
        <div className="cr-icon">🔍</div>
        <h3>Google Ads Not Connected</h3>
        <p>Connect your Google Ads account to see search, shopping, and display campaign performance.</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">⚙️ Connect Google Ads</Link>
      </div>
    );
  }

  // Connected (OAuth done) but server is misconfigured — surface the actual error
  if (configError) {
    return (
      <div className="connection-required" style={{ marginTop: '16px' }}>
        <div className="cr-icon">⚠️</div>
        <h3>Google Ads — Server Configuration Issue</h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-amber)', maxWidth: '600px' }}>{configError}</p>
        <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          OAuth is complete — but the API can&apos;t fetch data until the env vars above are set in Amplify (and the app is redeployed).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <div className="kpi-grid" style={{ marginTop: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-title" />
            </div>
          ))}
        </div>
        <div className="chart-card" style={{ marginTop: '16px' }}><div className="skeleton skeleton-chart" /></div>
      </>
    );
  }

  if (error) {
    return (
      <div className="connection-required" style={{ marginTop: '16px' }}>
        <div className="cr-icon">⚠️</div>
        <h3>Error Loading Google Ads</h3>
        <p>{error}</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary">Check Settings</Link>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <>
      <div className="kpi-grid" style={{ marginTop: '16px' }}>
        <div className="kpi-card blue">
          <div className="kpi-icon">💸</div>
          <div className="kpi-label">Total Spend</div>
          <div className="kpi-value">{formatCurrency(kpis.spend)}</div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">ROAS</div>
          <div className="kpi-value">{kpis.roas.toFixed(2)}x</div>
          <div className="kpi-subtext">{kpis.roas >= 3 ? 'Strong' : kpis.roas >= 1.5 ? 'Moderate' : 'Below target'}</div>
        </div>
        <div className="kpi-card violet">
          <div className="kpi-icon">👆</div>
          <div className="kpi-label">Clicks</div>
          <div className="kpi-value">{formatNum(kpis.clicks)}</div>
          <div className="kpi-subtext">CTR: {kpis.ctr.toFixed(2)}%</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-label">Conversions</div>
          <div className="kpi-value">{formatNum(Math.round(kpis.conversions))}</div>
          <div className="kpi-subtext">Value: {formatCurrency(kpis.conversionValue)}</div>
        </div>
        <div className="kpi-card cyan">
          <div className="kpi-icon">👁️</div>
          <div className="kpi-label">Impressions</div>
          <div className="kpi-value">{formatNum(kpis.impressions)}</div>
          <div className="kpi-subtext">Avg CPC: {formatCurrency(kpis.avgCpc)}</div>
        </div>
        <div className="kpi-card rose">
          <div className="kpi-icon">💡</div>
          <div className="kpi-label">Cost / Conversion</div>
          <div className="kpi-value">{formatCurrency(kpis.costPerConversion)}</div>
        </div>
      </div>

      {spend.length > 0 && (
        <div className="chart-card" style={{ marginTop: '24px' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Spend & Conversions Over Time</div>
              <div className="chart-card-subtitle">Daily Google Ads spend and conversion volume</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={spend}>
              <defs>
                <linearGradient id="gadsSpendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} />
              <Tooltip content={<SpendTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="spend" stroke="#10b981" fill="url(#gadsSpendGrad)" strokeWidth={2} name="Spend (₹)" />
              <Area type="monotone" dataKey="conversions" stroke="#f59e0b" fill="none" strokeWidth={2} name="Conversions" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="data-table-wrapper" style={{ marginTop: '24px' }}>
          <div className="data-table-header">
            <div className="data-table-title">📋 Campaign Performance</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Spend</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Avg CPC</th>
                  <th>Conversions</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="highlight" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td>
                      <span className={`badge ${c.status === 'ENABLED' ? 'green' : c.status === 'PAUSED' ? 'amber' : 'gray'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="mono">{formatCurrency(c.spend)}</td>
                    <td className="mono">{formatNum(c.impressions)}</td>
                    <td className="mono">{formatNum(c.clicks)}</td>
                    <td className="mono">{c.ctr.toFixed(2)}%</td>
                    <td className="mono">{formatCurrency(c.avgCpc)}</td>
                    <td className="mono">{c.conversions.toFixed(1)}</td>
                    <td>
                      <span className={`badge ${c.roas >= 3 ? 'green' : c.roas >= 1.5 ? 'amber' : c.roas > 0 ? 'rose' : 'gray'}`}>
                        {c.roas > 0 ? `${c.roas.toFixed(2)}x` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ---- Combined Overview ----
function CombinedSection({ slug, from, to, metaConnected, googleConnected }: {
  slug: string; from: string; to: string; metaConnected: boolean; googleConnected: boolean;
}) {
  const [metaKpis, setMetaKpis] = useState<MetaKPIs | null>(null);
  const [googleKpis, setGoogleKpis] = useState<GoogleAdsKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<void>[] = [];
    if (metaConnected) {
      fetches.push(
        fetch(`/api/ads?slug=${slug}&platform=meta&action=kpis&from=${from}&to=${to}`)
          .then((r) => r.json())
          .then((k) => { if (!k.error) setMetaKpis(k); })
      );
    }
    if (googleConnected) {
      fetches.push(
        fetch(`/api/ads?slug=${slug}&platform=google&action=kpis&from=${from}&to=${to}`)
          .then((r) => r.json())
          .then((k) => { if (!k.error) setGoogleKpis(k); })
      );
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [slug, from, to, metaConnected, googleConnected]);

  if (!metaConnected && !googleConnected) {
    return (
      <div className="connection-required" style={{ marginTop: '16px' }}>
        <div className="cr-icon">🎯</div>
        <h3>No Ad Platforms Connected</h3>
        <p>Connect Meta Ads and/or Google Ads to see cross-platform performance comparisons.</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">⚙️ Connect Ad Platforms</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="kpi-grid" style={{ marginTop: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            <div className="skeleton skeleton-title" />
          </div>
        ))}
      </div>
    );
  }

  const totalSpend = (metaKpis?.spend ?? 0) + (googleKpis?.spend ?? 0);
  const totalRevenue = (metaKpis?.purchaseValue ?? 0) + (googleKpis?.conversionValue ?? 0);
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const comparisonData = [
    ...(metaKpis ? [{ name: 'Meta Ads', spend: metaKpis.spend, revenue: metaKpis.purchaseValue, roas: metaKpis.roas, clicks: metaKpis.clicks }] : []),
    ...(googleKpis ? [{ name: 'Google Ads', spend: googleKpis.spend, revenue: googleKpis.conversionValue, roas: googleKpis.roas, clicks: googleKpis.clicks }] : []),
  ];

  return (
    <>
      <div className="kpi-grid" style={{ marginTop: '16px' }}>
        <div className="kpi-card blue">
          <div className="kpi-icon">💸</div>
          <div className="kpi-label">Total Ad Spend</div>
          <div className="kpi-value">{formatCurrency(totalSpend)}</div>
          <div className="kpi-subtext">across all platforms</div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Blended ROAS</div>
          <div className="kpi-value">{blendedRoas.toFixed(2)}x</div>
          <div className="kpi-subtext">{formatCurrency(totalRevenue)} revenue attributed</div>
        </div>
        {metaKpis && (
          <div className="kpi-card violet">
            <div className="kpi-icon">📱</div>
            <div className="kpi-label">Meta ROAS</div>
            <div className="kpi-value">{metaKpis.roas.toFixed(2)}x</div>
            <div className="kpi-subtext">{formatCurrency(metaKpis.spend)} spent</div>
          </div>
        )}
        {googleKpis && (
          <div className="kpi-card cyan">
            <div className="kpi-icon">🔍</div>
            <div className="kpi-label">Google ROAS</div>
            <div className="kpi-value">{googleKpis.roas.toFixed(2)}x</div>
            <div className="kpi-subtext">{formatCurrency(googleKpis.spend)} spent</div>
          </div>
        )}
      </div>

      {comparisonData.length > 1 && (
        <div className="charts-grid cols-2" style={{ marginTop: '24px' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Spend Allocation</div>
                <div className="chart-card-subtitle">Budget distribution by platform</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} />
                <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="spend" name="Spend" radius={[6, 6, 0, 0]}>
                  {comparisonData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">ROAS Comparison</div>
                <div className="chart-card-subtitle">Return on ad spend by platform</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} />
                <YAxis stroke="var(--text-dim)" fontSize={11} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}x`} />
                <Bar dataKey="roas" name="ROAS" radius={[6, 6, 0, 0]}>
                  {comparisonData.map((entry, i) => (
                    <Cell key={i} fill={entry.roas >= 3 ? '#10b981' : entry.roas >= 1.5 ? '#f59e0b' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

// ---- Main Page ----
export default function AdsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'meta' | 'google'>('overview');
  const { from, to } = useGlobalDateRange();
  const [connections, setConnections] = useState({
    meta: false,
    google: false,
    googleConfigError: null as string | null,
    checked: false,
  });

  useEffect(() => {
    paramsPromise.then((p) => {
      setSlug(p.slug);
      Promise.all([
        fetch(`/api/ads?slug=${p.slug}&platform=meta&action=kpis&range=7d`).then((r) => r.json()),
        fetch(`/api/ads?slug=${p.slug}&platform=google&action=kpis&range=7d`).then((r) => r.json()),
      ]).then(([m, g]) => {
        // "Not connected" = user needs to click Connect (OAuth missing).
        // Any other error (e.g. server env var missing, API error) means
        // OAuth is done — surface the actual error instead of hiding it.
        const googleNotConnected = g.error === 'Google Ads not connected';
        setConnections({
          meta: m.error !== 'Meta Ads not connected',
          google: !googleNotConnected,
          googleConfigError: !googleNotConnected && g.error ? g.error : null,
          checked: true,
        });
      });
    });
  }, [paramsPromise]);

  if (!slug || !connections.checked) return null;

  const tabs = [
    { id: 'overview' as const, label: '📊 Overview', connected: connections.meta || connections.google },
    { id: 'meta' as const, label: '📱 Meta Ads', connected: connections.meta },
    { id: 'google' as const, label: '🔍 Google Ads', connected: connections.google },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>🎯 Ads Manager</h2>
            <p>Cross-platform campaign performance — Meta & Google Ads</p>
          </div>
          <DateRangeDropdown />
        </div>
      </div>

      <div className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
          >
            <span className={`tab-dot ${tab.connected ? '' : 'disconnected'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {activeTab === 'overview' && (
          <CombinedSection slug={slug} from={from} to={to} metaConnected={connections.meta} googleConnected={connections.google} />
        )}
        {activeTab === 'meta' && (
          <MetaSection slug={slug} from={from} to={to} connected={connections.meta} />
        )}
        {activeTab === 'google' && (
          <GoogleAdsSection slug={slug} from={from} to={to} connected={connections.google} configError={connections.googleConfigError} />
        )}
      </div>
    </>
  );
}
