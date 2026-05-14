'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { MetaKPIs, MetaCampaign, MetaSpendPoint } from '@/lib/services/meta';
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
function MetaSection({ slug, from, to, connected }: { slug: string; from: string; to: string; connected: boolean }) {
  const [kpis, setKpis] = useState<MetaKPIs | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [spend, setSpend] = useState<MetaSpendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!connected) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/ads?slug=${slug}&platform=meta&action=kpis&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/ads?slug=${slug}&platform=meta&action=campaigns&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/ads?slug=${slug}&platform=meta&action=spend&from=${from}&to=${to}`).then((r) => r.json()),
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

  useEffect(() => { load(); }, [load]);

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
        <h3>Error Loading Meta Ads</h3>
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
          <div className="kpi-label">Purchase ROAS</div>
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
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Purchase Revenue</div>
          <div className="kpi-value">{formatCurrency(kpis.purchaseValue)}</div>
          <div className="kpi-subtext">{kpis.purchases.toFixed(0)} purchases</div>
        </div>
        <div className="kpi-card cyan">
          <div className="kpi-icon">👁️</div>
          <div className="kpi-label">Impressions</div>
          <div className="kpi-value">{formatNum(kpis.impressions)}</div>
          <div className="kpi-subtext">CPM: {formatCurrency(kpis.cpm)}</div>
        </div>
        <div className="kpi-card rose">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-label">Cost per Purchase</div>
          <div className="kpi-value">{formatCurrency(kpis.costPerPurchase)}</div>
          {kpis.addToCarts > 0 && <div className="kpi-subtext">{kpis.addToCarts.toFixed(0)} add-to-carts</div>}
        </div>
      </div>

      {spend.length > 0 && (
        <div className="chart-card" style={{ marginTop: '24px' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Spend & Clicks Over Time</div>
              <div className="chart-card-subtitle">Daily Meta Ads spend and click volume</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={spend}>
              <defs>
                <linearGradient id="metaSpendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} />
              <Tooltip content={<SpendTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="spend" stroke="#3b82f6" fill="url(#metaSpendGrad)" strokeWidth={2} name="Spend (₹)" />
              <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" fill="none" strokeWidth={2} name="Clicks" />
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
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="highlight" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td className="mono">{formatCurrency(c.spend)}</td>
                    <td className="mono">{formatNum(c.impressions)}</td>
                    <td className="mono">{formatNum(c.clicks)}</td>
                    <td className="mono">{c.ctr.toFixed(2)}%</td>
                    <td className="mono">{formatCurrency(c.cpc)}</td>
                    <td className="mono">{c.purchases.toFixed(0)}</td>
                    <td className="mono">{formatCurrency(c.purchaseValue)}</td>
                    <td>
                      <span className={`badge ${c.roas >= 3 ? 'green' : c.roas >= 1.5 ? 'amber' : 'rose'}`}>
                        {c.roas.toFixed(2)}x
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

  useEffect(() => { load(); }, [load]);

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
