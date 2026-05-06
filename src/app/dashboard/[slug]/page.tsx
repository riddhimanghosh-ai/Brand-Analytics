import { getBrand } from '@/lib/mongodb-store';
import { formatCurrency, formatNumber, percentChange, formatPercent } from '@/lib/utils';
import * as shopifyService from '@/lib/services/shopify';
import Link from 'next/link';

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) return null;

  const connections = {
    shopify: !!(brand.shopifyStoreUrl && brand.shopifyAccessToken),
    ga4: !!brand.ga4PropertyId,
    metaAds: !!brand.metaAccessToken,
    googleAds: !!brand.googleAdsCustomerId,
    gemini: !!(brand.geminiApiKey || process.env.GEMINI_API_KEY),
  };

  const connectedCount = Object.values(connections).filter(Boolean).length;

  // Fetch Shopify KPIs if connected
  let shopifyKPIs = null;
  let shopifyError = null;
  if (connections.shopify) {
    try {
      shopifyKPIs = await shopifyService.getKPIs(
        { storeUrl: brand.shopifyStoreUrl!, accessToken: brand.shopifyAccessToken! },
        '30d'
      );
    } catch (e) {
      shopifyError = (e as Error).message;
    }
  }

  const revenueChange = shopifyKPIs
    ? percentChange(shopifyKPIs.totalRevenue, shopifyKPIs.prevTotalRevenue)
    : 0;
  const ordersChange = shopifyKPIs
    ? percentChange(shopifyKPIs.totalOrders, shopifyKPIs.prevTotalOrders)
    : 0;
  const aovChange = shopifyKPIs
    ? percentChange(shopifyKPIs.averageOrderValue, shopifyKPIs.prevAverageOrderValue)
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>📊 {brand.name} — Overview</h2>
            <p>Last 30 days • {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Connection Status */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(connections).map(([key, connected]) => {
              const labels: Record<string, string> = {
                shopify: '🛒 Shopify',
                ga4: '📈 Google Analytics',
                metaAds: '📱 Meta Ads',
                googleAds: '🎯 Google Ads',
                gemini: '🤖 AI Assistant',
              };
              return (
                <div key={key} className="connection-dot" style={{ padding: '6px 14px' }}>
                  <span className={`dot ${connected ? 'connected' : 'disconnected'}`} />
                  {labels[key]}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shopify KPIs */}
        {shopifyKPIs ? (
          <>
            <div className="section-title">
              <span className="section-icon">💰</span>
              Revenue & Sales
            </div>

            <div className="kpi-grid">
              <div className="kpi-card blue">
                <div className="kpi-icon">💰</div>
                <div className="kpi-label">Total Revenue</div>
                <div className="kpi-value">{formatCurrency(shopifyKPIs.totalRevenue)}</div>
                <div className={`kpi-change ${revenueChange >= 0 ? 'positive' : 'negative'}`}>
                  {revenueChange >= 0 ? '↑' : '↓'} {formatPercent(revenueChange)}
                </div>
                <div className="kpi-subtext">vs previous 30 days</div>
              </div>

              <div className="kpi-card violet">
                <div className="kpi-icon">📦</div>
                <div className="kpi-label">Total Orders</div>
                <div className="kpi-value">{formatNumber(shopifyKPIs.totalOrders)}</div>
                <div className={`kpi-change ${ordersChange >= 0 ? 'positive' : 'negative'}`}>
                  {ordersChange >= 0 ? '↑' : '↓'} {formatPercent(ordersChange)}
                </div>
              </div>

              <div className="kpi-card emerald">
                <div className="kpi-icon">🛒</div>
                <div className="kpi-label">Average Order Value</div>
                <div className="kpi-value">{formatCurrency(shopifyKPIs.averageOrderValue)}</div>
                <div className={`kpi-change ${aovChange >= 0 ? 'positive' : 'negative'}`}>
                  {aovChange >= 0 ? '↑' : '↓'} {formatPercent(aovChange)}
                </div>
              </div>

              <div className="kpi-card amber">
                <div className="kpi-icon">👥</div>
                <div className="kpi-label">Unique Customers</div>
                <div className="kpi-value">{formatNumber(shopifyKPIs.totalCustomers)}</div>
              </div>

              <div className="kpi-card cyan">
                <div className="kpi-icon">🔄</div>
                <div className="kpi-label">Repeat Customer Rate</div>
                <div className="kpi-value">{shopifyKPIs.repeatCustomerRate.toFixed(1)}%</div>
                <div className="kpi-subtext">CRO Key Metric</div>
              </div>

              <div className="kpi-card rose">
                <div className="kpi-icon">📊</div>
                <div className="kpi-label">Avg Items / Order</div>
                <div className="kpi-value">{shopifyKPIs.averageItemsPerOrder.toFixed(1)}</div>
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
                      <strong>New Customer Revenue:</strong> {formatCurrency(shopifyKPIs.newCustomerRevenue)}
                      <span className="text-muted text-sm"> ({shopifyKPIs.totalRevenue > 0 ? ((shopifyKPIs.newCustomerRevenue / shopifyKPIs.totalRevenue) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">🔄</span>
                    <div>
                      <strong>Returning Revenue:</strong> {formatCurrency(shopifyKPIs.returningCustomerRevenue)}
                      <span className="text-muted text-sm"> ({shopifyKPIs.totalRevenue > 0 ? ((shopifyKPIs.returningCustomerRevenue / shopifyKPIs.totalRevenue) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">🏆</span>
                    <div>
                      <strong>Top Product:</strong> {shopifyKPIs.topSellingProduct}
                    </div>
                  </div>
                  {shopifyKPIs.refundRate > 0 && (
                    <div className="insight-item">
                      <span className="insight-icon">⚠️</span>
                      <div>
                        <strong>Refund Rate:</strong> {shopifyKPIs.refundRate.toFixed(1)}%
                        {shopifyKPIs.refundRate > 5 && <span style={{ color: 'var(--accent-rose)' }}> — High! Investigate product quality or descriptions</span>}
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
                  {shopifyKPIs.repeatCustomerRate < 20 && (
                    <div className="insight-item">
                      <span className="insight-icon">📧</span>
                      <div>Low repeat rate ({shopifyKPIs.repeatCustomerRate.toFixed(0)}%). Set up email flows for post-purchase & win-back campaigns.</div>
                    </div>
                  )}
                  {shopifyKPIs.averageItemsPerOrder < 2 && (
                    <div className="insight-item">
                      <span className="insight-icon">📦</span>
                      <div>Low items per order ({shopifyKPIs.averageItemsPerOrder.toFixed(1)}). Add product bundles, cross-sells, and volume discounts.</div>
                    </div>
                  )}
                  {shopifyKPIs.averageOrderValue < 500 && (
                    <div className="insight-item">
                      <span className="insight-icon">💸</span>
                      <div>AOV at {formatCurrency(shopifyKPIs.averageOrderValue)}. Add free shipping threshold, upsells, and minimum cart incentives.</div>
                    </div>
                  )}
                  {shopifyKPIs.newCustomerRevenue > shopifyKPIs.returningCustomerRevenue * 3 && (
                    <div className="insight-item">
                      <span className="insight-icon">🎯</span>
                      <div>Over-reliant on new customers. Focus on retention: loyalty programs, subscriptions, and personalized emails.</div>
                    </div>
                  )}
                  <div className="insight-item">
                    <span className="insight-icon">✨</span>
                    <div>Use the <strong>AI Consultant</strong> (bottom-right ✨) for more personalized CRO strategies.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deep-dive Links */}
            <div className="section-title" style={{ marginTop: '16px' }}>
              <span className="section-icon">🔗</span>
              Deep Dive
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {connections.shopify && (
                <Link href={`/dashboard/${slug}/shopify`} className="btn btn-secondary">
                  🛒 Shopify Analytics →
                </Link>
              )}
              {connections.ga4 && (
                <Link href={`/dashboard/${slug}/analytics`} className="btn btn-secondary">
                  📈 Traffic Analytics →
                </Link>
              )}
              {(connections.metaAds || connections.googleAds) && (
                <Link href={`/dashboard/${slug}/ads`} className="btn btn-secondary">
                  🎯 Ads Performance →
                </Link>
              )}
              <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary">
                ⚙️ Manage Connections →
              </Link>
            </div>
          </>
        ) : shopifyError ? (
          <div className="connection-required">
            <div className="cr-icon">⚠️</div>
            <h3>Shopify Connection Error</h3>
            <p>{shopifyError}</p>
            <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">
              Check Connection Settings
            </Link>
          </div>
        ) : (
          <div className="connection-required">
            <div className="cr-icon">🔌</div>
            <h3>Connect Your Platforms</h3>
            <p>Connect Shopify, Google Analytics, or ad platforms to start seeing your analytics here.</p>
            <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">
              ⚙️ Set Up Connections
            </Link>
          </div>
        )}

        {/* Disconnected platform prompts */}
        {!connections.ga4 && shopifyKPIs && (
          <div className="connection-required" style={{ marginTop: '24px', padding: '32px' }}>
            <div className="cr-icon" style={{ fontSize: '32px' }}>📈</div>
            <h3 style={{ fontSize: '16px' }}>Connect Google Analytics</h3>
            <p style={{ fontSize: '12px' }}>Add GA4 to see traffic sources, session data, and conversion funnels.</p>
            <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary btn-sm">
              Connect GA4
            </Link>
          </div>
        )}

        {!connections.metaAds && !connections.googleAds && shopifyKPIs && (
          <div className="connection-required" style={{ marginTop: '16px', padding: '32px' }}>
            <div className="cr-icon" style={{ fontSize: '32px' }}>🎯</div>
            <h3 style={{ fontSize: '16px' }}>Connect Ad Platforms</h3>
            <p style={{ fontSize: '12px' }}>Add Meta Ads or Google Ads to see ROAS, campaign performance, and ad spend analysis.</p>
            <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary btn-sm">
              Connect Ads
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
