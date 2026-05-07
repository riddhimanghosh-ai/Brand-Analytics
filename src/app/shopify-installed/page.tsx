'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ShopifyInstalledContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shop = searchParams.get('shop');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shop) {
      router.push('/');
    }
  }, [shop, router]);

  if (!shop) return null;

  const handleCopyStep = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (

    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      {/* Success icon */}
      <div style={{ fontSize: '72px', marginBottom: '24px' }}>✅</div>

      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px' }}>
        App Installed!
      </h1>

      <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Your Brand Analytics app has been successfully installed on <br />
        <code style={{ background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
          {shop}
        </code>
      </p>

      {/* Steps */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>
          ✓ NEXT: Copy your access token
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
          <span style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            1
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
              Go to your Shopify Partner Dashboard
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Open <a href="https://partners.shopify.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>partners.shopify.com</a>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
          <span style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            2
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
              Go to your app → Configuration
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Click "Brand Analytics" → Configuration tab
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
          <span style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            3
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
              Copy Admin API access token
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Under "Admin API credentials" → copy the token (starts with <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px' }}>shpat_</code>)
            </div>
            <button
              onClick={handleCopyStep}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                background: 'var(--accent-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Example Token Format'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            4
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
              Return to your dashboard
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Paste the token in Settings → Shopify → "Admin API Access Token"
            </div>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: 'var(--accent-blue)',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '8px', padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>💡 Tip</div>
        No manual steps needed - the app is now connected to your dashboard.
      </div>
    </div>
  );
}

export default function ShopifyInstalledPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 24px', textAlign: 'center' }}>Loading...</div>}>
      <ShopifyInstalledContent />
    </Suspense>
  );
}
