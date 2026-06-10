'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency, formatNumber, percentChange, formatPercent } from '@/lib/utils';

interface KPIs {
  totalRevenue: number;
  prevTotalRevenue: number;
  totalOrders: number;
  prevTotalOrders: number;
  averageOrderValue: number;
  prevAverageOrderValue: number;
  totalCustomers: number;
  repeatCustomerRate: number;
  averageItemsPerOrder: number;
  newCustomerRevenue: number;
  returningCustomerRevenue: number;
  topSellingProduct: string;
  refundRate: number;
}

interface Props {
  slug: string;
  connections: {
    shopify: boolean;
    ga4: boolean;
    metaAds: boolean;
    googleAds: boolean;
    gemini?: boolean;
    ai?: boolean;
  };
}

function KpiSkeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div className="kpi-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="kpi-card" style={{ minHeight: '110px' }}>
            <div style={{ height: '12px', width: '80px', borderRadius: '4px', background: 'var(--bg-hover)', marginBottom: '12px' }} />
            <div style={{ height: '32px', width: '110px', borderRadius: '6px', background: 'var(--bg-hover)', marginBottom: '10px' }} />
            <div style={{ height: '10px', width: '60px', borderRadius: '4px', background: 'var(--bg-hover)' }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </div>
  );
}

export function OverviewKPIs({ slug, connections }: Props) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(connections.shopify);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [metaSpend, setMetaSpend] = useState<number | null>(null);

  const fetchKPIs = (bustCache = false) => {
    if (!connections.shopify) return;
    const url = bustCache
      ? `/api/shopify?action=kpis&slug=${slug}&range=30d&_ts=${Date.now()}`
      : `/api/shopify?action=kpis&slug=${slug}&range=30d`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setKpis(data);
      })
      .catch(() => setError('Failed to load Shopify data'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Invalidate cache first, then re-fetch
    await fetch(`/api/shopify?action=refresh&slug=${slug}`).catch(() => {});
    fetchKPIs(true);
  };

  useEffect(() => {
    fetchKPIs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, connections.shopify]);

  useEffect(() => {
    if (!connections.metaAds) return;
    fetch(`/api/ads?slug=${slug}&platform=meta&action=kpis&range=30d`)
      .then(r => r.json())
      .then(data => { if (!data.error && data.spend != null) setMetaSpend(data.spend); })
      .catch(() => {});
  }, [slug, connections.metaAds]);

  if (!connections.shopify) {
    return (
      <div className="connection-required" style={{ borderColor: 'rgba(149,196,105,0.2)', background: 'rgba(149,196,105,0.03)' }}>
        <div className="cr-icon" style={{ fontSize: '52px' }}>🛒</div>
        <h3 style={{ color: '#96c46a' }}>Connect Shopify to Get Started</h3>
        <p>Unlock revenue analytics, order trends, top products, customer insights, and CRO opportunities — all in one place.</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #96c46a, #5a9e2f)', boxShadow: '0 0 20px rgba(149,196,105,0.2)' }}>
          Connect Shopify →
        </Link>
      </div>
    );
  }

  if (loading) return <KpiSkeleton />;

  if (error) {
    return (
      <div className="connection-required">
        <div className="cr-icon">⚠️</div>
        <h3>Shopify Connection Error</h3>
        <p>{error}</p>
        <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">Check Connection Settings</Link>
      </div>
    );
  }

  if (!kpis) return null;

  const revenueChange = percentChange(kpis.totalRevenue, kpis.prevTotalRevenue);
  const ordersChange = percentChange(kpis.totalOrders, kpis.prevTotalOrders);
  const aovChange = percentChange(kpis.averageOrderValue, kpis.prevAverageOrderValue);

  // Build insight alert chips (max 3)
  const alerts: { text: string; href: string; type: 'warn' | 'info' }[] = [];
  if (kpis.repeatCustomerRate < 20) {
    alerts.push({
      text: `⚠️ Repeat rate ${kpis.repeatCustomerRate.toFixed(1)}% — below 20% benchmark`,
      href: `/dashboard/${slug}/cro`,
      type: 'warn',
    });
  }
  if (kpis.averageOrderValue < 600) {
    const threshold = Math.round(kpis.averageOrderValue * 1.3);
    alerts.push({
      text: `💡 AOV ₹${Math.round(kpis.averageOrderValue)} — add free shipping threshold at ₹${threshold}`,
      href: `/dashboard/${slug}/cro`,
      type: 'info',
    });
  }
  if (kpis.refundRate > 5) {
    alerts.push({
      text: `🔴 Refund rate ${kpis.refundRate.toFixed(1)}% — investigate product quality`,
      href: `/dashboard/${slug}/shopify`,
      type: 'warn',
    });
  }
  if (alerts.length < 3 && kpis.averageItemsPerOrder < 1.5) {
    alerts.push({
      text: `📦 ${kpis.averageItemsPerOrder.toFixed(1)} items/order — add bundles to lift AOV`,
      href: `/dashboard/${slug}/cro`,
      type: 'info',
    });
  }
  const visibleAlerts = alerts.slice(0, 3);

  return (
    <>
      {/* Today at a Glance alert strip */}
      {visibleAlerts.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {visibleAlerts.map(a => (
            <Link key={a.text} href={a.href} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
              background: a.type === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.08)',
              border: `1px solid ${a.type === 'warn' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.15)'}`,
              color: a.type === 'warn' ? '#f59e0b' : 'var(--text-secondary)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {a.text}
            </Link>
          ))}
        </div>
      )}

      <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="section-icon">💰</span>
          Revenue &amp; Sales
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh data"
          style={{
            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
            border: '1px solid var(--glass-border)', background: 'transparent',
            color: refreshing ? 'var(--text-dim)' : 'var(--text-secondary)',
            cursor: refreshing ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
            letterSpacing: '0.03em',
          }}
        >
          {refreshing ? '⟳ Refreshing…' : '⟳ Refresh'}
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value">{formatCurrency(kpis.totalRevenue)}</div>
          <div className={`kpi-change ${revenueChange >= 0 ? 'positive' : 'negative'}`}>
            {revenueChange >= 0 ? '↑' : '↓'} {formatPercent(revenueChange)}
          </div>
          <div className="kpi-subtext">vs previous 30 days</div>
        </div>

        <div className="kpi-card violet">
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{formatNumber(kpis.totalOrders)}</div>
          <div className={`kpi-change ${ordersChange >= 0 ? 'positive' : 'negative'}`}>
            {ordersChange >= 0 ? '↑' : '↓'} {formatPercent(ordersChange)}
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-label">Average Order Value</div>
          <div className="kpi-value">{formatCurrency(kpis.averageOrderValue)}</div>
          <div className={`kpi-change ${aovChange >= 0 ? 'positive' : 'negative'}`}>
            {aovChange >= 0 ? '↑' : '↓'} {formatPercent(aovChange)}
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-icon">👥</div>
          <div className="kpi-label">Unique Customers</div>
          <div className="kpi-value">{formatNumber(kpis.totalCustomers)}</div>
        </div>

        <div className="kpi-card cyan">
          <div className="kpi-icon">🔄</div>
          <div className="kpi-label">Repeat Customer Rate</div>
          <div className="kpi-value">{kpis.repeatCustomerRate.toFixed(1)}%</div>
          <div className="kpi-subtext">CRO Key Metric</div>
        </div>

        <div className="kpi-card rose">
          <div className="kpi-icon">📊</div>
          <div className="kpi-label">Avg Items / Order</div>
          <div className="kpi-value">{kpis.averageItemsPerOrder.toFixed(1)}</div>
          <div className="kpi-subtext">Bundle opportunity</div>
        </div>
      </div>

      {/* MER / Profitability Quick Card */}
      {(connections.metaAds || connections.googleAds) && kpis && (
        <div style={{ marginTop: '20px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '24px' }}>💰</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>Marketing Efficiency Ratio (Last 30 days)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {metaSpend != null && metaSpend > 0
                ? <>MER: <strong style={{ color: (kpis.totalRevenue / metaSpend) >= 3 ? '#22c55e' : (kpis.totalRevenue / metaSpend) >= 1.5 ? '#f59e0b' : '#f43f5e' }}>{(kpis.totalRevenue / metaSpend).toFixed(2)}x</strong> — {formatCurrency(kpis.totalRevenue)} revenue ÷ {formatCurrency(metaSpend)} ad spend</>
                : 'Connect Meta Ads to calculate your true blended ROAS'}
            </div>
          </div>
          <Link href={`/dashboard/${slug}/profit`} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontSize: '12px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View P&amp;L →
          </Link>
        </div>
      )}

      {/* CRO Insights */}
      <div className="section-title" style={{ marginTop: '32px' }}>
        <span className="section-icon">🎯</span>
        CRO Insights
      </div>

      <div className="overview-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue Split</div>
              <div className="chart-card-subtitle">New vs Returning customers</div>
            </div>
          </div>
          {(() => {
            const newPct = kpis.totalRevenue > 0 ? (kpis.newCustomerRevenue / kpis.totalRevenue) * 100 : 0;
            const retPct = kpis.totalRevenue > 0 ? (kpis.returningCustomerRevenue / kpis.totalRevenue) * 100 : 0;
            return (
              <div style={{ marginTop: '4px' }}>
                {/* Stacked split bar */}
                <div style={{ display: 'flex', height: '26px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{
                    width: `${Math.max(2, newPct)}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#fff', minWidth: '40px',
                  }}>
                    {newPct.toFixed(0)}%
                  </div>
                  <div style={{
                    width: `${Math.max(2, retPct)}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#fff', minWidth: '40px',
                  }}>
                    {retPct.toFixed(0)}%
                  </div>
                </div>

                {/* Legend rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { dot: '#3b82f6', label: 'New customers', value: formatCurrency(kpis.newCustomerRevenue), sub: `${newPct.toFixed(0)}% of revenue` },
                    { dot: '#22c55e', label: 'Returning customers', value: formatCurrency(kpis.returningCustomerRevenue), sub: `${retPct.toFixed(0)}% of revenue` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: r.dot, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{r.label}</span>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>{r.value}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', width: '92px', textAlign: 'right' }}>{r.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Divider stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--rule)' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '3px' }}>🏆 Top Product</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpis.topSellingProduct}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '3px' }}>↩️ Refund Rate</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: kpis.refundRate > 5 ? '#f43f5e' : '#22c55e' }}>
                      {kpis.refundRate.toFixed(1)}%
                      <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-dim)' }}> {kpis.refundRate > 5 ? '— investigate' : '— healthy'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">CRO Opportunities</div>
              <div className="chart-card-subtitle">Automatic recommendations</div>
            </div>
          </div>
          <div className="insights-list">
            {kpis.repeatCustomerRate < 20 && (
              <Link href={`/dashboard/${slug}/replenishment`} className="insight-item insight-link">
                <span className="insight-icon" style={{ background: 'rgba(244,63,94,0.12)' }}>📧</span>
                <div style={{ flex: 1 }}>
                  <strong>Low repeat rate ({kpis.repeatCustomerRate.toFixed(0)}%). </strong>Set up post-purchase &amp; winback flows — the Replenishment Clock has the exact send timing.
                </div>
                <span className="insight-arrow">→</span>
              </Link>
            )}
            {kpis.averageItemsPerOrder < 2 && (
              <Link href={`/dashboard/${slug}/bundles`} className="insight-item insight-link">
                <span className="insight-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>📦</span>
                <div style={{ flex: 1 }}>
                  <strong>Low items per order ({kpis.averageItemsPerOrder.toFixed(1)}).</strong> The Bundle Builder shows which products customers already pair.
                </div>
                <span className="insight-arrow">→</span>
              </Link>
            )}
            {kpis.averageOrderValue < 500 && (
              <Link href={`/dashboard/${slug}/discounts`} className="insight-item insight-link">
                <span className="insight-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>💸</span>
                <div style={{ flex: 1 }}>
                  <strong>AOV at {formatCurrency(kpis.averageOrderValue)}.</strong> Add a free-shipping threshold and minimum-cart incentives.
                </div>
                <span className="insight-arrow">→</span>
              </Link>
            )}
            {kpis.newCustomerRevenue > kpis.returningCustomerRevenue * 3 && (
              <Link href={`/dashboard/${slug}/segments`} className="insight-item insight-link">
                <span className="insight-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <strong>Over-reliant on new customers.</strong> Export winback segments and start retention flows before they churn.
                </div>
                <span className="insight-arrow">→</span>
              </Link>
            )}
            <Link href={`/dashboard/${slug}/actions`} className="insight-item insight-link">
              <span className="insight-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>⚡</span>
              <div style={{ flex: 1 }}>
                <strong>Action Center</strong> ranks everything that needs a decision today across ads, inventory, and customers.
              </div>
              <span className="insight-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Disconnected platform prompts */}
      {!connections.ga4 && (
        <div className="connection-required" style={{ marginTop: '24px', padding: '32px' }}>
          <div className="cr-icon" style={{ fontSize: '32px' }}>📈</div>
          <h3 style={{ fontSize: '16px' }}>Connect Google Analytics</h3>
          <p style={{ fontSize: '12px' }}>Add GA4 to see traffic sources, session data, and conversion funnels.</p>
          <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary btn-sm">Connect GA4</Link>
        </div>
      )}
      {!connections.metaAds && !connections.googleAds && (
        <div className="connection-required" style={{ marginTop: '16px', padding: '32px' }}>
          <div className="cr-icon" style={{ fontSize: '32px' }}>🎯</div>
          <h3 style={{ fontSize: '16px' }}>Connect Ad Platforms</h3>
          <p style={{ fontSize: '12px' }}>Add Meta Ads or Google Ads to see ROAS, campaign performance, and ad spend analysis.</p>
          <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary btn-sm">Connect Ads</Link>
        </div>
      )}
    </>
  );
}
