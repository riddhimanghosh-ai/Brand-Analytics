import { getBrand } from '@/lib/mongodb-store';
import Link from 'next/link';
import { OverviewKPIs } from '@/components/OverviewKPIs';

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const isDemoMode = slug === 'demo';
  const brand = isDemoMode ? { name: 'Demo Store', slug: 'demo' } : await getBrand(slug);

  if (!brand) return null;

  const connections = isDemoMode
    ? { shopify: true, ga4: true, metaAds: true, googleAds: true, ai: true }
    : {
        shopify: !!(( brand as Record<string,unknown>).shopifyStoreUrl && (brand as Record<string,unknown>).shopifyAccessToken),
        ga4: !!(brand as Record<string,unknown>).ga4PropertyId,
        metaAds: !!(brand as Record<string,unknown>).metaAccessToken,
        googleAds: !!(brand as Record<string,unknown>).googleAdsCustomerId,
        ai: !!(process.env.ANTHROPIC_API_KEY),
      };

  const connectedCount = Object.values(connections).filter(Boolean).length;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>{brand.name}</h2>
            <p>Overview — last 30 days — {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Connection Status */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {Object.entries(connections).map(([key, connected]) => {
            const labels: Record<string, string> = {
              shopify:    'Shopify',
              ga4:        'Google Analytics',
              metaAds:    'Meta Ads',
              googleAds:  'Google Ads',
              ai:         'AI',
            };
            return (
              <span key={key} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                border: `1px solid ${connected ? 'var(--ok)' : 'var(--rule)'}`,
                fontFamily: 'var(--f-mono)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: connected ? 'var(--ok)' : 'var(--muted-2)',
                background: connected ? 'rgba(10,124,83,0.06)' : 'var(--paper-3)',
              }}>
                <span style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: connected ? 'var(--ok)' : 'var(--muted-2)',
                  flexShrink: 0,
                }} />
                {labels[key]}
              </span>
            );
          })}
        </div>

        {/* Quick Setup — shown when fewer than 2 platforms are connected */}
        {connectedCount < 2 && (
          <div className="chart-card" style={{ marginBottom: '24px', borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Quick Setup</div>
                <div className="chart-card-subtitle">Connect your platforms to unlock full analytics</div>
              </div>
              <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary btn-sm">
                Set up
              </Link>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: 'shopify',   label: 'Shopify',            on: connections.shopify },
                { key: 'ga4',       label: 'Google Analytics',   on: connections.ga4 },
                { key: 'metaAds',   label: 'Meta Ads',           on: connections.metaAds },
                { key: 'googleAds', label: 'Google Ads',         on: connections.googleAds },
                { key: 'ai',        label: 'AI Assistant',       on: connections.ai },
              ].map(({ key, label, on }) => (
                <span key={key} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  background: on ? 'rgba(10,124,83,0.08)' : 'var(--paper)',
                  border: `1px solid ${on ? 'var(--ok)' : 'var(--rule)'}`,
                  fontFamily: 'var(--f-mono)',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: on ? 'var(--ok)' : 'var(--muted)',
                }}>
                  {label}
                  {on && <span style={{ color: 'var(--ok)' }}>✓</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <OverviewKPIs slug={slug} connections={connections} />

        {/* Deep-dive Links */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--rule)' }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '12px' }}>
            Deep Dive
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {connections.shopify && (
              <Link href={`/dashboard/${slug}/shopify`} className="btn btn-secondary btn-sm">
                Shopify Analytics
              </Link>
            )}
            {connections.ga4 && (
              <Link href={`/dashboard/${slug}/analytics`} className="btn btn-secondary btn-sm">
                Traffic Analytics
              </Link>
            )}
            {(connections.metaAds || connections.googleAds) && (
              <Link href={`/dashboard/${slug}/ads`} className="btn btn-secondary btn-sm">
                Ads Performance
              </Link>
            )}
            <Link href={`/dashboard/${slug}/settings`} className="btn btn-secondary btn-sm">
              Manage Connections
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
