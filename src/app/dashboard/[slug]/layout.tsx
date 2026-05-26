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
    ? { shopify: true, ga4: true, metaAds: true, googleAds: true, ai: true, tiktok: true, klaviyo: true }
    : {
        shopify: !!(brand.shopifyStoreUrl && brand.shopifyAccessToken),
        ga4: !!brand.ga4PropertyId,
        metaAds: !!brand.metaAccessToken,
        googleAds: !!brand.googleAdsCustomerId,
        ai: !!(process.env.ANTHROPIC_API_KEY),
        tiktok: !!(brand.tiktokAccessToken && brand.tiktokAdvertiserId),
        klaviyo: !!brand.klaviyoApiKey,
      };

  return (
    <div className="app-layout">
      <SidebarToggle />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">HF</div>
          <div>
            <h1>Hira Fragrances</h1>
            <span>Analytics</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Quick Access</div>

          <NavLink href={`/dashboard/${slug}/custom`}>
            My Dashboard
          </NavLink>

          <NavLink href={`/dashboard/${slug}/chat`} disabled={!connections.ai} disabledPlatform="AI">
            AI Consultant
            {connections.ai && <span className="nav-badge">Claude</span>}
          </NavLink>

          <div className="nav-section-label">Analytics</div>

          <NavLink href={`/dashboard/${slug}`} exact>
            Overview
          </NavLink>

          <NavLink href={`/dashboard/${slug}/shopify`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Shopify
            {connections.shopify && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink href={`/dashboard/${slug}/analytics`} disabled={!connections.ga4} disabledPlatform="Google Analytics">
            Google Analytics
          </NavLink>

          <NavLink href={`/dashboard/${slug}/cro`} disabled={!connections.shopify} disabledPlatform="Shopify">
            CRO Optimization
          </NavLink>

          <NavLink href={`/dashboard/${slug}/forecast`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Forecast
          </NavLink>

          <NavLink href={`/dashboard/${slug}/profit`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Profitability
          </NavLink>

          <div className="nav-section-label">Ads & Channels</div>

          <NavLink
            href={`/dashboard/${slug}/ads`}
            disabled={!connections.metaAds && !connections.googleAds}
            disabledPlatform="Meta or Google Ads"
          >
            Ads Manager
            {(connections.metaAds || connections.googleAds) && <span className="nav-badge">Live</span>}
          </NavLink>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            TikTok Ads
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: '9px', fontWeight: '500', color: '#B45309', background: 'rgba(180,83,9,0.08)', padding: '2px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Soon</span>
          </span>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            Email Marketing
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: '9px', fontWeight: '500', color: '#B45309', background: 'rgba(180,83,9,0.08)', padding: '2px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Soon</span>
          </span>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            Social Comments
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: '9px', fontWeight: '500', color: '#B45309', background: 'rgba(180,83,9,0.08)', padding: '2px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Soon</span>
          </span>

          <div className="nav-section-label">Competitive Intel</div>

          <span className="nav-link disabled" style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}>
            Competitor Ads
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: '9px', fontWeight: '500', color: '#B45309', background: 'rgba(180,83,9,0.08)', padding: '2px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Soon</span>
          </span>

          <div className="nav-section-label">Tools</div>

          <NavLink href={`/dashboard/${slug}/metrics`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Custom Metrics
          </NavLink>

          <div className="nav-section-label">Settings</div>

          <NavLink href={`/dashboard/${slug}/settings`}>
            Connections
          </NavLink>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="platform-dots">
            {[
              { key: 'shopify',    label: 'Shopify',           on: connections.shopify },
              { key: 'ga4',        label: 'Google Analytics',  on: connections.ga4 },
              { key: 'metaAds',    label: 'Meta Ads',          on: connections.metaAds },
              { key: 'googleAds',  label: 'Google Ads',        on: connections.googleAds },
              { key: 'ai',         label: 'AI Assistant',      on: connections.ai },
              { key: 'tiktok',     label: 'TikTok',            on: connections.tiktok },
              { key: 'klaviyo',    label: 'Klaviyo',           on: connections.klaviyo },
            ].map(({ key, label, on }) => (
              <span
                key={key}
                className={`platform-dot ${on ? 'on' : 'off'}`}
                title={`${label} — ${on ? 'Connected' : 'Disconnected'}`}
              />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--muted-2)', marginTop: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* AI Chat */}
      <ChatPanel slug={slug} brandName={brand.name} hasAI={connections.ai} />
    </div>
  );
}
