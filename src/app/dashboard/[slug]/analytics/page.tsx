'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type {
  GA4KPIs, GA4SessionsOverTime, GA4TrafficChannel,
  GA4DeviceBreakdown, GA4TopPage, GA4Country,
  GA4LandingPage, GA4KeyEvent,
  GA4SourceMedium, GA4NewReturning, GA4City, GA4Browser, GA4OS,
  GA4Campaign, GA4ItemPurchase,
} from '@/lib/services/ga4';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#ec4899','#14b8a6','#a78bfa','#fb923c'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}
function fmtCur(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec.toString().padStart(2, '0')}s`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function pct(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}
function bounceBadge(r: number) {
  return r < 20 ? 'green' : r < 45 ? 'amber' : 'rose';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KPIChange({ val }: { val: number }) {
  return (
    <div className={`kpi-change ${val >= 0 ? 'positive' : 'negative'}`}>
      {val >= 0 ? '↑' : '↓'} {Math.abs(val).toFixed(1)}%
    </div>
  );
}

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label ? fmtDate(label) : ''}</div>
      {payload.map((p, i) => (
        <div key={i} className="value" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
        </div>
      ))}
    </div>
  );
}

function MiniBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pctVal = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{fmt(value)} <span style={{ color: 'var(--text-dim)' }}>({pctVal.toFixed(1)}%)</span></span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctVal}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="section-title" style={{ marginTop: '32px', marginBottom: '16px' }}>
      <span className="section-icon">{icon}</span>{children}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'audience' | 'acquisition' | 'behavior' | 'conversions';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',     label: 'Overview',     icon: '📊' },
  { id: 'audience',     label: 'Audience',     icon: '👥' },
  { id: 'acquisition',  label: 'Acquisition',  icon: '🌐' },
  { id: 'behavior',     label: 'Behavior',     icon: '📄' },
  { id: 'conversions',  label: 'Conversions',  icon: '🎯' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { from, to } = useGlobalDateRange();

  // State for all data
  const [kpis, setKpis] = useState<GA4KPIs | null>(null);
  const [sessions, setSessions] = useState<GA4SessionsOverTime[]>([]);
  const [channels, setChannels] = useState<GA4TrafficChannel[]>([]);
  const [devices, setDevices] = useState<GA4DeviceBreakdown[]>([]);
  const [pages, setPages] = useState<GA4TopPage[]>([]);
  const [countries, setCountries] = useState<GA4Country[]>([]);
  const [landingPages, setLandingPages] = useState<GA4LandingPage[]>([]);
  const [events, setEvents] = useState<GA4KeyEvent[]>([]);
  const [convFunnel, setConvFunnel] = useState<Array<{ stage: string; count: number; dropoffRate: number }>>([]);
  const [prodFunnel, setProdFunnel] = useState<Array<{ stage: string; count: number; dropoffRate: number }>>([]);
  const [sourceMedium, setSourceMedium] = useState<GA4SourceMedium[]>([]);
  const [newReturning, setNewReturning] = useState<GA4NewReturning[]>([]);
  const [cities, setCities] = useState<GA4City[]>([]);
  const [browsers, setBrowsers] = useState<GA4Browser[]>([]);
  const [os, setOs] = useState<GA4OS[]>([]);
  const [campaigns, setCampaigns] = useState<GA4Campaign[]>([]);
  const [items, setItems] = useState<GA4ItemPurchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => { paramsPromise.then((p) => setSlug(p.slug)); }, [paramsPromise]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setNotConnected(false);
    setKpis(null); setSessions([]); setChannels([]); setDevices([]);
    setPages([]); setCountries([]); setLandingPages([]); setEvents([]);
    setConvFunnel([]); setProdFunnel([]);
    setSourceMedium([]); setNewReturning([]); setCities([]);
    setBrowsers([]); setOs([]); setCampaigns([]); setItems([]);

    const q = (action: string) =>
      fetch(`/api/analytics?slug=${slug}&action=${action}&from=${from}&to=${to}`).then((r) => r.json());

    Promise.all([
      q('kpis'), q('sessions'), q('channels'), q('devices'),
      q('pages'), q('countries'), q('landing-pages'), q('events'),
      q('conversion-funnel'), q('product-funnel'),
      q('source-medium'), q('new-returning'), q('cities'),
      q('browsers'), q('os'), q('campaigns'), q('item-purchases'),
    ]).then(([k, s, ch, d, p, co, lp, ev, cf, pf, sm, nr, ci, br, osData, camp, itm]) => {
      if (k?.error === 'Google Analytics not connected') { setNotConnected(true); return; }
      if (k?.error) { setError(k.error); return; }
      setKpis(k);
      setSessions(Array.isArray(s) ? s : []);
      setChannels(Array.isArray(ch) ? ch : []);
      setDevices(Array.isArray(d) ? d : []);
      setPages(Array.isArray(p) ? p : []);
      setCountries(Array.isArray(co) ? co : []);
      setLandingPages(Array.isArray(lp) ? lp : []);
      setEvents(Array.isArray(ev) ? ev : []);
      setConvFunnel(Array.isArray(cf) ? cf : []);
      setProdFunnel(Array.isArray(pf) ? pf : []);
      setSourceMedium(Array.isArray(sm) ? sm : []);
      setNewReturning(Array.isArray(nr) ? nr : []);
      setCities(Array.isArray(ci) ? ci : []);
      setBrowsers(Array.isArray(br) ? br : []);
      setOs(Array.isArray(osData) ? osData : []);
      setCampaigns(Array.isArray(camp) ? camp : []);
      setItems(Array.isArray(itm) ? itm : []);
    }).catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  // ── Not connected ─────────────────────────────────────────────────────────
  if (notConnected) return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div><h2>📈 Google Analytics</h2><p>Traffic, sessions, conversions and e-commerce data</p></div>
        </div>
      </div>
      <div className="page-body">
        <div className="connection-required">
          <div className="cr-icon">📈</div>
          <h3>Google Analytics Not Connected</h3>
          <p>Connect your GA4 property to see traffic sources, sessions, device breakdowns, and conversion funnels.</p>
          {slug && <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">⚙️ Connect GA4</Link>}
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      <div className="page-header"><h2>📈 Google Analytics</h2></div>
      <div className="page-body">
        <div className="connection-required">
          <div className="cr-icon">⚠️</div>
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          {slug && <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary">Check Connection Settings</Link>}
        </div>
      </div>
    </>
  );

  const sessChange    = kpis ? pct(kpis.sessions, kpis.prevSessions) : 0;
  const usersChange   = kpis ? pct(kpis.users, kpis.prevUsers) : 0;
  const revenueChange = kpis ? pct(kpis.revenue, kpis.prevRevenue) : 0;
  const txChange      = kpis ? pct(kpis.transactions, kpis.prevTransactions) : 0;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div><h2>📈 Google Analytics</h2><p>Loading your analytics data…</p></div>
          <DateRangeDropdown />
        </div>
      </div>
      <div className="dashboard-tabs">
        {TABS.map((t) => <button key={t.id} className={`dashboard-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}
      </div>
      <div className="page-body">
        <div className="kpi-grid">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
        <div className="charts-grid cols-2" style={{ marginTop: '24px' }}>
          <div className="chart-card full-width"><div className="skeleton skeleton-chart" /></div>
          <div className="chart-card"><div className="skeleton skeleton-chart" /></div>
          <div className="chart-card"><div className="skeleton skeleton-chart" /></div>
        </div>
      </div>
    </>
  );

  // ── Tab: Overview ─────────────────────────────────────────────────────────
  function OverviewTab() {
    if (!kpis) return null;
    const totalSessions = newReturning.reduce((s, r) => s + r.sessions, 0);

    return (
      <>
        {/* Traffic KPIs */}
        <SectionTitle icon="📊">Traffic & Engagement</SectionTitle>
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-icon">🖥️</div>
            <div className="kpi-label">Sessions</div>
            <div className="kpi-value">{fmt(kpis.sessions)}</div>
            <KPIChange val={sessChange} />
            <div className="kpi-subtext">vs previous period</div>
          </div>
          <div className="kpi-card violet">
            <div className="kpi-icon">👥</div>
            <div className="kpi-label">Active Users</div>
            <div className="kpi-value">{fmt(kpis.users)}</div>
            <KPIChange val={usersChange} />
          </div>
          <div className="kpi-card cyan">
            <div className="kpi-icon">✨</div>
            <div className="kpi-label">New Users</div>
            <div className="kpi-value">{fmt(kpis.newUsers)}</div>
            <div className="kpi-subtext">{kpis.users > 0 ? `${((kpis.newUsers / kpis.users) * 100).toFixed(0)}% of total` : ''}</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-icon">📄</div>
            <div className="kpi-label">Pageviews</div>
            <div className="kpi-value">{fmt(kpis.pageviews)}</div>
            <div className="kpi-subtext">{kpis.pagesPerSession.toFixed(2)} pages / session</div>
          </div>
          <div className="kpi-card rose">
            <div className="kpi-icon">↩️</div>
            <div className="kpi-label">Bounce Rate</div>
            <div className="kpi-value">{kpis.bounceRate.toFixed(1)}%</div>
            <div className="kpi-subtext">{kpis.bounceRate < 20 ? '✅ Excellent' : kpis.bounceRate < 45 ? '⚠️ Average' : '🔴 High'}</div>
          </div>
          <div className="kpi-card emerald">
            <div className="kpi-icon">⏱️</div>
            <div className="kpi-label">Avg Session Duration</div>
            <div className="kpi-value">{fmtDur(kpis.avgSessionDuration)}</div>
            <div className="kpi-subtext">{kpis.avgSessionDuration > 120 ? 'Strong engagement' : 'Room to improve'}</div>
          </div>
        </div>

        {/* E-commerce KPIs */}
        {(kpis.transactions > 0 || kpis.addToCarts > 0) && (
          <>
            <SectionTitle icon="🛒">E-Commerce Performance</SectionTitle>
            <div className="kpi-grid">
              <div className="kpi-card emerald">
                <div className="kpi-icon">💰</div>
                <div className="kpi-label">Revenue (GA4)</div>
                <div className="kpi-value">{fmtCur(kpis.revenue)}</div>
                <KPIChange val={revenueChange} />
              </div>
              <div className="kpi-card blue">
                <div className="kpi-icon">🛍️</div>
                <div className="kpi-label">Transactions</div>
                <div className="kpi-value">{fmt(kpis.transactions)}</div>
                <KPIChange val={txChange} />
              </div>
              <div className="kpi-card violet">
                <div className="kpi-icon">%</div>
                <div className="kpi-label">Conv. Rate</div>
                <div className="kpi-value">{kpis.conversionRate.toFixed(2)}%</div>
                <div className="kpi-subtext">{kpis.conversionRate < 1 ? '🔴 Below avg' : kpis.conversionRate < 3 ? '⚠️ Average' : '✅ Strong'}</div>
              </div>
              {kpis.addToCarts > 0 && (
                <div className="kpi-card amber">
                  <div className="kpi-icon">🛒</div>
                  <div className="kpi-label">Add to Carts</div>
                  <div className="kpi-value">{fmt(kpis.addToCarts)}</div>
                  <div className="kpi-subtext">{kpis.transactions > 0 ? `${((kpis.transactions / kpis.addToCarts) * 100).toFixed(0)}% → purchase` : ''}</div>
                </div>
              )}
              {kpis.checkouts > 0 && (
                <div className="kpi-card cyan">
                  <div className="kpi-icon">✅</div>
                  <div className="kpi-label">Checkouts</div>
                  <div className="kpi-value">{fmt(kpis.checkouts)}</div>
                  <div className="kpi-subtext">{kpis.addToCarts > 0 ? `${((kpis.checkouts / kpis.addToCarts) * 100).toFixed(0)}% of carts` : ''}</div>
                </div>
              )}
              {kpis.revenue > 0 && kpis.transactions > 0 && (
                <div className="kpi-card rose">
                  <div className="kpi-icon">🧾</div>
                  <div className="kpi-label">Avg Order Value</div>
                  <div className="kpi-value">{fmtCur(kpis.revenue / kpis.transactions)}</div>
                  <div className="kpi-subtext">per transaction</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Sessions trend */}
        {sessions.length > 0 && (
          <>
            <SectionTitle icon="📅">Sessions & Pageviews Over Time</SectionTitle>
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Daily Traffic</div>
                  <div className="chart-card-subtitle">Sessions and active users per day</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sessions}>
                  <defs>
                    <linearGradient id="gSess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip content={<Tip />} />
                  <Legend />
                  <Area type="monotone" dataKey="sessions" stroke="#3b82f6" fill="url(#gSess)" strokeWidth={2} name="Sessions" />
                  <Area type="monotone" dataKey="users" stroke="#8b5cf6" fill="url(#gUsers)" strokeWidth={2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Quick insights row */}
        <div className="charts-grid cols-2" style={{ marginTop: '24px' }}>
          {/* Devices */}
          {devices.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Device Split</div>
                  <div className="chart-card-subtitle">Sessions by device type</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={devices} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="sessions" nameKey="device"
                    label={({ payload }: { payload?: { device?: string; percentage?: number } }) => payload ? `${payload.device ?? ''} ${(payload.percentage ?? 0).toFixed(0)}%` : ''}>
                    {devices.map((_, i) => <Cell key={i} fill={C[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* New vs Returning */}
          {newReturning.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">New vs Returning</div>
                  <div className="chart-card-subtitle">User type split by sessions</div>
                </div>
              </div>
              <div style={{ padding: '16px 8px' }}>
                {newReturning.map((r, i) => (
                  <MiniBar key={r.type} label={r.type} value={r.sessions} total={totalSessions} color={C[i]} />
                ))}
                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {newReturning.map((r) => (
                    <div key={r.type} style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>{r.type}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{fmt(r.sessions)} sessions</div>
                      {r.revenue > 0 && <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '2px' }}>{fmtCur(r.revenue)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top channels quick view */}
          {channels.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Top Traffic Sources</div>
                  <div className="chart-card-subtitle">Sessions by channel</div>
                </div>
              </div>
              <div style={{ padding: '8px' }}>
                {channels.slice(0, 6).map((ch, i) => (
                  <MiniBar key={ch.channel} label={ch.channel} value={ch.sessions} total={kpis.sessions} color={C[i]} />
                ))}
              </div>
            </div>
          )}

          {/* Top countries quick view */}
          {countries.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Top Countries</div>
                  <div className="chart-card-subtitle">Sessions by country</div>
                </div>
              </div>
              <div style={{ padding: '8px' }}>
                {countries.slice(0, 6).map((co, i) => (
                  <MiniBar key={co.country} label={co.country} value={co.sessions} total={kpis.sessions} color={C[i]} />
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Tab: Audience ─────────────────────────────────────────────────────────
  function AudienceTab() {
    const totalSessions = newReturning.reduce((s, r) => s + r.sessions, 0);
    const totalBrowserSessions = browsers.reduce((s, b) => s + b.sessions, 0);
    const totalOsSessions = os.reduce((s, o) => s + o.sessions, 0);

    return (
      <>
        {/* New vs Returning deep dive */}
        {newReturning.length > 0 && (
          <>
            <SectionTitle icon="🔄">New vs Returning Users</SectionTitle>
            <div className="charts-grid cols-2">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Session Split</div><div className="chart-card-subtitle">Distribution by user type</div></div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={newReturning} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="sessions" nameKey="type"
                      label={({ payload }: { payload?: { type?: string } }) => payload?.type ?? ''}>
                      {newReturning.map((_, i) => <Cell key={i} fill={C[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Comparison</div><div className="chart-card-subtitle">Sessions, conversions and revenue by type</div></div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>User Type</th><th>Sessions</th><th>Share</th><th>Purchases</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {newReturning.map((r) => (
                      <tr key={r.type}>
                        <td className="highlight">{r.type}</td>
                        <td className="mono">{r.sessions.toLocaleString('en-IN')}</td>
                        <td className="mono">{totalSessions > 0 ? ((r.sessions / totalSessions) * 100).toFixed(1) : 0}%</td>
                        <td className="mono">{r.conversions}</td>
                        <td className="mono">{r.revenue > 0 ? fmtCur(r.revenue) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tech: Device + Browser + OS */}
        <SectionTitle icon="📱">Technology</SectionTitle>
        <div className="charts-grid cols-2">
          {devices.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">Device Category</div><div className="chart-card-subtitle">Sessions by device type</div></div>
              </div>
              <div style={{ padding: '8px' }}>
                {devices.map((d, i) => (
                  <MiniBar key={d.device} label={d.device} value={d.sessions} total={kpis?.sessions ?? 1} color={C[i]} />
                ))}
              </div>
            </div>
          )}

          {browsers.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">Browsers</div><div className="chart-card-subtitle">Sessions by browser</div></div>
              </div>
              <div style={{ padding: '8px' }}>
                {browsers.map((b, i) => (
                  <MiniBar key={b.browser} label={b.browser} value={b.sessions} total={totalBrowserSessions} color={C[i % C.length]} />
                ))}
              </div>
            </div>
          )}

          {os.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">Operating Systems</div><div className="chart-card-subtitle">Sessions by OS</div></div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={os} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis type="category" dataKey="os" stroke="var(--text-dim)" fontSize={11} width={90} />
                  <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                  <Bar dataKey="sessions" name="Sessions" radius={[0, 6, 6, 0]}>
                    {os.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* OS table */}
          {os.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">OS Breakdown</div></div>
              </div>
              <table className="data-table">
                <thead><tr><th>#</th><th>OS</th><th>Sessions</th><th>Share</th></tr></thead>
                <tbody>
                  {os.map((o, i) => (
                    <tr key={o.os}>
                      <td className="mono">{i + 1}</td>
                      <td className="highlight">{o.os}</td>
                      <td className="mono">{o.sessions.toLocaleString('en-IN')}</td>
                      <td className="mono">{totalOsSessions > 0 ? ((o.sessions / totalOsSessions) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Geography */}
        <SectionTitle icon="🌍">Geographic Distribution</SectionTitle>
        <div className="charts-grid cols-2">
          {countries.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">Countries</div><div className="chart-card-subtitle">Sessions by country</div></div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={countries.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis type="category" dataKey="country" stroke="var(--text-dim)" fontSize={11} width={100} />
                  <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                  <Bar dataKey="sessions" name="Sessions" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {cities.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">Top Cities</div><div className="chart-card-subtitle">Sessions by city</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>City</th><th>Country</th><th>Sessions</th><th>Users</th></tr></thead>
                  <tbody>
                    {cities.slice(0, 15).map((c, i) => (
                      <tr key={`${c.city}-${i}`}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight">{c.city}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{c.country}</td>
                        <td className="mono">{c.sessions.toLocaleString('en-IN')}</td>
                        <td className="mono">{c.users.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {countries.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div><div className="chart-card-title">Country Details</div></div>
              </div>
              <table className="data-table">
                <thead><tr><th>#</th><th>Country</th><th>Sessions</th><th>Users</th><th>Share</th></tr></thead>
                <tbody>
                  {countries.map((c, i) => (
                    <tr key={c.country}>
                      <td className="mono">{i + 1}</td>
                      <td className="highlight">{c.country}</td>
                      <td className="mono">{c.sessions.toLocaleString('en-IN')}</td>
                      <td className="mono">{c.users.toLocaleString('en-IN')}</td>
                      <td className="mono">{kpis && kpis.sessions > 0 ? ((c.sessions / kpis.sessions) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Tab: Acquisition ──────────────────────────────────────────────────────
  function AcquisitionTab() {
    return (
      <>
        {/* Channel overview */}
        {channels.length > 0 && (
          <>
            <SectionTitle icon="🌐">Traffic Channels</SectionTitle>
            <div className="charts-grid cols-2">
              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Sessions by Channel</div><div className="chart-card-subtitle">Default channel grouping</div></div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={channels} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis type="category" dataKey="channel" stroke="var(--text-dim)" fontSize={11} width={150} />
                    <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                    <Bar dataKey="sessions" name="Sessions" radius={[0, 6, 6, 0]}>
                      {channels.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Channel Performance</div><div className="chart-card-subtitle">Quality metrics by traffic source</div></div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Channel</th><th>Sessions</th><th>Users</th><th>Bounce Rate</th><th>Purchases</th>{channels.some((c) => c.revenue > 0) && <th>Revenue</th>}<th>Conv. Rate</th></tr>
                    </thead>
                    <tbody>
                      {channels.map((ch) => (
                        <tr key={ch.channel}>
                          <td className="highlight">{ch.channel}</td>
                          <td className="mono">{ch.sessions.toLocaleString('en-IN')}</td>
                          <td className="mono">{ch.users.toLocaleString('en-IN')}</td>
                          <td><span className={`badge ${bounceBadge(ch.bounceRate)}`}>{ch.bounceRate.toFixed(1)}%</span></td>
                          <td className="mono">{ch.conversions}</td>
                          {channels.some((c) => c.revenue > 0) && (
                            <td className="mono">{ch.revenue > 0 ? fmtCur(ch.revenue) : '—'}</td>
                          )}
                          <td className="mono">{ch.sessions > 0 ? `${((ch.conversions / ch.sessions) * 100).toFixed(2)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Source / Medium */}
        {sourceMedium.length > 0 && (
          <>
            <SectionTitle icon="🔗">Source / Medium</SectionTitle>
            <div className="data-table-wrapper">
              <div className="data-table-header">
                <div className="data-table-title">Traffic Sources — Granular Breakdown</div>
                <div className="data-table-subtitle">Exact source and medium for each session</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Source / Medium</th><th>Sessions</th><th>Users</th><th>Bounce Rate</th><th>Purchases</th><th>Revenue</th><th>Conv. Rate</th></tr>
                  </thead>
                  <tbody>
                    {sourceMedium.map((sm, i) => (
                      <tr key={sm.sourceMedium}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight mono" style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sm.sourceMedium}</td>
                        <td className="mono">{sm.sessions.toLocaleString('en-IN')}</td>
                        <td className="mono">{sm.users.toLocaleString('en-IN')}</td>
                        <td><span className={`badge ${bounceBadge(sm.bounceRate)}`}>{sm.bounceRate.toFixed(1)}%</span></td>
                        <td className="mono">{sm.conversions}</td>
                        <td className="mono">{sm.revenue > 0 ? fmtCur(sm.revenue) : '—'}</td>
                        <td className="mono">{sm.sessions > 0 ? `${((sm.conversions / sm.sessions) * 100).toFixed(2)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* UTM Campaigns */}
        {campaigns.length > 0 && (
          <>
            <SectionTitle icon="🎯">Campaigns</SectionTitle>
            <div className="data-table-wrapper">
              <div className="data-table-header">
                <div className="data-table-title">UTM Campaign Performance</div>
                <div className="data-table-subtitle">Sessions and conversions by campaign name</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Campaign</th><th>Sessions</th><th>Users</th><th>Bounce Rate</th><th>Purchases</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => (
                      <tr key={c.campaign}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.campaign}</td>
                        <td className="mono">{c.sessions.toLocaleString('en-IN')}</td>
                        <td className="mono">{c.users.toLocaleString('en-IN')}</td>
                        <td><span className={`badge ${bounceBadge(c.bounceRate)}`}>{c.bounceRate.toFixed(1)}%</span></td>
                        <td className="mono">{c.conversions}</td>
                        <td className="mono">{c.revenue > 0 ? fmtCur(c.revenue) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {campaigns.length === 0 && (
          <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
            💡 No UTM campaigns found in this period. Tag your links with UTM parameters to track campaign performance here.
          </div>
        )}
      </>
    );
  }

  // ── Tab: Behavior ─────────────────────────────────────────────────────────
  function BehaviorTab() {
    return (
      <>
        {/* Top Pages */}
        {pages.length > 0 && (
          <>
            <SectionTitle icon="📄">Pages & Screens</SectionTitle>
            <div className="data-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="data-table-header">
                <div className="data-table-title">Most Viewed Pages</div>
                <div className="data-table-subtitle">Total pageviews, engagement time and bounce rate per page</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Page</th><th>Views</th><th>Avg Engagement</th><th>Bounce Rate</th></tr>
                  </thead>
                  <tbody>
                    {pages.map((p, i) => (
                      <tr key={p.page}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight mono" style={{ maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.page}>{p.page}</td>
                        <td className="mono">{p.pageviews.toLocaleString('en-IN')}</td>
                        <td className="mono">{fmtDur(p.avgTimeOnPage)}</td>
                        <td><span className={`badge ${bounceBadge(p.bounceRate)}`}>{p.bounceRate.toFixed(1)}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Landing Pages */}
        {landingPages.length > 0 && (
          <>
            <SectionTitle icon="🚪">Landing Pages</SectionTitle>
            <div className="data-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="data-table-header">
                <div className="data-table-title">Entry Points & Conversion</div>
                <div className="data-table-subtitle">Sessions that started on each page, with purchase conversion</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Landing Page</th><th>Entry Sessions</th><th>Bounce Rate</th><th>Purchases</th><th>Revenue</th><th>Conv. Rate</th></tr>
                  </thead>
                  <tbody>
                    {landingPages.map((lp, i) => (
                      <tr key={lp.page}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight mono" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lp.page}>{lp.page}</td>
                        <td className="mono">{fmt(lp.sessions)}</td>
                        <td><span className={`badge ${bounceBadge(lp.bounceRate)}`}>{lp.bounceRate.toFixed(1)}%</span></td>
                        <td className="mono">{lp.conversions.toFixed(0)}</td>
                        <td className="mono">{lp.revenue > 0 ? fmtCur(lp.revenue) : '—'}</td>
                        <td className="mono">{lp.sessions > 0 ? `${((lp.conversions / lp.sessions) * 100).toFixed(2)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Key Events */}
        {events.length > 0 && (
          <>
            <SectionTitle icon="⚡">Key Events</SectionTitle>
            <div className="charts-grid cols-2">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Event Frequency</div><div className="chart-card-subtitle">Top events by total count</div></div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={events.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis type="category" dataKey="eventName" stroke="var(--text-dim)" fontSize={11} width={160} />
                    <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                    <Bar dataKey="eventCount" name="Events" radius={[0, 6, 6, 0]}>
                      {events.slice(0, 10).map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Event Details</div><div className="chart-card-subtitle">Count, users and rate per user</div></div>
                </div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Event</th><th>Count</th><th>Users</th><th>Per User</th></tr></thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={ev.eventName}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight">{ev.eventName}</td>
                        <td className="mono">{fmt(ev.eventCount)}</td>
                        <td className="mono">{fmt(ev.users)}</td>
                        <td className="mono">{ev.users > 0 ? (ev.eventCount / ev.users).toFixed(1) : '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Tab: Conversions ──────────────────────────────────────────────────────
  function ConversionsTab() {
    function FunnelViz({ title, subtitle, data, color }: {
      title: string; subtitle: string;
      data: Array<{ stage: string; count: number; dropoffRate: number }>;
      color: string;
    }) {
      return (
        <>
          <div className="chart-card" style={{ marginBottom: '0' }}>
            <div className="chart-card-header">
              <div><div className="chart-card-title">{title}</div><div className="chart-card-subtitle">{subtitle}</div></div>
            </div>
            {/* Visual funnel steps */}
            <div style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {data.map((stage, i) => {
                const maxCount = data[0]?.count || 1;
                const barW = (stage.count / maxCount) * 100;
                const prevCount = i > 0 ? data[i - 1].count : stage.count;
                const retentionPct = prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(1) : '100';
                return (
                  <div key={stage.stage}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 600 }}>{stage.stage}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{fmt(stage.count)}{i > 0 && <span style={{ marginLeft: '8px', color: 'var(--accent-green)', fontSize: '11px' }}>↳ {retentionPct}% retained</span>}</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    </div>
                    {i < data.length - 1 && (
                      <div style={{ marginLeft: '12px', height: '16px', width: '2px', background: 'var(--border-color)', marginBottom: '4px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funnel table */}
          <div className="data-table-wrapper" style={{ marginBottom: '32px' }}>
            <div className="data-table-header"><div className="data-table-title">Stage Details</div></div>
            <table className="data-table">
              <thead><tr><th>Stage</th><th>Count</th><th>% of Previous</th><th>Drop-off Rate</th></tr></thead>
              <tbody>
                {data.map((stage, i) => {
                  const prevCount = i > 0 ? data[i - 1].count : stage.count;
                  const pctOfPrev = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td className="highlight">{stage.stage}</td>
                      <td className="mono">{fmt(stage.count)}</td>
                      <td className="mono">{i === 0 ? '—' : `${pctOfPrev.toFixed(1)}%`}</td>
                      <td>
                        <span className={`badge ${stage.dropoffRate < 30 ? 'green' : stage.dropoffRate < 60 ? 'amber' : 'rose'}`}>
                          {stage.dropoffRate.toFixed(1)}% drop-off
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return (
      <>
        {convFunnel.length > 0 && (
          <>
            <SectionTitle icon="🔄">Purchase Funnel</SectionTitle>
            <div className="charts-grid cols-2">
              <FunnelViz title="Sessions → Purchase" subtitle="Full-funnel drop-off from session to completed order" data={convFunnel} color="var(--accent-blue)" />
              {prodFunnel.length > 0 && (
                <FunnelViz title="Product View → Purchase" subtitle="Discovery-to-purchase drop-off via product pages" data={prodFunnel} color="var(--accent-green)" />
              )}
            </div>
          </>
        )}

        {/* Item purchases */}
        {items.length > 0 && (
          <>
            <SectionTitle icon="📦">Item Purchases (GA4)</SectionTitle>
            <div className="charts-grid cols-2">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Revenue by Product</div><div className="chart-card-subtitle">Item revenue tracked via GA4 e-commerce events</div></div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={items.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="var(--text-dim)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="itemName" stroke="var(--text-dim)" fontSize={10} width={160}
                      tickFormatter={(v: string) => v.length > 22 ? `${v.slice(0, 22)}…` : v} />
                    <Tooltip formatter={(v) => fmtCur(Number(v))} />
                    <Bar dataKey="itemRevenue" name="Revenue" radius={[0, 6, 6, 0]}>
                      {items.slice(0, 8).map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Product Details</div><div className="chart-card-subtitle">Items purchased, revenue and avg price</div></div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Revenue</th><th>Avg Price</th></tr></thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={it.itemName}>
                          <td className="mono">{i + 1}</td>
                          <td className="highlight" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.itemName}>{it.itemName}</td>
                          <td className="mono">{it.itemsPurchased.toLocaleString('en-IN')}</td>
                          <td className="mono">{fmtCur(it.itemRevenue)}</td>
                          <td className="mono">{fmtCur(it.avgPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Revenue by channel */}
        {channels.some((c) => c.revenue > 0) && (
          <>
            <SectionTitle icon="💰">Revenue by Channel</SectionTitle>
            <div className="charts-grid cols-2">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Channel Revenue</div></div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={channels.filter((c) => c.revenue > 0)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="var(--text-dim)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="channel" stroke="var(--text-dim)" fontSize={11} width={140} />
                    <Tooltip formatter={(v) => fmtCur(Number(v))} />
                    <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]}>
                      {channels.filter((c) => c.revenue > 0).map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <div><div className="chart-card-title">Channel Conversion Rates</div></div>
                </div>
                <table className="data-table">
                  <thead><tr><th>Channel</th><th>Sessions</th><th>Purchases</th><th>Revenue</th><th>CR%</th></tr></thead>
                  <tbody>
                    {channels.map((ch) => (
                      <tr key={ch.channel}>
                        <td className="highlight">{ch.channel}</td>
                        <td className="mono">{ch.sessions.toLocaleString('en-IN')}</td>
                        <td className="mono">{ch.conversions}</td>
                        <td className="mono">{ch.revenue > 0 ? fmtCur(ch.revenue) : '—'}</td>
                        <td className="mono">{ch.sessions > 0 ? `${((ch.conversions / ch.sessions) * 100).toFixed(2)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {convFunnel.length === 0 && items.length === 0 && (
          <div className="connection-required" style={{ marginTop: '40px' }}>
            <div className="cr-icon">🎯</div>
            <h3>No Conversion Data</h3>
            <p>Conversion data appears once GA4 e-commerce event tracking is configured on your store.</p>
          </div>
        )}
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>📈 Google Analytics</h2>
            <p>Traffic, audience, acquisition, behaviour and conversions</p>
          </div>
          <DateRangeDropdown />
        </div>
      </div>

      <div className="dashboard-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {activeTab === 'overview'    && <OverviewTab />}
        {activeTab === 'audience'    && <AudienceTab />}
        {activeTab === 'acquisition' && <AcquisitionTab />}
        {activeTab === 'behavior'    && <BehaviorTab />}
        {activeTab === 'conversions' && <ConversionsTab />}
      </div>
    </>
  );
}
