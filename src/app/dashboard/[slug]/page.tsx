import { getBrand } from '@/lib/mongodb-store';
import Link from 'next/link';
import { OverviewKPIs } from '@/components/OverviewKPIs';

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

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              {brand.name}
            </h2>
            <p>Overview · Last 30 days · {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Connection Status Chips */}
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
                <span key={key} className={`connection-chip ${connected ? 'connected' : ''}`}>
                  <span className="chip-dot" />
                  {labels[key]}
                </span>
              );
            })}
          </div>
        </div>

        {/* Quick Setup — shown when fewer than 2 platforms are connected */}
        {connectedCount < 2 && (
          <div className="chart-card" style={{ marginBottom: '24px', background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.15)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">⚡ Quick Setup</div>
                <div className="chart-card-subtitle">Connect your platforms to unlock full analytics</div>
              </div>
              <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary btn-sm">
                Set up →
              </Link>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { key: 'shopify', label: 'Shopify', icon: '🛒', on: connections.shopify },
                { key: 'ga4', label: 'Google Analytics', icon: '📈', on: connections.ga4 },
                { key: 'metaAds', label: 'Meta Ads', icon: '📱', on: connections.metaAds },
                { key: 'googleAds', label: 'Google Ads', icon: '🎯', on: connections.googleAds },
                { key: 'gemini', label: 'AI Assistant', icon: '🤖', on: connections.gemini },
              ].map(({ key, label, icon, on }) => (
                <span key={key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: 'var(--radius-full)',
                  background: on ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                  border: `1px solid ${on ? 'rgba(16,185,129,0.2)' : 'var(--glass-border)'}`,
                  fontSize: '12px', fontWeight: 500,
                  color: on ? 'var(--accent-emerald)' : 'var(--text-muted)',
                }}>
                  {icon} {label}
                  {on && <span style={{ fontSize: '10px' }}>✓</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* KPIs — client component, loads after hydration so page shows instantly */}
        <OverviewKPIs slug={slug} connections={connections} />

        {/* Deep-dive Links */}
        <div className="section-title" style={{ marginTop: '24px' }}>
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
      </div>
    </>
  );
}
