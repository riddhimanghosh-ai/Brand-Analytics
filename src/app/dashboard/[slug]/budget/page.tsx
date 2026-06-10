'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

interface BudgetMove {
  fromCampaign: string;
  fromRoas: number;
  fromSpend: number;
  toCampaign: string;
  toRoas: number;
  amount: number;
  estMonthlyGain: number;
}

interface CampaignRow {
  name: string;
  status?: string;
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
  bucket: 'winner' | 'loser' | 'middle';
}

interface BudgetData {
  breakEvenRoas: number;
  breakEvenSource: 'cogs' | 'default';
  blendedRoas: number;
  totalSpend: number;
  totalRevenue: number;
  winnerThreshold: number;
  loserThreshold: number;
  marginalFactor: number;
  campaigns: CampaignRow[];
  moves: BudgetMove[];
  totalEstMonthlyGain: number;
}

const BUCKET_META = {
  winner: { label: 'Scale', icon: '🏆', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  middle: { label: 'Watch', icon: '👀', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  loser:  { label: 'Cut',   icon: '✂️', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
} as const;

export default function BudgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/budget-moves?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              ♟️ Budget Moves
            </h2>
            <p>Where your ad money is dying — and where to move it</p>
          </div>
          <DateRangeDropdown />
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
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

        {data && !loading && (
          <>
            {/* Context KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Blended Campaign ROAS', value: `${data.blendedRoas.toFixed(2)}x`,
                  sub: `${fmt(data.totalRevenue)} attributed on ${fmt(data.totalSpend)} spend`,
                  color: data.blendedRoas >= data.breakEvenRoas ? '#22c55e' : '#f43f5e',
                },
                {
                  label: 'Break-even ROAS', value: `${data.breakEvenRoas.toFixed(2)}x`,
                  sub: data.breakEvenSource === 'cogs' ? 'From your COGS settings' : 'Default — set COGS in Profitability for accuracy',
                  color: 'var(--text-primary)',
                },
                {
                  label: 'Est. Monthly Gain Available', value: data.totalEstMonthlyGain > 0 ? `+${fmt(data.totalEstMonthlyGain)}` : '—',
                  sub: data.moves.length > 0 ? `From ${data.moves.length} recommended move${data.moves.length > 1 ? 's' : ''}` : 'No clear reallocation wins right now',
                  color: data.totalEstMonthlyGain > 0 ? '#22c55e' : 'var(--text-secondary)',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Recommended moves */}
            {data.moves.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {data.moves.map((m, i) => (
                  <div key={i} className="chart-card" style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '22px' }}>💸</div>
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                          Shift ~{fmt(m.amount)}/month
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          From <strong style={{ color: '#f87171' }}>{m.fromCampaign}</strong> ({m.fromRoas}x ROAS)
                          {' '}→ <strong style={{ color: '#22c55e' }}>{m.toCampaign}</strong> ({m.toRoas}x ROAS)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e' }}>+{fmt(m.estMonthlyGain)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>est. revenue / month</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', paddingLeft: '4px' }}>
                  Estimates assume shifted budget performs at {(data.marginalFactor * 100).toFixed(0)}% of the target campaign&apos;s average ROAS (marginal returns). Shift gradually — 20% steps — and watch for 3–4 days.
                </div>
              </div>
            )}

            {/* Campaign table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">📋 All Campaigns ({data.campaigns.length})</div>
                  <div className="chart-card-subtitle">
                    Scale ≥ {data.winnerThreshold}x · Cut &lt; {data.loserThreshold}x · thresholds derived from your break-even
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Campaign</th>
                      <th style={{ textAlign: 'center' }}>Verdict</th>
                      <th style={{ textAlign: 'right' }}>Spend</th>
                      <th style={{ textAlign: 'right' }}>Attributed Revenue</th>
                      <th style={{ textAlign: 'right' }}>ROAS</th>
                      <th style={{ textAlign: 'right' }}>Purchases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map(c => {
                      const meta = BUCKET_META[c.bucket];
                      return (
                        <tr key={c.name}>
                          <td style={{ fontWeight: 600, fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                              background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
                            }}>
                              {meta.icon} {meta.label}
                            </span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.spend)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{fmt(c.revenue)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            <span style={{ color: meta.color, fontWeight: 700 }}>{c.roas.toFixed(2)}x</span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{c.purchases}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Caveats */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Before you move money</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Attribution caveat</strong><br />
                  These are Meta-attributed numbers. Cross-check with your <Link href={`/dashboard/${slug}/mer`} style={{ color: 'var(--accent-blue)' }}>blended MER</Link> — if platforms over-claim, real ROAS is lower across the board.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Prospecting vs retargeting</strong><br />
                  Retargeting campaigns always show higher ROAS but depend on prospecting to fill the pool. Don&apos;t starve top-of-funnel to feed bottom-of-funnel.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Learning phase</strong><br />
                  Big budget jumps reset Meta&apos;s learning phase. Move in ≤20% steps every 3–4 days rather than one big shift.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
