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

interface DiscountCodeStats {
  code: string;
  orders: number;
  revenue: number;
  totalDiscount: number;
  aov: number;
  avgDiscountPct: number;
  newCustomerOrders: number;
  newCustomerShare: number;
}

interface DiscountData {
  codes: DiscountCodeStats[];
  summary: {
    totalOrders: number;
    discountedOrders: number;
    discountedShare: number;
    discountedRevenue: number;
    nonDiscountedRevenue: number;
    totalDiscountGiven: number;
    discountedAov: number;
    nonDiscountedAov: number;
  };
}

type SortKey = 'revenue' | 'orders' | 'totalDiscount' | 'aov' | 'avgDiscountPct' | 'newCustomerShare';

export default function DiscountsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<DiscountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/shopify/discounts?slug=${slug}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  const sortedCodes = data
    ? [...data.codes].sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]))
    : [];

  const s = data?.summary;
  // Net revenue retained per rupee of discount
  const discountRoi = s && s.totalDiscountGiven > 0 ? s.discountedRevenue / s.totalDiscountGiven : 0;

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDesc ? ' ↓' : ' ↑') : '';

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🏷️ Discount Codes
            </h2>
            <p>Which codes drive revenue — and which just erode margin</p>
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
                  label: 'Total Discount Given', value: fmt(s.totalDiscountGiven),
                  sub: `${((s.totalDiscountGiven / ((s.discountedRevenue + s.nonDiscountedRevenue) || 1)) * 100).toFixed(1)}% of revenue`,
                  color: '#f43f5e',
                },
                {
                  label: 'Orders Using a Code', value: `${s.discountedShare.toFixed(1)}%`,
                  sub: `${s.discountedOrders.toLocaleString('en-IN')} of ${s.totalOrders.toLocaleString('en-IN')} orders`,
                  color: s.discountedShare > 70 ? '#f59e0b' : 'var(--text-primary)',
                },
                {
                  label: 'AOV: Discounted vs Full Price', value: `${fmt(s.discountedAov)} / ${fmt(s.nonDiscountedAov)}`,
                  sub: s.discountedAov > s.nonDiscountedAov ? 'Codes lift basket size ✅' : 'Codes do NOT lift basket size',
                  color: s.discountedAov > s.nonDiscountedAov ? '#22c55e' : '#f59e0b',
                },
                {
                  label: 'Revenue per ₹1 Discounted', value: discountRoi > 0 ? `₹${discountRoi.toFixed(1)}` : '—',
                  sub: 'Discounted revenue ÷ discount given',
                  color: discountRoi >= 10 ? '#22c55e' : discountRoi >= 5 ? '#f59e0b' : '#f43f5e',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color, fontSize: k.label.includes('AOV') ? '16px' : undefined }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Leaderboard table */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">🏆 Code Leaderboard</div>
                  <div className="chart-card-subtitle">{data.codes.length} codes used in this period — click headers to sort</div>
                </div>
              </div>

              {data.codes.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: '13px' }}>
                  No discount codes were used in this period
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Code</th>
                        {([
                          ['orders', 'Orders'],
                          ['revenue', 'Revenue'],
                          ['totalDiscount', 'Discount Given'],
                          ['aov', 'AOV'],
                          ['avgDiscountPct', 'Avg Discount'],
                          ['newCustomerShare', 'New Customers'],
                        ] as [SortKey, string][]).map(([key, label]) => (
                          <th
                            key={key}
                            onClick={() => toggleSort(key)}
                            style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                          >
                            {label}{sortArrow(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCodes.map((c, i) => (
                        <tr key={c.code}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-dim)', marginRight: '8px', fontSize: '11px' }}>{i + 1}</span>
                            <span style={{
                              fontFamily: 'var(--font-mono, monospace)', fontSize: '12px',
                              padding: '2px 8px', borderRadius: '6px',
                              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            }}>{c.code}</span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{c.orders.toLocaleString('en-IN')}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.revenue)}</td>
                          <td className="mono" style={{ textAlign: 'right', color: '#f43f5e' }}>−{fmt(c.totalDiscount)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{fmt(c.aov)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            <span style={{
                              color: c.avgDiscountPct >= 30 ? '#f43f5e' : c.avgDiscountPct >= 15 ? '#f59e0b' : '#22c55e',
                            }}>{c.avgDiscountPct.toFixed(1)}%</span>
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>{c.newCustomerShare.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* How to read */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to read this</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Good code</strong><br />
                  High revenue, low avg discount %, high new-customer share — it acquires customers without giving away margin.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Margin eroder</strong><br />
                  High discount % with mostly returning customers — these people would likely have bought anyway at full price.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>AOV comparison</strong><br />
                  If discounted AOV is below full-price AOV, your codes aren&apos;t encouraging bigger baskets — consider minimum-spend thresholds.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
