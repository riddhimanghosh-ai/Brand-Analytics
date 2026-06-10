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

interface ThemeRow {
  key: string;
  label: string;
  icon: string;
  ads: number;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  purchases: number;
  spendShare: number;
  revenueShare: number;
  topAds: Array<{ name: string; spend: number; roas: number }>;
}

interface ThemesData {
  themes: ThemeRow[];
  totalAds: number;
  totalSpend: number;
  totalRevenue: number;
  note: string;
}

export default function CreativeThemesPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<ThemesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/creative-themes?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const blendedRoas = data && data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🎨 Creative Themes
            </h2>
            <p>Which creative format earns its budget — UGC vs static vs video vs offer-led</p>
          </div>
          <DateRangeDropdown />
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="chart-card">
                <div className="skeleton skeleton-text" style={{ width: '50%', height: '18px' }} />
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
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
              {data.totalAds} ads · {fmt(data.totalSpend)} spend · blended {blendedRoas.toFixed(2)}x — {data.note}
            </div>

            {/* Theme rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.themes.map(t => {
                const isOpen = expanded === t.key;
                const efficient = t.revenueShare >= t.spendShare;
                return (
                  <div key={t.key} className="chart-card" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : t.key)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{t.icon}</div>
                      <div style={{ width: '150px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{t.ads} ads</div>
                      </div>

                      {/* Spend vs revenue share bars */}
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '52px' }}>Spend</span>
                          <div style={{ flex: 1, height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, t.spendShare)}%`, background: '#f59e0b', borderRadius: '4px' }} />
                          </div>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)', width: '38px', textAlign: 'right' }}>{t.spendShare}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '52px' }}>Revenue</span>
                          <div style={{ flex: 1, height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, t.revenueShare)}%`, background: efficient ? '#22c55e' : '#f43f5e', borderRadius: '4px' }} />
                          </div>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)', width: '38px', textAlign: 'right' }}>{t.revenueShare}%</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', width: '90px' }}>
                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: t.roas >= blendedRoas ? '#22c55e' : t.roas >= blendedRoas * 0.7 ? '#f59e0b' : '#f43f5e' }}>
                          {t.roas.toFixed(2)}x
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>ROAS</div>
                      </div>
                      <div style={{ textAlign: 'right', width: '80px' }}>
                        <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>{t.ctr.toFixed(2)}%</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>CTR</div>
                      </div>
                      <div style={{ textAlign: 'right', width: '100px' }}>
                        <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>{fmt(t.spend)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>spend</div>
                      </div>
                      <div style={{ width: '18px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>
                        {isOpen ? '▾' : '▸'}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          Top ads in this theme
                        </div>
                        {t.topAds.map(a => (
                          <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', padding: '4px 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                            <span className="mono" style={{ flexShrink: 0 }}>
                              {fmt(a.spend)} · <span style={{ color: a.roas >= blendedRoas ? '#22c55e' : '#f43f5e' }}>{a.roas.toFixed(1)}x</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* How to read */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to use this</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Green vs orange bars</strong><br />
                  A theme earning a bigger share of revenue than of spend (green) is pulling its weight. Red revenue bar below the spend bar = subsidised format.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Brief your next batch</strong><br />
                  Double down on the top theme&apos;s format in your next creative brief, and stop producing the format that&apos;s red — production time is a budget too.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Naming hygiene</strong><br />
                  Themes are parsed from ad names (UGC, Static, MotionGraphic…). Keep the convention in new ads and &ldquo;Unclassified&rdquo; stays small.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
