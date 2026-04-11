import { prisma } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Force dynamic rendering to avoid database errors during build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  let brands: any[] = [];

  try {
    brands = await prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        shopifyStoreUrl: true,
        ga4PropertyId: true,
        metaAccessToken: true,
        googleAdsCustomerId: true,
        geminiApiKey: true,
      },
    });

    // If exactly one brand exists, redirect to it
    if (brands.length === 1) {
      redirect(`/dashboard/${brands[0].slug}`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    // Continue to render the page even if DB is unavailable
  }

  return (
    <div className="app-layout">
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div className="logo-icon" style={{
              width: '44px', height: '44px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '12px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px', fontWeight: '700',
              color: 'white', boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)'
            }}>B</div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>Brand Analytics</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Multi-Platform E-Commerce Analytics & CRO Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Brand Grid */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Your Brands</h2>
          <Link href="/brands/new" className="btn btn-primary">
            <span>+</span> Add Brand
          </Link>
        </div>

        {brands.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No brands yet</h3>
            <p>Add your first brand to start analyzing your e-commerce data</p>
            <Link href="/brands/new" className="btn btn-primary">
              <span>+</span> Add Your First Brand
            </Link>
          </div>
        ) : (
          <div className="brands-grid">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/dashboard/${brand.slug}`}
                className="brand-card"
              >
                <div className="brand-card-header">
                  <div className="brand-avatar">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{brand.name}</h3>
                    {brand.shopifyStoreUrl && (
                      <div className="brand-url">{brand.shopifyStoreUrl}</div>
                    )}
                  </div>
                </div>
                <div className="brand-connections">
                  <div className="connection-dot">
                    <span className={`dot ${brand.shopifyStoreUrl ? 'connected' : 'disconnected'}`} />
                    Shopify
                  </div>
                  <div className="connection-dot">
                    <span className={`dot ${brand.ga4PropertyId ? 'connected' : 'disconnected'}`} />
                    GA4
                  </div>
                  <div className="connection-dot">
                    <span className={`dot ${brand.metaAccessToken ? 'connected' : 'disconnected'}`} />
                    Meta Ads
                  </div>
                  <div className="connection-dot">
                    <span className={`dot ${brand.googleAdsCustomerId ? 'connected' : 'disconnected'}`} />
                    Google Ads
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/brands/new" className="add-brand-card">
              <div className="add-icon">+</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>Add Another Brand</div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
