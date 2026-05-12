'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type {
  GA4KPIs, GA4SessionsOverTime, GA4TrafficChannel,
  GA4DeviceBreakdown, GA4TopPage, GA4Country,
  GA4LandingPage, GA4KeyEvent,
} from '@/lib/services/ga4';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899'];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function pct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

function formatDateLabel(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function KPIChange({ val }: { val: number }) {
  return (
    <div className={`kpi-change ${val >= 0 ? 'positive' : 'negative'}`}>
      {val >= 0 ? '↑' : '↓'} {Math.abs(val).toFixed(1)}%
    </div>
  );
}

function CustomTooltip({
  active, payload, label,
}: {
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
          {p.name}: {p.value.toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  );
}

type Tab = 'overview' | 'channels' | 'pages' | 'funnels';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',  icon: '📊' },
  { id: 'channels',  label: 'Channels',  icon: '🌐' },
  { id: 'pages',     label: 'Pages',     icon: '📄' },
  { id: 'funnels',   label: 'Funnels',   icon: '🔄' },
];

export default function AnalyticsPage({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { from, to } = useGlobalDateRange();

  const [kpis, setKpis] = useState<GA4KPIs | null>(null);
  const [sessions, setSessions] = useState<GA4SessionsOverTime[]>([]);
  const [channels, setChannels] = useState<GA4TrafficChannel[]>([]);
  const [devices, setDevices] = useState<GA4DeviceBreakdown[]>([]);
  const [pages, setPages] = useState<GA4TopPage[]>([]);
  const [countries, setCountries] = useState<GA4Country[]>([]);
  const [landingPages, setLandingPages] = useState<GA4LandingPage[]>([]);
  const [events, setEvents] = useState<GA4KeyEvent[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<Array<{stage: string; count: number; dropoffRate: number}>>([]);
  const [productFunnel, setProductFunnel] = useState<Array<{stage: string; count: number; dropoffRate: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    paramsPromise.then((p) => setSlug(p.slug));
  }, [paramsPromise]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setNotConnected(false);
    // Clear stale data immediately so previous date range's numbers don't show during load
    setKpis(null);
    setSessions([]);
    setChannels([]);
    setDevices([]);
    setPages([]);
    setCountries([]);
    setLandingPages([]);
    setEvents([]);
    setConversionFunnel([]);
    setProductFunnel([]);

    Promise.all([
      fetch(`/api/analytics?slug=${slug}&action=kpis&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=sessions&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=channels&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=devices&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=pages&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=countries&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=landing-pages&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=events&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=conversion-funnel&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/analytics?slug=${slug}&action=product-funnel&from=${from}&to=${to}`).then((r) => r.json()),
    ])
      .then(([k, s, c, d, p, co, lp, ev, cf, pf]) => {
        if (k.error === 'Google Analytics not connected') { setNotConnected(true); return; }
        if (k.error) { setError(k.error); return; }
        setKpis(k);
        setSessions(Array.isArray(s) ? s : []);
        setChannels(Array.isArray(c) ? c : []);
        setDevices(Array.isArray(d) ? d : []);
        setPages(Array.isArray(p) ? p : []);
        setCountries(Array.isArray(co) ? co : []);
        setLandingPages(Array.isArray(lp) ? lp : []);
        setEvents(Array.isArray(ev) ? ev : []);
        setConversionFunnel(Array.isArray(cf) ? cf : []);
        setProductFunnel(Array.isArray(pf) ? pf : []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  if (notConnected) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>📈 Google Analytics</h2>
              <p>Traffic, sessions, and conversion data from GA4</p>
            </div>
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
  }

  if (error) {
    return (
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
  }

  const sessChange   = kpis ? pct(kpis.sessions, kpis.prevSessions) : 0;
  const usersChange  = kpis ? pct(kpis.users, kpis.prevUsers) : 0;
  const revenueChange = kpis ? pct(kpis.revenue, kpis.prevRevenue) : 0;
  const txChange     = kpis ? pct(kpis.transactions, kpis.prevTransactions) : 0;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  function LoadingSkeleton() {
    return (
      <>
        <div className="kpi-grid">
          {[1,2,3,4,5,6].map((i) => (
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
      </>
    );
  }

  // ── Tab: Overview ─────────────────────────────────────────────────────────
  function OverviewTab() {
    if (!kpis) return null;
    return (
      <>
        {/* Traffic KPIs */}
        <div className="section-title"><span className="section-icon">📊</span>Traffic & Engagement</div>
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-icon">🖥️</div>
            <div className="kpi-label">Sessions</div>
            <div className="kpi-value">{formatNum(kpis.sessions)}</div>
            <KPIChange val={sessChange} />
            <div className="kpi-subtext">vs previous period</div>
          </div>
          <div className="kpi-card violet">
            <div className="kpi-icon">👥</div>
            <div className="kpi-label">Active Users</div>
            <div className="kpi-value">{formatNum(kpis.users)}</div>
            <KPIChange val={usersChange} />
          </div>
          <div className="kpi-card cyan">
            <div className="kpi-icon">✨</div>
            <div className="kpi-label">New Users</div>
            <div className="kpi-value">{formatNum(kpis.newUsers)}</div>
            <div className="kpi-subtext">
              {kpis.users > 0 ? `${((kpis.newUsers / kpis.users) * 100).toFixed(0)}% of all users` : ''}
            </div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-icon">📄</div>
            <div className="kpi-label">Pageviews</div>
            <div className="kpi-value">{formatNum(kpis.pageviews)}</div>
            <div className="kpi-subtext">{kpis.pagesPerSession.toFixed(1)} per session</div>
          </div>
          <div className="kpi-card rose">
            <div className="kpi-icon">↩️</div>
            <div className="kpi-label">Bounce Rate</div>
            <div className="kpi-value">{kpis.bounceRate.toFixed(1)}%</div>
            <div className="kpi-subtext">
              {kpis.bounceRate < 40 ? 'Excellent' : kpis.bounceRate < 60 ? 'Average' : 'High — improve landing pages'}
            </div>
          </div>
          <div className="kpi-card emerald">
            <div className="kpi-icon">⏱️</div>
            <div className="kpi-label">Avg Session Duration</div>
            <div className="kpi-value">{formatDuration(kpis.avgSessionDuration)}</div>
            <div className="kpi-subtext">{kpis.avgSessionDuration > 120 ? 'Strong engagement' : 'Room to improve'}</div>
          </div>
        </div>

        {/* E-Commerce KPIs */}
        {(kpis.transactions > 0 || kpis.revenue > 0 || kpis.addToCarts > 0) && (
          <>
            <div className="section-title" style={{ marginTop: '32px' }}>
              <span className="section-icon">🛒</span>E-Commerce Performance
            </div>
            <div className="kpi-grid">
              <div className="kpi-card emerald">
                <div className="kpi-icon">💰</div>
                <div className="kpi-label">Revenue (GA4)</div>
                <div className="kpi-value">₹{kpis.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <KPIChange val={revenueChange} />
              </div>
              <div className="kpi-card blue">
                <div className="kpi-icon">🛍️</div>
                <div className="kpi-label">Transactions</div>
                <div className="kpi-value">{formatNum(kpis.transactions)}</div>
                <KPIChange val={txChange} />
              </div>
              <div className="kpi-card violet">
                <div className="kpi-icon">%</div>
                <div className="kpi-label">Conversion Rate</div>
                <div className="kpi-value">{kpis.conversionRate.toFixed(2)}%</div>
                <div className="kpi-subtext">
                  {kpis.conversionRate < 1 ? 'Below avg — improve CRO' : kpis.conversionRate < 3 ? 'Average' : 'Strong'}
                </div>
              </div>
              {kpis.addToCarts > 0 && (
                <div className="kpi-card amber">
                  <div className="kpi-icon">🛒</div>
                  <div className="kpi-label">Add to Carts</div>
                  <div className="kpi-value">{formatNum(kpis.addToCarts)}</div>
                  <div className="kpi-subtext">
                    {kpis.transactions > 0 ? `${((kpis.transactions / kpis.addToCarts) * 100).toFixed(0)}% cart→purchase` : ''}
                  </div>
                </div>
              )}
              {kpis.checkouts > 0 && (
                <div className="kpi-card cyan">
                  <div className="kpi-icon">✅</div>
                  <div className="kpi-label">Checkouts</div>
                  <div className="kpi-value">{formatNum(kpis.checkouts)}</div>
                  <div className="kpi-subtext">
                    {kpis.addToCarts > 0 ? `${((kpis.checkouts / kpis.addToCarts) * 100).toFixed(0)}% of add-to-carts` : ''}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Sessions Over Time */}
        {sessions.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: '32px' }}>
              <span className="section-icon">📅</span>Sessions Over Time
            </div>
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Daily Traffic</div>
                  <div className="chart-card-subtitle">Sessions and active users per day</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={sessions}>
                  <defs>
                    <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="sessions" stroke="#3b82f6" fill="url(#sessGrad)" strokeWidth={2} name="Sessions" />
                  <Area type="monotone" dataKey="users" stroke="#8b5cf6" fill="url(#usersGrad)" strokeWidth={2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Tab: Channels ─────────────────────────────────────────────────────────
  function ChannelsTab() {
    return (
      <>
        {channels.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">🌐</span>Traffic Sources</div>
            <div className="charts-grid cols-2" style={{ marginBottom: '24px' }}>
              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Traffic by Channel</div>
                    <div className="chart-card-subtitle">Sessions by default channel grouping</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={channels} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis type="category" dataKey="channel" stroke="var(--text-dim)" fontSize={11} width={140} />
                    <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                    <Bar dataKey="sessions" name="Sessions" radius={[0, 6, 6, 0]}>
                      {channels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {devices.length > 0 && (
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <div className="chart-card-title">Device Breakdown</div>
                      <div className="chart-card-subtitle">Sessions by device type</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={devices}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        dataKey="sessions" nameKey="device"
                        label={({ payload }: { payload?: { device?: string; percentage?: number } }) =>
                          payload ? `${payload.device ?? ''} ${(payload.percentage ?? 0).toFixed(0)}%` : ''
                        }
                      >
                        {devices.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Channel Quality</div>
                    <div className="chart-card-subtitle">Bounce rate & conversions by traffic source</div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Channel</th>
                        <th>Sessions</th>
                        <th>Bounce Rate</th>
                        <th>Conversions</th>
                        {channels.some((ch) => ch.revenue > 0) && <th>Revenue</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((ch) => (
                        <tr key={ch.channel}>
                          <td className="highlight">{ch.channel}</td>
                          <td className="mono">{ch.sessions.toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`badge ${ch.bounceRate < 40 ? 'green' : ch.bounceRate < 65 ? 'amber' : 'rose'}`}>
                              {ch.bounceRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="mono">{ch.conversions}</td>
                          {channels.some((c) => c.revenue > 0) && (
                            <td className="mono">{ch.revenue > 0 ? `₹${ch.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {countries.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">🌍</span>Geographic Distribution</div>
            <div className="charts-grid cols-2" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Top Countries</div>
                    <div className="chart-card-subtitle">Sessions by country</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={countries.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis type="category" dataKey="country" stroke="var(--text-dim)" fontSize={11} width={100} />
                    <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                    <Bar dataKey="sessions" name="Sessions" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Country Breakdown</div>
                    <div className="chart-card-subtitle">Sessions, users and revenue by country</div>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Country</th>
                      <th>Sessions</th>
                      <th>Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map((c, i) => (
                      <tr key={c.country}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight">{c.country}</td>
                        <td className="mono">{c.sessions.toLocaleString('en-IN')}</td>
                        <td className="mono">{c.users.toLocaleString('en-IN')}</td>
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

  // ── Tab: Pages ────────────────────────────────────────────────────────────
  function PagesTab() {
    return (
      <>
        {pages.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">📄</span>Top Pages</div>
            <div className="data-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="data-table-header">
                <div className="data-table-title">Most Visited Pages</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Page</th>
                    <th>Views</th>
                    <th>Avg Duration</th>
                    <th>Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p, i) => (
                    <tr key={p.page}>
                      <td className="mono">{i + 1}</td>
                      <td className="highlight mono" style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</td>
                      <td className="mono">{p.pageviews.toLocaleString('en-IN')}</td>
                      <td className="mono">{formatDuration(p.avgTimeOnPage)}</td>
                      <td>
                        <span className={`badge ${p.bounceRate < 40 ? 'green' : p.bounceRate < 65 ? 'amber' : 'rose'}`}>
                          {p.bounceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {landingPages.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">🚪</span>Landing Pages</div>
            <div className="data-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="data-table-header">
                <div className="data-table-title">Entry Points & Conversion</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Landing Page</th>
                    <th>Sessions</th>
                    <th>Bounce Rate</th>
                    <th>Conversions</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {landingPages.map((lp, i) => (
                    <tr key={lp.page}>
                      <td className="mono">{i + 1}</td>
                      <td className="highlight mono" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lp.page}</td>
                      <td className="mono">{formatNum(lp.sessions)}</td>
                      <td>
                        <span className={`badge ${lp.bounceRate < 40 ? 'green' : lp.bounceRate < 65 ? 'amber' : 'rose'}`}>
                          {lp.bounceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="mono">{lp.conversions.toFixed(0)}</td>
                      <td className="mono">{lp.revenue > 0 ? `₹${lp.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {events.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">⚡</span>Key Events</div>
            <div className="data-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="data-table-header">
                <div className="data-table-title">User Actions & Engagement Events</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event</th>
                    <th>Total Count</th>
                    <th>Unique Users</th>
                    <th>Events / User</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={ev.eventName}>
                      <td className="mono">{i + 1}</td>
                      <td className="highlight">{ev.eventName}</td>
                      <td className="mono">{formatNum(ev.eventCount)}</td>
                      <td className="mono">{formatNum(ev.users)}</td>
                      <td className="mono">{ev.users > 0 ? (ev.eventCount / ev.users).toFixed(1) : '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Tab: Funnels ──────────────────────────────────────────────────────────
  function FunnelsTab() {
    function FunnelSection({
      title, subtitle, data, color,
    }: {
      title: string;
      subtitle: string;
      data: Array<{stage: string; count: number; dropoffRate: number}>;
      color: string;
    }) {
      return (
        <>
          <div className="chart-card" style={{ marginBottom: '16px' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">{title}</div>
                <div className="chart-card-subtitle">{subtitle}</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="stage" angle={-35} textAnchor="end" height={90} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  formatter={(v) => (typeof v === 'number' ? v.toLocaleString('en-IN') : v)}
                />
                <Bar dataKey="count" fill={color} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="data-table-wrapper" style={{ marginBottom: '32px' }}>
            <div className="data-table-header"><div className="data-table-title">Funnel Details</div></div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Count</th>
                  <th>% of Previous</th>
                  <th>Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {data.map((stage, i) => {
                  const prevCount = i > 0 ? data[i - 1].count : stage.count;
                  const pctOfPrev = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td className="highlight">{stage.stage}</td>
                      <td className="mono">{formatNum(stage.count)}</td>
                      <td className="mono">{pctOfPrev.toFixed(1)}%</td>
                      <td>
                        <span className={`badge ${stage.dropoffRate < 30 ? 'green' : stage.dropoffRate < 60 ? 'amber' : 'rose'}`}>
                          {stage.dropoffRate.toFixed(1)}%
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
        {conversionFunnel.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">🔄</span>Conversion Funnel</div>
            <FunnelSection
              title="Sessions → Purchase"
              subtitle="Full-funnel drop-off analysis"
              data={conversionFunnel}
              color="var(--accent-blue)"
            />
          </>
        )}
        {productFunnel.length > 0 && (
          <>
            <div className="section-title"><span className="section-icon">📦</span>Product Funnel</div>
            <FunnelSection
              title="View → Cart → Purchase"
              subtitle="Product discovery to purchase drop-off"
              data={productFunnel}
              color="var(--accent-green)"
            />
          </>
        )}
        {conversionFunnel.length === 0 && productFunnel.length === 0 && (
          <div className="connection-required" style={{ marginTop: '40px' }}>
            <div className="cr-icon">🔄</div>
            <h3>No Funnel Data</h3>
            <p>Funnel data will appear once GA4 e-commerce tracking is configured.</p>
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
            <p>Traffic, sessions, conversions and e-commerce data</p>
          </div>
          <DateRangeDropdown />
        </div>
      </div>

      {/* Tab bar */}
      <div className="dashboard-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {loading ? (
          <LoadingSkeleton />
        ) : kpis ? (
          <>
            {activeTab === 'overview'  && <OverviewTab />}
            {activeTab === 'channels'  && <ChannelsTab />}
            {activeTab === 'pages'     && <PagesTab />}
            {activeTab === 'funnels'   && <FunnelsTab />}
          </>
        ) : null}
      </div>
    </>
  );
}
