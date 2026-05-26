import { getBrands } from '@/lib/mongodb-store';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BrandCard } from '@/components/BrandCard';
import { LogoutButton } from '@/components/LogoutButton';
import { verifySession, filterBrandsForUser, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const cookieStore = await cookies();
  const user = await verifySession(cookieStore.get(COOKIE_NAME)?.value);

  // Not logged in → always send to login page
  if (!user) redirect('/login');

  const allBrands = await getBrands().catch(() => []);
  const visibleBrands = filterBrandsForUser(allBrands, user);

  const brands = visibleBrands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    shopifyStoreUrl: brand.shopifyStoreUrl,
    ga4PropertyId: brand.ga4PropertyId,
    metaAccessToken: brand.metaAccessToken,
    googleAdsCustomerId: brand.googleAdsCustomerId,
  }));

  if (brands.length === 1) {
    redirect(`/dashboard/${brands[0].slug}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--f-display)' }}>
      {/* Top bar */}
      <header style={{ borderBottom: '1px solid var(--rule)', padding: '0 40px', display: 'flex', alignItems: 'center', height: '56px', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>
            BA
          </div>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            Brand Analytics AI
          </span>
        </div>
        {user && <LogoutButton variant="header" />}
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid var(--rule)', paddingBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: '6px' }}>
              Multi-Brand
            </div>
            <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '26px', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
              Your Brands
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
              Select a brand to view its analytics dashboard
            </p>
          </div>
          <Link href="/brands/new" className="btn btn-primary btn-sm">
            + Add Brand
          </Link>
        </div>

        {brands.length === 0 ? (
          <div style={{ border: '1px solid var(--rule)', padding: '64px 24px', textAlign: 'center', background: 'var(--paper-2)' }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted-2)', marginBottom: '12px' }}>
              No brands yet
            </div>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
              Add your first brand to start analysing your e-commerce data.
            </p>
            <Link href="/brands/new" className="btn btn-primary">
              + Add Your First Brand
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
              <span style={{ fontFamily: 'var(--f-display)', fontSize: '22px', fontWeight: 300, color: 'var(--muted-2)' }}>+</span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Add Brand</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
