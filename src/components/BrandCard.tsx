'use client';

import Link from 'next/link';

interface BrandCardProps {
  id: string;
  name: string;
  slug: string;
  shopifyStoreUrl?: string | null;
  ga4PropertyId?: string | null;
  metaAccessToken?: string | null;
  googleAdsCustomerId?: string | null;
}

export function BrandCard({
  id,
  name,
  slug,
  shopifyStoreUrl,
  ga4PropertyId,
  metaAccessToken,
  googleAdsCustomerId,
}: BrandCardProps) {
  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--accent-blue)';
        el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.1)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--border-color)';
        el.style.boxShadow = 'none';
      }}
    >
      <Link
          href={`/dashboard/${slug}`}
          style={{
            display: 'block',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div className="brand-card-header">
            <div className="brand-avatar">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{name}</h3>
              {shopifyStoreUrl && (
                <div className="brand-url">{shopifyStoreUrl}</div>
              )}
            </div>
          </div>
          <div className="brand-connections">
            <div className="connection-dot">
              <span className={`dot ${shopifyStoreUrl ? 'connected' : 'disconnected'}`} />
              Shopify
            </div>
            <div className="connection-dot">
              <span className={`dot ${ga4PropertyId ? 'connected' : 'disconnected'}`} />
              GA4
            </div>
            <div className="connection-dot">
              <span className={`dot ${metaAccessToken ? 'connected' : 'disconnected'}`} />
              Meta Ads
            </div>
            <div className="connection-dot">
              <span className={`dot ${googleAdsCustomerId ? 'connected' : 'disconnected'}`} />
              Google Ads
            </div>
          </div>
        </Link>
    </div>
  );
}
