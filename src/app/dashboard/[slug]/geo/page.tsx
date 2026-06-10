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

interface GeoData {
  locationBreakdown: {
    byCountry: { country: string; countryCode: string; orders: number; revenue: number }[];
    byCity: { city: string; province: string; country: string; orders: number; revenue: number }[];
  };
}

export default function GeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'city' | 'state'>('city');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/shopify?slug=${slug}&from=${from}&to=${to}&action=advanced`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const cities = data?.locationBreakdown?.byCity ?? [];

  // Aggregate by state/province
  const stateMap = new Map<string, { orders: number; revenue: number }>();
  for (const c of cities) {
    const key = c.province || 'Unknown';
    const s = stateMap.get(key) ?? { orders: 0, revenue: 0 };
    s.orders += c.orders;
    s.revenue += c.revenue;
    stateMap.set(key, s);
  }
  const states = [...stateMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const rows = view === 'city'
    ? cities.map(c => ({ name: c.city, sub: c.province, orders: c.orders, revenue: c.revenue }))
    : states.map(s => ({ name: s.name, sub: '', orders: s.orders, revenue: s.revenue }));

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const maxRevenue = rows.length > 0 ? rows[0].revenue : 0;

  // Concentration: revenue share of top 3 regions
  const top3Share = totalRevenue > 0
    ? (rows.slice(0, 3).reduce((s, r) => s + r.revenue, 0) / totalRevenue) * 100
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🗺️ Geo Revenue
            </h2>
            <p>Where the money comes from — match your ad geo-targeting to reality</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['city', 'state'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    textTransform: 'capitalize',
                    border: `1px solid ${view === v ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                    background: view === v ? 'rgba(59,130,246,0.12)' : 'var(--bg-card)',
                    color: view === v ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}
                >
                  By {v}
                </button>
              ))}
            </div>
            <DateRangeDropdown />
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="chart-card">
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>Crunching order locations…</div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${90 - i * 8}%`, height: '26px', marginBottom: '8px' }} />
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
            {/* Concentration KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: `Top 3 ${view === 'city' ? 'Cities' : 'States'} Share`, value: `${top3Share.toFixed(0)}%`,
                  sub: rows.slice(0, 3).map(r => r.name).join(', ') || '—',
                  color: top3Share > 60 ? '#f59e0b' : '#22c55e',
                },
                {
                  label: `${view === 'city' ? 'Cities' : 'States'} With Orders`, value: String(rows.length),
                  sub: 'In the selected period', color: 'var(--text-primary)',
                },
                {
                  label: 'Highest AOV Region',
                  value: (() => {
                    const eligible = rows.filter(r => r.orders >= 10);
                    if (!eligible.length) return '—';
                    const best = eligible.reduce((a, b) => (a.revenue / a.orders) > (b.revenue / b.orders) ? a : b);
                    return best.name;
                  })(),
                  sub: 'Min 10 orders — premium pocket worth targeting',
                  color: '#22c55e',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color, fontSize: k.label.includes('AOV') ? '18px' : undefined }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Ranked bars */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">📍 Revenue by {view === 'city' ? 'City' : 'State'}</div>
                  <div className="chart-card-subtitle">Top {Math.min(30, rows.length)} regions by revenue</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rows.slice(0, 30).map((r, i) => {
                  const share = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
                  const width = maxRevenue > 0 ? (r.revenue / maxRevenue) * 100 : 0;
                  const aov = r.orders > 0 ? r.revenue / r.orders : 0;
                  return (
                    <div key={`${r.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '20px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>{i + 1}</span>
                      <div style={{ width: '170px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        {r.sub && <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{r.sub}</div>}
                      </div>
                      <div style={{ flex: 1, height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${width}%`, borderRadius: '4px',
                          background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`,
                          opacity: 0.85,
                        }} />
                      </div>
                      <span className="mono" style={{ width: '86px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>{fmt(r.revenue)}</span>
                      <span className="mono" style={{ width: '46px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)' }}>{share.toFixed(1)}%</span>
                      <span className="mono" style={{ width: '90px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {r.orders} ord · {fmt(aov)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How to use */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Acting on geography</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Match ads to money</strong><br />
                  Open Meta Ads Manager &rarr; breakdown by region, and compare spend share vs the revenue share here. Cities converting above their spend share deserve dedicated budget.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>High-AOV pockets</strong><br />
                  Regions with high AOV but few orders are underexploited premium markets — try a city-specific campaign before concluding they don&apos;t work.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Shipping economics</strong><br />
                  If a far region has high orders but heavy COD returns or slow delivery, geo data is also your case for a regional warehouse or courier switch.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
