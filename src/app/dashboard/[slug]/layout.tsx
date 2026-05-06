import { getBrand, getBrands } from '@/lib/mongodb-store';
import { redirect } from 'next/navigation';
import { ChatPanel } from '@/components/ChatPanel';
import { NavLink } from '@/components/NavLink';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) {
    redirect('/');
  }

  const allBrandsData = await getBrands();
  const allBrands = allBrandsData.map((b) => ({ name: b.name, slug: b.slug }));

  const connections = {
    shopify: !!(brand.shopifyStoreUrl && brand.shopifyAccessToken),
    ga4: !!brand.ga4PropertyId,
    metaAds: !!brand.metaAccessToken,
    googleAds: !!brand.googleAdsCustomerId,
    gemini: !!(brand.geminiApiKey || process.env.GEMINI_API_KEY),
    tiktok: !!(brand.tiktokAccessToken && brand.tiktokAdvertiserId),
    klaviyo: !!brand.klaviyoApiKey,
  };

  const connectedCount = Object.values(connections).filter(Boolean).length;
  const totalPlatforms = Object.keys(connections).length;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">B</div>
          <div>
            <h1>Brand Analytics</h1>
            <span>E-Commerce Dashboard</span>
          </div>
        </div>

        {/* Brand Switcher */}
        <div className="brand-switcher">
          <div className="brand-switcher-label">Current Brand</div>
          <select
            defaultValue={slug}
            id="brand-switcher-select"
          >
            {allBrands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Quick Access</div>

          <NavLink href={`/dashboard/${slug}/custom`}>
            <span className="nav-icon">🎛️</span>
            My Dashboard
          </NavLink>

          <NavLink href={`/dashboard/${slug}/chat`} disabled={!connections.gemini}>
            <span className="nav-icon">🤖</span>
            AI Consultant
            {connections.gemini && <span className="nav-badge">AI</span>}
          </NavLink>

          <div className="nav-section-label">Analytics</div>

          <NavLink href={`/dashboard/${slug}`} exact>
            <span className="nav-icon">📊</span>
            Overview
          </NavLink>

          <NavLink href={`/dashboard/${slug}/shopify`} disabled={!connections.shopify}>
            <span className="nav-icon">🛒</span>
            Shopify
            {connections.shopify && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/analytics`} disabled={!connections.ga4}>
            <span className="nav-icon">📈</span>
            Google Analytics
          </NavLink>

          <NavLink href={`/dashboard/${slug}/cro`} disabled={!connections.shopify}>
            <span className="nav-icon">🎯</span>
            CRO Optimization
          </NavLink>

          <NavLink href={`/dashboard/${slug}/forecast`} disabled={!connections.shopify}>
            <span className="nav-icon">📉</span>
            Forecast
          </NavLink>

          <div className="nav-section-label">Ads & Channels</div>

          <NavLink
            href={`/dashboard/${slug}/ads`}
            disabled={!connections.metaAds && !connections.googleAds}
          >
            <span className="nav-icon">🎯</span>
            Ads Manager
          </NavLink>

          <NavLink href={`/dashboard/${slug}/tiktok`} disabled={!connections.tiktok}>
            <span className="nav-icon">🎵</span>
            TikTok Ads
            {connections.tiktok && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/klaviyo`} disabled={!connections.klaviyo}>
            <span className="nav-icon">📧</span>
            Email Marketing
            {connections.klaviyo && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/social`} disabled={!connections.metaAds}>
            <span className="nav-icon">💬</span>
            Social Comments
          </NavLink>

          <div className="nav-section-label">Tools</div>

          <NavLink href={`/dashboard/${slug}/metrics`} disabled={!connections.shopify}>
            <span className="nav-icon">📐</span>
            Custom Metrics
          </NavLink>

          <div className="nav-section-label">Settings</div>

          <NavLink href={`/dashboard/${slug}/settings`}>
            <span className="nav-icon">⚙️</span>
            Connections
          </NavLink>

          <NavLink href="/" exact>
            <span className="nav-icon">↩️</span>
            All Brands
          </NavLink>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {connectedCount}/{totalPlatforms} platforms connected
          </div>
          {!connections.gemini && (
            <div style={{ fontSize: '11px', color: 'var(--accent-amber)', marginTop: '6px' }}>
              ⚠️ Set GEMINI_API_KEY to enable AI chat
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* AI Chat — always show the trigger, error message if no key */}
      <ChatPanel slug={slug} brandName={brand.name} hasAI={connections.gemini} />

      {/* Brand Switcher Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('brand-switcher-select')?.addEventListener('change', function(e) {
              window.location.href = '/dashboard/' + e.target.value;
            });
          `,
        }}
      />
    </div>
  );
}
