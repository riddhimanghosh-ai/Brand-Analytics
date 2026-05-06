import { getBrands } from '@/lib/mongodb-store';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/BrandCard';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  let brands: any[] = [];

  // Fetch brands — redirect() throws a special error that must NOT be caught
  const allBrands = await getBrands().catch((error) => {
    console.error('Error fetching brands:', error);
    return [] as typeof brands;
  });

  brands = allBrands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    shopifyStoreUrl: brand.shopifyStoreUrl,
    ga4PropertyId: brand.ga4PropertyId,
    metaAccessToken: brand.metaAccessToken,
    googleAdsCustomerId: brand.googleAdsCustomerId,
  }));

  // If exactly one brand exists, redirect to it (must be outside try/catch)
  if (brands.length === 1) {
    redirect(`/dashboard/${brands[0].slug}`);
  }

  return (
    <div className="app-layout">
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
              <BrandCard
                key={brand.id}
                id={brand.id}
                name={brand.name}
                slug={brand.slug}
                shopifyStoreUrl={brand.shopifyStoreUrl}
                ga4PropertyId={brand.ga4PropertyId}
                metaAccessToken={brand.metaAccessToken}
                googleAdsCustomerId={brand.googleAdsCustomerId}
              />
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
