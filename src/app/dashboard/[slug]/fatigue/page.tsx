'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

interface FatigueAd {
  id: string;
  name: string;
  campaignName?: string;
  spend: number;
  impressions: number;
  frequency: number;
  ctr: number;
  cpm: number;
  roas: number;
  purchases: number;
  prevCtr: number | null;
  ctrChange: number | null;
  cpmChange: number | null;
  status: 'fatigued' | 'warning' | 'healthy' | 'new';
  reasons: string[];
  thumbnailUrl?: string;
}

interface FatigueData {
  ads: FatigueAd[];
  currentPeriod: { since: string; until: string };
  previousPeriod: { since: string; until: string };
  summary: {
    fatigued: number;
    warning: number;
    healthy: number;
    newAds: number;
    fatiguedSpend: number;
    totalSpend: number;
  };
}

const STATUS_META = {
  fatigued: { label: 'Fatigued', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', icon: '🔴' },
  warning:  { label: 'Warning',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  healthy:  { label: 'Healthy',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '🟢' },
  new:      { label: 'New',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '🔵' },
} as const;

export default function FatiguePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<FatigueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | FatigueAd['status']>('all');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/fatigue?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const visibleAds = (data?.ads ?? []).filter(a => filter === 'all' || a.status === filter);
  const wastedPct = s && s.totalSpend > 0 ? (s.fatiguedSpend / s.totalSpend) * 100 : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🧯 Creative Fatigue
            </h2>
            <p>
              {data
                ? `Comparing ${fmtDate(data.currentPeriod.since)}–${fmtDate(data.currentPeriod.until)} vs the previous period`
                : 'Which ads are burning out — rising frequency, falling CTR'}
            </p>
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

        {data && s && !loading && (
          <>
            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Fatigued Ads', value: String(s.fatigued),
                  sub: s.fatigued > 0 ? 'Need fresh creative now' : 'None — great!',
                  color: s.fatigued > 0 ? '#f43f5e' : '#22c55e',
                },
                {
                  label: 'Spend on Fatigued Ads', value: fmt(s.fatiguedSpend),
                  sub: `${wastedPct.toFixed(0)}% of period spend`,
                  color: wastedPct > 25 ? '#f43f5e' : wastedPct > 10 ? '#f59e0b' : '#22c55e',
                },
                {
                  label: 'Warnings', value: String(s.warning),
                  sub: 'Showing early fatigue signals', color: s.warning > 0 ? '#f59e0b' : '#22c55e',
                },
                {
                  label: 'Healthy / New', value: `${s.healthy} / ${s.newAds}`,
                  sub: 'Performing fine or too new to judge', color: '#22c55e',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(['all', 'fatigued', 'warning', 'healthy', 'new'] as const).map(f => {
                const count = f === 'all' ? data.ads.length : data.ads.filter(a => a.status === f).length;
                const active = filter === f;
                const color = f === 'all' ? 'var(--text-secondary)' : STATUS_META[f].color;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', textTransform: 'capitalize',
                      background: active ? `${f === 'all' ? 'rgba(255,255,255,0.1)' : STATUS_META[f as keyof typeof STATUS_META].bg}` : 'transparent',
                      border: `1px solid ${active ? color : 'var(--glass-border)'}`,
                      color: active ? color : 'var(--text-dim)',
                    }}
                  >
                    {f} ({count})
                  </button>
                );
              })}
            </div>

            {/* Ads table */}
            <div className="chart-card">
              {visibleAds.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: '13px' }}>
                  No ads in this category
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Ad</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Spend</th>
                        <th style={{ textAlign: 'right' }}>Frequency</th>
                        <th style={{ textAlign: 'right' }}>CTR</th>
                        <th style={{ textAlign: 'right' }}>CPM Δ</th>
                        <th style={{ textAlign: 'right' }}>ROAS</th>
                        <th style={{ textAlign: 'left' }}>Signals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleAds.map(ad => {
                        const meta = STATUS_META[ad.status];
                        return (
                          <tr key={ad.id}>
                            <td style={{ maxWidth: '260px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {ad.thumbnailUrl
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={ad.thumbnailUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                                  : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-elevated)', flexShrink: 0 }} />}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</div>
                                  {ad.campaignName && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.campaignName}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
                              }}>
                                {meta.icon} {meta.label}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(ad.spend)}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              <span style={{ color: ad.frequency >= 3 ? '#f43f5e' : ad.frequency >= 2.2 ? '#f59e0b' : 'var(--text-primary)' }}>
                                {ad.frequency.toFixed(1)}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              {ad.ctr.toFixed(2)}%
                              {ad.ctrChange !== null && (
                                <span style={{ marginLeft: 6, fontSize: '11px', color: ad.ctrChange < 0 ? '#f43f5e' : '#22c55e' }}>
                                  {ad.ctrChange < 0 ? '▼' : '▲'}{Math.abs(ad.ctrChange).toFixed(0)}%
                                </span>
                              )}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              {ad.cpmChange !== null ? (
                                <span style={{ color: ad.cpmChange > 20 ? '#f43f5e' : ad.cpmChange > 0 ? '#f59e0b' : '#22c55e' }}>
                                  {ad.cpmChange >= 0 ? '+' : ''}{ad.cpmChange.toFixed(0)}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              <span style={{ color: ad.roas >= 3 ? '#22c55e' : ad.roas >= 1.5 ? '#f59e0b' : '#f43f5e' }}>
                                {ad.roas > 0 ? `${ad.roas.toFixed(1)}x` : '—'}
                              </span>
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '200px' }}>
                              {ad.reasons.length > 0 ? ad.reasons.join(' · ') : '—'}
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
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How fatigue is detected</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Frequency</strong><br />
                  How many times the average person has seen the ad. Above ~2.5 the same people are seeing it repeatedly; above 3 fatigue is almost guaranteed.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>CTR decline</strong><br />
                  Falling click-through vs the previous period means the audience is tuning the creative out. A 15%+ drop is a warning; 30%+ confirms fatigue.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>What to do</strong><br />
                  For fatigued ads: swap the creative (new hook/visual), broaden the audience, or pause and rotate. Don&apos;t just raise budget — that accelerates burnout.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
