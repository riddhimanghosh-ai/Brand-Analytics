'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

interface KlaviyoKPIs {
  totalRevenue: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  campaignsSent: number;
  activeFlows: number;
  totalProfiles: number;
  newProfiles30d: number;
}

interface KlaviyoCampaign {
  id: string;
  name: string;
  status: string;
  sentAt: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  revenue: number;
  unsubscribeRate: number;
}

interface KlaviyoFlow {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  revenue30d: number;
  emails30d: number;
}

interface KlaviyoData {
  kpis: KlaviyoKPIs | null;
  campaigns: KlaviyoCampaign[];
  flows: KlaviyoFlow[];
  error?: string;
}

/** Returns badge class based on whether a metric is good, warning, or bad. */
function benchmarkBadge(value: number, goodThreshold: number, badThreshold: number, lowerIsBetter = false): string {
  if (lowerIsBetter) {
    if (value <= goodThreshold) return 'green';
    if (value <= badThreshold) return 'amber';
    return 'rose';
  }
  if (value >= goodThreshold) return 'green';
  if (value >= badThreshold) return 'amber';
  return 'rose';
}

export default function KlaviyoPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<KlaviyoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/klaviyo?slug=${slug}&from=${from}&to=${to}`);
        if (!res.ok) throw new Error('Failed to fetch Klaviyo data');
        const result = await res.json();
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading Klaviyo data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, from, to]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Klaviyo Email Marketing</h2>
            <p>Campaign performance, revenue &amp; engagement metrics</p>
          </div>
          <DateRangeDropdown />
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <>
            <div className="kpi-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="kpi-card">
                  <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-title" />
                </div>
              ))}
            </div>
            <div className="chart-card" style={{ marginTop: '16px' }}>
              <div className="skeleton skeleton-chart" />
            </div>
          </>
        )}

        {!loading && error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (!data || !data.kpis) && (
          <div style={{ color: 'var(--text-secondary)' }}>
            No Klaviyo data available. Connect your account in Settings.
          </div>
        )}

        {!loading && !error && data && data.kpis && (() => {
          const kpis = data.kpis!;
          const openRatePct = kpis.openRate * 100;
          const clickRatePct = kpis.clickRate * 100;
          const bounceRatePct = kpis.bounceRate * 100;
          const unsubRatePct = kpis.unsubscribeRate * 100;

          return (
            <>
              {/* Primary KPI grid */}
              <div className="kpi-grid">
                <div className="kpi-card emerald">
                  <div className="kpi-label">Total Revenue</div>
                  <div className="kpi-value">
                    ₹{kpis.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="kpi-card blue">
                  <div className="kpi-label">Campaigns Sent</div>
                  <div className="kpi-value">{kpis.campaignsSent.toLocaleString()}</div>
                </div>
                <div className="kpi-card violet">
                  <div className="kpi-label">Total Profiles</div>
                  <div className="kpi-value">{kpis.totalProfiles.toLocaleString()}</div>
                  <div className="kpi-subtext">+{kpis.newProfiles30d.toLocaleString()} new (30d)</div>
                </div>
                <div className="kpi-card amber">
                  <div className="kpi-label">Active Flows</div>
                  <div className="kpi-value">{kpis.activeFlows.toLocaleString()}</div>
                </div>
              </div>

              {/* Benchmarks row — engagement rates with good/warn/bad indicators */}
              <div className="chart-card" style={{ marginTop: '24px' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Engagement Benchmarks</div>
                    <div className="chart-card-subtitle">
                      Industry averages: Open &gt;20% · Click &gt;2% · Bounce &lt;2% · Unsub &lt;0.5%
                    </div>
                  </div>
                </div>
                <div className="kpi-grid" style={{ marginTop: '12px' }}>
                  <div className="kpi-card">
                    <div className="kpi-label">Open Rate</div>
                    <div className="kpi-value">{openRatePct.toFixed(2)}%</div>
                    <div className="kpi-subtext">
                      <span className={`badge ${benchmarkBadge(openRatePct, 20, 10)}`}>
                        {openRatePct >= 20 ? 'Good' : openRatePct >= 10 ? 'Below avg' : 'Poor'}
                      </span>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Click Rate</div>
                    <div className="kpi-value">{clickRatePct.toFixed(2)}%</div>
                    <div className="kpi-subtext">
                      <span className={`badge ${benchmarkBadge(clickRatePct, 2, 1)}`}>
                        {clickRatePct >= 2 ? 'Good' : clickRatePct >= 1 ? 'Below avg' : 'Poor'}
                      </span>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Bounce Rate</div>
                    <div className="kpi-value">{bounceRatePct.toFixed(2)}%</div>
                    <div className="kpi-subtext">
                      <span className={`badge ${benchmarkBadge(bounceRatePct, 2, 5, true)}`}>
                        {bounceRatePct <= 2 ? 'Good' : bounceRatePct <= 5 ? 'Watch' : 'High'}
                      </span>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Unsubscribe Rate</div>
                    <div className="kpi-value">{unsubRatePct.toFixed(2)}%</div>
                    <div className="kpi-subtext">
                      <span className={`badge ${benchmarkBadge(unsubRatePct, 0.5, 1, true)}`}>
                        {unsubRatePct <= 0.5 ? 'Good' : unsubRatePct <= 1 ? 'Watch' : 'High'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaigns table */}
              <div className="section-title" style={{ marginTop: '32px' }}>
                <span className="section-icon">📨</span>
                Campaigns
              </div>

              <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
                <div className="data-table-header">
                  <div className="data-table-title">Top Campaigns</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Campaign Name</th>
                        <th>Recipients</th>
                        <th>Open Rate</th>
                        <th>Click Rate</th>
                        <th>Revenue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                            No campaigns in this date range.
                          </td>
                        </tr>
                      ) : data.campaigns.map((c) => (
                        <tr key={c.id}>
                          <td className="highlight">{c.name}</td>
                          <td className="mono">{c.recipients.toLocaleString()}</td>
                          <td>
                            <span className={`badge ${benchmarkBadge(c.openRate * 100, 20, 10)}`}>
                              {(c.openRate * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${benchmarkBadge(c.clickRate * 100, 2, 1)}`}>
                              {(c.clickRate * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="mono">
                            ₹{c.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'sent' ? 'green' : c.status === 'draft' ? 'gray' : 'amber'}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Flows table */}
              {data.flows && data.flows.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: '32px' }}>
                    <span className="section-icon">🔄</span>
                    Flows
                  </div>

                  <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
                    <div className="data-table-header">
                      <div className="data-table-title">Active Flows</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Flow Name</th>
                            <th>Trigger</th>
                            <th>Emails Sent (30d)</th>
                            <th>Revenue (30d)</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.flows.map((f) => (
                            <tr key={f.id}>
                              <td className="highlight">{f.name}</td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {f.triggerType}
                              </td>
                              <td className="mono">{f.emails30d.toLocaleString()}</td>
                              <td className="mono">
                                ₹{f.revenue30d.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td>
                                <span className={`badge ${f.status === 'live' ? 'green' : f.status === 'draft' ? 'gray' : 'amber'}`}>
                                  {f.status}
                                </span>
                              </td>
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
        })()}
      </div>
    </>
  );
}
