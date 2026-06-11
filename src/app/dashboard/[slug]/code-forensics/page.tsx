'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

type Verdict = 'growth_driver' | 'deal_hunters' | 'mixed' | 'low_volume';

interface CodeRow {
  code: string;
  orders: number;
  revenue: number;
  aov: number;
  newCustomerShare: number;
  totalDiscount: number;
  avgDiscountPct: number;
  repeatCustomerShare: number;
  dealHunterScore: number;
  verdict: Verdict;
  verdictReason: string;
}

interface ForensicsData {
  rows: CodeRow[];
  dateRange: string;
  summary: {
    totalOrders: number;
    discountedOrders: number;
    totalDiscountGiven: number;
  };
}

const VERDICT_CONFIG: Record<Verdict, { label: string; icon: string; color: string; bg: string }> = {
  growth_driver: { label: 'Growth Driver', icon: '🚀', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  deal_hunters:  { label: 'Deal Hunters',  icon: '🎯', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)'  },
  mixed:         { label: 'Mixed',         icon: '⚖️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low_volume:    { label: 'Low Volume',    icon: '📊', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function CodeForensicsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<ForensicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Verdict | 'all'>('all');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    const range = from && to ? `${from}:${to}` : '90d';
    fetch(`/api/code-forensics?slug=${slug}&range=${range}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const rows = (data?.rows ?? []).filter(r => filter === 'all' || r.verdict === filter);

  const verdictCounts = (data?.rows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>🧬 Code Quality Forensics</h2>
            <p>Not all codes are equal — find which ones bring loyal customers vs one-time deal hunters</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <DateRangeDropdown />
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="chart-card">
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>Analysing customer behaviour per discount code…</div>
            {[75, 60, 70, 55, 65].map((w, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, height: '60px', marginBottom: '10px' }} />
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
            {/* Verdict filter tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {([
                { value: 'all', label: `All Codes (${data.rows.length})`, color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.12)' },
                ...(['growth_driver', 'deal_hunters', 'mixed', 'low_volume'] as Verdict[]).map(v => ({
                  value: v,
                  label: `${VERDICT_CONFIG[v].icon} ${VERDICT_CONFIG[v].label} (${verdictCounts[v] ?? 0})`,
                  color: VERDICT_CONFIG[v].color,
                  bg: VERDICT_CONFIG[v].bg,
                })),
              ] as { value: Verdict | 'all'; label: string; color: string; bg: string }[]).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${filter === tab.value ? tab.color : 'var(--glass-border)'}`,
                    background: filter === tab.value ? tab.bg : 'var(--bg-card)',
                    color: filter === tab.value ? tab.color : 'var(--text-secondary)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {rows.length === 0 && (
              <div style={{ padding: '32px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                No codes in this category with ≥3 orders in the selected period.
              </div>
            )}

            {/* Code cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rows.map(row => {
                const vc = VERDICT_CONFIG[row.verdict];
                return (
                  <div key={row.code} style={{
                    padding: '18px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', border: `1px solid var(--glass-border)`,
                    borderLeft: `3px solid ${vc.color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <code style={{
                          fontSize: '15px', fontWeight: 800, letterSpacing: '0.08em',
                          fontFamily: 'var(--f-mono)', color: 'var(--text-primary)',
                          background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px',
                        }}>{row.code}</code>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                          background: vc.bg, color: vc.color,
                        }}>
                          {vc.icon} {vc.label}
                        </span>
                      </div>
                      {/* Deal-hunter score bar */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>Deal-Hunter Score</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '80px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${row.dealHunterScore}%`, borderRadius: '3px',
                              background: row.dealHunterScore >= 65 ? '#f43f5e' : row.dealHunterScore >= 35 ? '#f59e0b' : '#22c55e',
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: row.dealHunterScore >= 65 ? '#f43f5e' : row.dealHunterScore >= 35 ? '#f59e0b' : '#22c55e' }}>
                            {row.dealHunterScore}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '12px' }}>
                      {[
                        { label: 'Orders', value: String(row.orders) },
                        { label: 'Revenue', value: fmt(row.revenue) },
                        { label: 'AOV', value: fmt(row.aov) },
                        { label: 'Discount Given', value: fmt(row.totalDiscount) },
                        { label: 'New Cust. Share', value: `${row.newCustomerShare.toFixed(0)}%`, warn: row.newCustomerShare > 75 },
                        { label: 'Repeat Share', value: `${row.repeatCustomerShare.toFixed(0)}%`, good: row.repeatCustomerShare > 40 },
                      ].map(k => (
                        <div key={k.label} style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '16px', fontWeight: 800,
                            color: k.warn ? '#f59e0b' : k.good ? '#22c55e' : 'var(--text-primary)',
                          }}>{k.value}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.3 }}>{k.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Verdict reason */}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '6px', background: `${vc.color}08` }}>
                      {vc.icon} {row.verdictReason}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* How to use */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Using these findings</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: '#22c55e' }}>🚀 Growth Drivers</strong><br />
                  These codes bring buyers who come back. Give them to your best-fit channels — lookalike audiences, retention emails, referrals. Increase the budget behind them.
                </div>
                <div>
                  <strong style={{ color: '#f43f5e' }}>🎯 Deal Hunters</strong><br />
                  High new-customer share + high discount = people who price-shop and don&apos;t return. Reduce or retire these codes, or add a minimum order value to filter out cherry-pickers.
                </div>
                <div>
                  <strong style={{ color: '#f59e0b' }}>⚖️ Mixed</strong><br />
                  Monitor over a full 90-day window. A code that looks mixed at 30 days often resolves to growth-driver or deal-hunter with more data. Re-check before scaling.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
