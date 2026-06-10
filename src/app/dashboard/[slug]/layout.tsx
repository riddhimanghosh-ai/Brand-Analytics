import { getBrand, getBrands } from '@/lib/mongodb-store';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ChatPanel } from '@/components/ChatPanel';
import { NavLink } from '@/components/NavLink';
import { LogoutButton } from '@/components/LogoutButton';
import { SidebarToggle } from '@/components/SidebarToggle';
import { verifySession, canAccessBrand, filterBrandsForUser, COOKIE_NAME } from '@/lib/auth';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const user = await verifySession(cookieStore.get(COOKIE_NAME)?.value);
  if (!canAccessBrand(user, slug)) redirect('/');

  const brand = await getBrand(slug);
  if (!brand) redirect('/');

  const allBrandsData = await getBrands();
  const visibleBrands = filterBrandsForUser(allBrandsData, user);
  const allBrands = visibleBrands.map((b) => ({ name: b.name, slug: b.slug }));

  const isDemoMode = slug === 'demo';
  const connections = isDemoMode
    ? { shopify: true, ga4: true, metaAds: true, googleAds: true, ai: true, tiktok: true, klaviyo: true }
    : {
        shopify: !!(brand.shopifyStoreUrl && brand.shopifyAccessToken),
        ga4: !!brand.ga4PropertyId,
        metaAds: !!brand.metaAccessToken,
        googleAds: !!(brand.windsorApiKey || brand.googleAdsCustomerId),
        ai: !!(process.env.ANTHROPIC_API_KEY),
        tiktok: !!(brand.tiktokAccessToken && brand.tiktokAdvertiserId),
        klaviyo: !!brand.klaviyoApiKey,
      };

  const soonBadge = (
    <span style={{
      marginLeft: 'auto',
      fontFamily: 'var(--f-mono)',
      fontSize: '9px',
      fontWeight: 500,
      color: '#B45309',
      background: 'rgba(180,83,9,0.08)',
      padding: '2px 5px',
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    }}>Soon</span>
  );

  return (
    <div className="app-layout">
      <SidebarToggle />

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">BA</div>
          <div>
            <h1>Brand Analytics <span style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>AI</span></h1>
            <span>E-Commerce Dashboard</span>
          </div>
        </div>

        {/* Brand Switcher */}
        <div className="brand-switcher">
          <div className="brand-switcher-label">Brand</div>
          <select defaultValue={slug} id="brand-switcher-select">
            {allBrands.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </select>
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

          <NavLink href={`/dashboard/${slug}/discounts`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Discount Codes
          </NavLink>

          <NavLink href={`/dashboard/${slug}/goals`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Revenue Goal
          </NavLink>

          <NavLink href={`/dashboard/${slug}/segments`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Customer Segments
          </NavLink>

          <NavLink href={`/dashboard/${slug}/cohorts`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Retention Cohorts
          </NavLink>

          <NavLink href={`/dashboard/${slug}/velocity`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Product Velocity
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

          <NavLink href={`/dashboard/${slug}/mer`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Blended ROAS
          </NavLink>

          <NavLink href={`/dashboard/${slug}/fatigue`} disabled={!connections.metaAds} disabledPlatform="Meta Ads">
            Creative Fatigue
          </NavLink>

          {/* Upcoming — non-navigable */}
          <span className="nav-link" style={{ pointerEvents: 'none', cursor: 'default', opacity: 0.55 }}>
            TikTok Ads
            {soonBadge}
          </span>

          <span className="nav-link" style={{ pointerEvents: 'none', cursor: 'default', opacity: 0.55 }}>
            Email Marketing
            {soonBadge}
          </span>

          <span className="nav-link" style={{ pointerEvents: 'none', cursor: 'default', opacity: 0.55 }}>
            Social Comments
            {soonBadge}
          </span>

          <div className="nav-section-label">Competitive Intel</div>

          <NavLink href={`/dashboard/${slug}/price-tracker`}>
            Price Tracker
          </NavLink>

          <span className="nav-link" style={{ pointerEvents: 'none', cursor: 'default', opacity: 0.55 }}>
            Competitor Ads
            {soonBadge}
          </span>

          <span className="nav-link" style={{ pointerEvents: 'none', cursor: 'default', opacity: 0.55 }}>
            Tech Stack Detector
            {soonBadge}
          </span>

          <div className="nav-section-label">Tools</div>

          <NavLink href={`/dashboard/${slug}/metrics`} disabled={!connections.shopify} disabledPlatform="Shopify">
            Custom Metrics
          </NavLink>

          <NavLink href={`/dashboard/${slug}/events`}>
            Events &amp; Campaigns
          </NavLink>

          <div className="nav-section-label">Settings</div>

          <NavLink href={`/dashboard/${slug}/settings`}>
            Connections
          </NavLink>

          <NavLink href={`/dashboard/${slug}/help`}>
            Help & Guide
          </NavLink>

          <NavLink href="/" exact>
            All Brands
          </NavLink>

          <LogoutButton />
        </nav>

        <div className="sidebar-footer">
          <div className="platform-dots">
            {[
              { key: 'shopify',   label: 'Shopify',           on: connections.shopify },
              { key: 'ga4',       label: 'Google Analytics',  on: connections.ga4 },
              { key: 'metaAds',   label: 'Meta Ads',          on: connections.metaAds },
              { key: 'googleAds', label: 'Google Ads',        on: connections.googleAds },
              { key: 'ai',        label: 'AI',                on: connections.ai },
              { key: 'tiktok',    label: 'TikTok',            on: connections.tiktok },
              { key: 'klaviyo',   label: 'Klaviyo',           on: connections.klaviyo },
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

      <main className="main-content">
        {children}
      </main>

      <ChatPanel slug={slug} brandName={brand.name} hasAI={connections.ai} />

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
