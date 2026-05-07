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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div className="brand-switcher-label">Brand</div>
            <a href="/brands/new" title="Add new brand" className="add-brand-btn">
              ➕
            </a>
          </div>
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

          <NavLink href={`/dashboard/${slug}/chat`} disabled={!connections.gemini} disabledPlatform="AI (Gemini)">
            <span className="nav-icon">🤖</span>
            AI Consultant
            {connections.gemini && <span className="nav-badge">AI</span>}
          </NavLink>

          <div className="nav-section-label">Analytics</div>

          <NavLink href={`/dashboard/${slug}`} exact>
            <span className="nav-icon">📊</span>
            Overview
          </NavLink>

          <NavLink href={`/dashboard/${slug}/shopify`} disabled={!connections.shopify} disabledPlatform="Shopify">
            <span className="nav-icon">🛒</span>
            Shopify
            {connections.shopify && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/analytics`} disabled={!connections.ga4} disabledPlatform="Google Analytics">
            <span className="nav-icon">📈</span>
            Google Analytics
          </NavLink>

          <NavLink href={`/dashboard/${slug}/cro`} disabled={!connections.shopify} disabledPlatform="Shopify">
            <span className="nav-icon">🎯</span>
            CRO Optimization
          </NavLink>

          <NavLink href={`/dashboard/${slug}/forecast`} disabled={!connections.shopify} disabledPlatform="Shopify">
            <span className="nav-icon">📉</span>
            Forecast
          </NavLink>

          <div className="nav-section-label">Ads & Channels</div>

          <NavLink
            href={`/dashboard/${slug}/ads`}
            disabled={!connections.metaAds && !connections.googleAds}
            disabledPlatform="Meta or Google Ads"
          >
            <span className="nav-icon">🎯</span>
            Ads Manager
          </NavLink>

          <NavLink href={`/dashboard/${slug}/tiktok`} disabled={!connections.tiktok} disabledPlatform="TikTok">
            <span className="nav-icon">🎵</span>
            TikTok Ads
            {connections.tiktok && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/klaviyo`} disabled={!connections.klaviyo} disabledPlatform="Klaviyo">
            <span className="nav-icon">📧</span>
            Email Marketing
            {connections.klaviyo && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/social`} disabled={!connections.metaAds} disabledPlatform="Meta Ads">
            <span className="nav-icon">💬</span>
            Social Comments
          </NavLink>

          <div className="nav-section-label">Tools</div>

          <NavLink href={`/dashboard/${slug}/metrics`} disabled={!connections.shopify} disabledPlatform="Shopify">
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
          {/* Platform dots row */}
          <div className="platform-dots">
            {[
              { key: 'shopify', label: 'Shopify 🛒', on: connections.shopify },
              { key: 'ga4', label: 'Google Analytics 📈', on: connections.ga4 },
              { key: 'metaAds', label: 'Meta Ads 📱', on: connections.metaAds },
              { key: 'googleAds', label: 'Google Ads 🎯', on: connections.googleAds },
              { key: 'gemini', label: 'AI Assistant 🤖', on: connections.gemini },
              { key: 'tiktok', label: 'TikTok 🎵', on: connections.tiktok },
              { key: 'klaviyo', label: 'Klaviyo 📧', on: connections.klaviyo },
            ].map(({ key, label, on }) => (
              <span
                key={key}
                className={`platform-dot ${on ? 'on' : 'off'}`}
                title={`${label} — ${on ? 'Connected' : 'Disconnected'}`}
              />
            ))}
          </div>
          {!connections.gemini && (
            <div style={{ fontSize: '11px', marginBottom: '6px' }}>
              <a href={`/dashboard/${slug}/settings`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
                ⚡ Add AI Key
              </a>
            </div>
          )}
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
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
