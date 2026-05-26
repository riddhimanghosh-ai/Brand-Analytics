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
  const [error, setError] = useState('');
  const [metaSpend, setMetaSpend] = useState<number | null>(null);

  useEffect(() => {
    if (!connections.shopify) return;
    fetch(`/api/shopify?action=kpis&slug=${slug}&range=30d`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setKpis(data);
      })
      .catch(() => setError('Failed to load Shopify data'))
      .finally(() => setLoading(false));
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

      <div className="section-title">
        <span className="section-icon">💰</span>
        Revenue &amp; Sales
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
          <div className="insights-list">
            <div className="insight-item">
              <span className="insight-icon">🆕</span>
              <div>
                <strong>New Customer Revenue:</strong> {formatCurrency(kpis.newCustomerRevenue)}
                <span className="text-muted text-sm"> ({kpis.totalRevenue > 0 ? ((kpis.newCustomerRevenue / kpis.totalRevenue) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">🔄</span>
              <div>
                <strong>Returning Revenue:</strong> {formatCurrency(kpis.returningCustomerRevenue)}
                <span className="text-muted text-sm"> ({kpis.totalRevenue > 0 ? ((kpis.returningCustomerRevenue / kpis.totalRevenue) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">🏆</span>
              <div><strong>Top Product:</strong> {kpis.topSellingProduct}</div>
            </div>
            {kpis.refundRate > 0 && (
              <div className="insight-item">
                <span className="insight-icon">⚠️</span>
                <div>
                  <strong>Refund Rate:</strong> {kpis.refundRate.toFixed(1)}%
                  {kpis.refundRate > 5 && <span style={{ color: 'var(--accent-rose)' }}> — High! Investigate product quality</span>}
                </div>
              </div>
            )}
          </div>
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
              <div className="insight-item">
                <span className="insight-icon">📧</span>
                <div>Low repeat rate ({kpis.repeatCustomerRate.toFixed(0)}%). Set up email flows for post-purchase &amp; win-back campaigns.</div>
              </div>
            )}
            {kpis.averageItemsPerOrder < 2 && (
              <div className="insight-item">
                <span className="insight-icon">📦</span>
                <div>Low items per order ({kpis.averageItemsPerOrder.toFixed(1)}). Add product bundles, cross-sells, and volume discounts.</div>
              </div>
            )}
            {kpis.averageOrderValue < 500 && (
              <div className="insight-item">
                <span className="insight-icon">💸</span>
                <div>AOV at {formatCurrency(kpis.averageOrderValue)}. Add free shipping threshold, upsells, and minimum cart incentives.</div>
              </div>
            )}
            {kpis.newCustomerRevenue > kpis.returningCustomerRevenue * 3 && (
              <div className="insight-item">
                <span className="insight-icon">🎯</span>
                <div>Over-reliant on new customers. Focus on retention: loyalty programs, subscriptions, and personalized emails.</div>
              </div>
            )}
            <div className="insight-item">
              <span className="insight-icon">✨</span>
              <div>Use the <strong>AI Consultant</strong> for more personalized CRO strategies.</div>
            </div>
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
