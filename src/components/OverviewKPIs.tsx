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
    gemini: boolean;
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

  return (
    <>
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
