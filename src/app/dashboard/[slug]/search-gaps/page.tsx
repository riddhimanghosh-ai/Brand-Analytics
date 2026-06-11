'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

interface SearchTerm {
  term: string;
  searches: number;
  share: number;
  hasProductMatch: boolean;
}

interface SearchData {
  hasGA4: boolean;
  hasSearchData: boolean;
  totalSearches: number;
  terms: SearchTerm[];
}

export default function SearchGapsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'gaps'>('gaps');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    const range = from && to ? `${from}:${to}` : '30d';
    fetch(`/api/search-gaps?slug=${slug}&range=${range}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const rows = data?.terms.filter(t => filter === 'all' || !t.hasProductMatch) ?? [];
  const gapCount = data?.terms.filter(t => !t.hasProductMatch).length ?? 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>🔍 Search Gap Miner</h2>
            <p>What shoppers typed in your search bar but couldn&apos;t find — free product roadmap</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['gaps', 'all'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  style={{
                    padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${filter === v ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                    background: filter === v ? 'rgba(59,130,246,0.12)' : 'var(--bg-card)',
                    color: filter === v ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}
                >
                  {v === 'gaps' ? `Gaps only (${gapCount})` : 'All searches'}
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
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>Fetching site search data from GA4…</div>
            {[70, 55, 65, 50, 60].map((w, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, height: '26px', marginBottom: '8px' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: '24px' }}>
            ❌ {error}
          </div>
        )}

        {data && !loading && !data.hasGA4 && (
          <div style={{ padding: '32px', borderRadius: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Google Analytics not connected</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Connect GA4 in Settings to start tracking site search terms.
            </div>
          </div>
        )}

        {data && !loading && data.hasGA4 && !data.hasSearchData && (
          <div style={{ padding: '32px', borderRadius: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>No site search events found</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              GA4 is connected but no <code>view_search_results</code> events were tracked in this period.
              Make sure your Shopify theme or GTM fires this event when someone uses the search bar.
            </div>
          </div>
        )}

        {data && !loading && data.hasSearchData && (
          <>
            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Total Searches', value: data.totalSearches.toLocaleString('en-IN'), sub: 'In the selected period' },
                { label: 'Unique Terms', value: data.terms.length.toLocaleString('en-IN'), sub: 'Distinct search queries' },
                { label: 'Unmet Gaps', value: String(gapCount), sub: 'Searches with no product match', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Search terms table */}
            <div className="chart-card">
              <div className="chart-card-header" style={{ marginBottom: '16px' }}>
                <div>
                  <div className="chart-card-title">
                    {filter === 'gaps' ? '🚧 Searches With No Matching Product' : '📋 All Search Terms'}
                  </div>
                  <div className="chart-card-subtitle">
                    {filter === 'gaps'
                      ? 'High-volume gaps = demand you\'re leaving on the table'
                      : `${data.totalSearches.toLocaleString('en-IN')} total searches`}
                  </div>
                </div>
              </div>

              {rows.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                  {filter === 'gaps' ? '✅ All high-volume searches have matching products.' : 'No search data available.'}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rows.map((row, i) => {
                  const maxSearches = rows[0]?.searches ?? 1;
                  const barWidth = (row.searches / maxSearches) * 100;
                  return (
                    <div key={row.term} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '22px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>{i + 1}</span>
                      <div style={{ width: '200px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.term}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '1px' }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                            background: row.hasProductMatch ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
                            color: row.hasProductMatch ? '#22c55e' : '#f43f5e',
                          }}>
                            {row.hasProductMatch ? '✓ product match' : '✗ no match'}
                          </span>
                        </div>
                      </div>
                      <div style={{ flex: 1, height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{
                          height: '100%', width: `${barWidth}%`, borderRadius: '4px',
                          background: row.hasProductMatch
                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                            : 'linear-gradient(90deg, #f43f5e, #e11d48)',
                          opacity: 0.8,
                        }} />
                      </div>
                      <span className="mono" style={{ width: '60px', textAlign: 'right', fontSize: '12px', fontWeight: 700 }}>
                        {row.searches.toLocaleString('en-IN')}
                      </span>
                      <span className="mono" style={{ width: '46px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)' }}>
                        {row.share.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Turning gaps into revenue</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Add the collection</strong><br />
                  If 50+ people searched &ldquo;gift set&rdquo; this month and you have no gift-set collection, create one. The search intent already exists — you&apos;re just not meeting it.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Redirect to nearest product</strong><br />
                  In Shopify Search &amp; Discovery, add a synonym or redirect: &ldquo;oud&rdquo; → your oud collection. Converts high-intent zero-result searches without new inventory.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Feed the ad creative team</strong><br />
                  Top unmet searches = exact words buyers use. Use them in ad copy, product descriptions, and landing page H1s. It&apos;s first-party keyword research.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
