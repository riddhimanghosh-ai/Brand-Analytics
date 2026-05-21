'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

interface TikTokKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  videoViews: number;
  reach: number;
}

interface TikTokCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  videoViews: number;
}

interface TikTokData {
  kpis: TikTokKPIs | null;
  campaigns: TikTokCampaign[];
  error?: string;
}

function roasBadgeClass(roas: number) {
  if (roas >= 2) return 'green';
  if (roas >= 1) return 'amber';
  return 'rose';
}

export default function TikTokPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<TikTokData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/tiktok?slug=${slug}&from=${from}&to=${to}`);
        if (!res.ok) throw new Error('Failed to fetch TikTok data');
        const result = await res.json();
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading TikTok data');
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
            <h2>TikTok Ads</h2>
            <p>Campaign performance, spend &amp; ROAS</p>
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
            No TikTok data available. Connect your account in Settings.
          </div>
        )}

        {!loading && !error && data && data.kpis && (() => {
          const kpis = data.kpis!;
          const cpm = kpis.impressions > 0 ? (kpis.spend / kpis.impressions) * 1000 : 0;

          return (
            <>
              {/* Primary KPI grid */}
              <div className="kpi-grid">
                <div className="kpi-card rose">
                  <div className="kpi-label">Total Spend</div>
                  <div className="kpi-value">
                    ₹{kpis.spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="kpi-card emerald">
                  <div className="kpi-label">Conversions</div>
                  <div className="kpi-value">{kpis.conversions.toLocaleString()}</div>
                </div>
                <div className="kpi-card blue">
                  <div className="kpi-label">ROAS</div>
                  <div className="kpi-value">{kpis.roas.toFixed(2)}x</div>
                  <div className="kpi-subtext">
                    {kpis.roas >= 2 ? 'Strong' : kpis.roas >= 1 ? 'Moderate' : 'Below target'}
                  </div>
                </div>
                <div className="kpi-card amber">
                  <div className="kpi-label">CPM</div>
                  <div className="kpi-value">₹{cpm.toFixed(0)}</div>
                </div>
                <div className="kpi-card cyan">
                  <div className="kpi-label">Impressions</div>
                  <div className="kpi-value">
                    {(kpis.impressions / 1000).toFixed(1)}K
                  </div>
                </div>
                <div className="kpi-card violet">
                  <div className="kpi-label">Clicks</div>
                  <div className="kpi-value">{kpis.clicks.toLocaleString()}</div>
                </div>
                <div className="kpi-card blue">
                  <div className="kpi-label">CTR</div>
                  <div className="kpi-value">{(kpis.ctr * 100).toFixed(2)}%</div>
                </div>
                <div className="kpi-card amber">
                  <div className="kpi-label">CPC</div>
                  <div className="kpi-value">₹{kpis.cpc.toFixed(0)}</div>
                </div>
              </div>

              {/* Campaigns table */}
              <div className="data-table-wrapper" style={{ marginTop: '24px' }}>
                <div className="data-table-header">
                  <div className="data-table-title">Top Campaigns</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Campaign Name</th>
                        <th>Spend</th>
                        <th>Clicks</th>
                        <th>Conversions</th>
                        <th>ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                            No campaigns in this date range.
                          </td>
                        </tr>
                      ) : data.campaigns.map((c) => (
                        <tr key={c.id}>
                          <td className="highlight">{c.name}</td>
                          <td className="mono">
                            ₹{c.spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="mono">{c.clicks.toLocaleString()}</td>
                          <td className="mono" style={{ color: '#22c55e', fontWeight: 600 }}>
                            {c.conversions.toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${roasBadgeClass(c.roas)}`}>
                              {c.roas.toFixed(2)}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
