import { getBrand } from '@/lib/mongodb-store';
import { redirect } from 'next/navigation';
import { ChatPanel } from '@/components/ChatPanel';
import { NavLink } from '@/components/NavLink';
import { SidebarToggle } from '@/components/SidebarToggle';

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

  const isDemoMode = slug === 'demo';
  const connections = isDemoMode
    ? { shopify: true, ga4: true, metaAds: true, googleAds: true, gemini: true, tiktok: true, klaviyo: true }
    : {
        shopify: !!(brand.shopifyStoreUrl && brand.shopifyAccessToken),
        ga4: !!brand.ga4PropertyId,
        metaAds: !!brand.metaAccessToken,
        googleAds: !!brand.googleAdsCustomerId,
        gemini: !!(process.env.GROQ_API_KEY || brand.geminiApiKey || process.env.GEMINI_API_KEY),
        tiktok: !!(brand.tiktokAccessToken && brand.tiktokAdvertiserId),
        klaviyo: !!brand.klaviyoApiKey,
      };

  return (
    <div className="app-layout">
      {/* Hamburger Menu + Sidebar Toggle */}
      <SidebarToggle />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">H</div>
          <div>
            <h1>Hira Fragrances</h1>
            <span>Analytics Dashboard</span>
          </div>
        </div>

        {/* Brand Identity */}
        <div className="brand-switcher">
          <div className="brand-switcher-label">Brand</div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', padding: '6px 0' }}>
            Hira Fragrances
          </div>
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

          <NavLink href={`/dashboard/${slug}/profit`} disabled={!connections.shopify} disabledPlatform="Shopify">
            <span className="nav-icon">💰</span>
            Profitability
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

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            <span className="nav-icon">🎵</span>
            TikTok Ads
            <span style={{ fontSize: '9px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px', marginLeft: 'auto', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Soon</span>
          </span>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            <span className="nav-icon">📧</span>
            Email Marketing
            <span style={{ fontSize: '9px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px', marginLeft: 'auto', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Soon</span>
          </span>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            <span className="nav-icon">💬</span>
            Social Comments
            <span style={{ fontSize: '9px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px', marginLeft: 'auto', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Soon</span>
          </span>

          <div className="nav-section-label">Competitive Intel</div>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            <span className="nav-icon">🔍</span>
            Competitor Ads
            <span style={{ fontSize: '9px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px', marginLeft: 'auto', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Soon</span>
          </span>

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

    </div>
  );
}
