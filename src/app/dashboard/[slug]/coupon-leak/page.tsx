'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) { return `${n.toFixed(0)}%`; }

interface LeakedCode {
  code: string;
  sites: string[];
  orders: number;
  revenue: number;
  totalDiscount: number;
  newCustomerShare: number;
  aov: number;
}

interface SiteScan {
  site: string;
  codesFound: number;
  error?: string;
}

interface LeakData {
  leaks: LeakedCode[];
  siteScans: SiteScan[];
  scannedAt: string;
  allCodes: { code: string; orders: number }[];
}

export default function CouponLeakPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<LeakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/coupon-leak?slug=${slug}&range=${from && to ? `${from}:${to}` : '30d'}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const VERDICT_COLORS: Record<string, string> = {
    high: '#f43f5e',
    medium: '#f59e0b',
    safe: '#22c55e',
  };

  function riskLevel(leak: LeakedCode): { label: string; color: string } {
    if (leak.newCustomerShare > 70 && leak.orders > 20) return { label: 'High Risk', color: VERDICT_COLORS.high };
    if (leak.orders > 10) return { label: 'Medium', color: VERDICT_COLORS.medium };
    return { label: 'Low', color: VERDICT_COLORS.safe };
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>🕵️ Coupon Leak Detector</h2>
            <p>Finds your discount codes on public aggregator sites before your margin does</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={load}
              disabled={loading}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              {loading ? 'Scanning…' : '↻ Re-scan now'}
            </button>
            <DateRangeDropdown />
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="chart-card">
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>Scanning GrabOn, CouponDunia, CouponMoto, Savyour, CupoNation…</div>
            {[80, 65, 55, 70, 45].map((w, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, height: '28px', marginBottom: '8px' }} />
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
            {/* Site scan status */}
            <div className="chart-card" style={{ marginBottom: '20px' }}>
              <div className="chart-card-title" style={{ marginBottom: '10px' }}>📡 Sites Scanned</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.siteScans.map(s => (
                  <div key={s.site} style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                    background: s.error ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                    border: `1px solid ${s.error ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    color: s.error ? '#f59e0b' : '#22c55e',
                  }}>
                    {s.site} {s.error ? '⚠️' : `· ${s.codesFound} codes`}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>
                Last scanned {data.scannedAt ? new Date(data.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                {' · '}{data.allCodes.length} active discount codes checked
              </div>
            </div>

            {/* Leaked codes */}
            {data.leaks.length === 0 ? (
              <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>No leaked codes found</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  None of your active Shopify discount codes appeared on the scanned coupon sites.
                </div>
              </div>
            ) : (
              <div className="chart-card">
                <div className="chart-card-header" style={{ marginBottom: '16px' }}>
                  <div>
                    <div className="chart-card-title">⚠️ {data.leaks.length} Leaked Code{data.leaks.length > 1 ? 's' : ''} Found</div>
                    <div className="chart-card-subtitle">These codes are publicly listed — deal hunters may be using them instead of paying full price</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.leaks.map(leak => {
                    const risk = riskLevel(leak);
                    return (
                      <div key={leak.code} style={{
                        padding: '16px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <code style={{
                              fontSize: '16px', fontWeight: 800, letterSpacing: '0.08em',
                              background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                              padding: '4px 10px', borderRadius: '6px', fontFamily: 'var(--f-mono)',
                            }}>{leak.code}</code>
                            <span style={{
                              fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px',
                              background: `${risk.color}15`, border: `1px solid ${risk.color}40`, color: risk.color,
                            }}>{risk.label}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {leak.sites.map(s => (
                              <span key={s} style={{
                                fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px',
                                background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
                              }}>{s}</span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                          {[
                            { label: 'Orders', value: String(leak.orders) },
                            { label: 'Revenue', value: fmt(leak.revenue) },
                            { label: 'Discount Given', value: fmt(leak.totalDiscount) },
                            { label: 'New Cust. Share', value: pct(leak.newCustomerShare), highlight: leak.newCustomerShare > 70 },
                          ].map(k => (
                            <div key={k.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: k.highlight ? '#f59e0b' : 'var(--text-primary)' }}>{k.value}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{k.label}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(244,63,94,0.04)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          💡 <strong>Action:</strong> Rotate this code or set a lower usage cap. High new-customer share + coupon site listing = deal hunters driving up acquisition cost.
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What to do */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 How to handle a leaked code</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Rotate the code</strong><br />
                  Disable the leaked code in Shopify &rarr; create a new one and share only with your intended audience (email list, influencer). Re-scan after 24h to confirm it&apos;s not re-listed.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Cap usage</strong><br />
                  In Shopify discount settings, set &ldquo;Limit to one use per customer&rdquo; and a total usage cap. Coupon aggregators can&apos;t provide per-customer codes, so caps break the deal-hunter funnel.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Use unique codes</strong><br />
                  For influencers, generate a unique code per person (e.g. INFLUENCER_NAME20). That way leaks are traceable and you can deactivate one partner&apos;s code without killing all codes.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
