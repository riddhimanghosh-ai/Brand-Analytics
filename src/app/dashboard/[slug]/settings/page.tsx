'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionAccordion } from '@/components/ConnectionAccordion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MetaConnect } from '@/components/MetaConnect';
import { GoogleAdsConnect } from '@/components/GoogleAdsConnect';
import { GA4Connect } from '@/components/GA4Connect';

interface BrandData {
  id: string;
  name: string;
  slug: string;
  shopifyStoreUrl: string | null;
  shopifyAccessToken: string | null;
  ga4PropertyId: string | null;
  ga4ServiceAccountJson: string | null;
  metaAppId: string | null;
  metaAppSecret: string | null;
  metaAccessToken: string | null;
  metaAdAccountId: string | null;
  googleAdsDevToken: string | null;
  googleAdsClientId: string | null;
  googleAdsClientSecret: string | null;
  googleAdsRefreshToken: string | null;
  googleAdsCustomerId: string | null;
  geminiApiKey: string | null;
  tiktokAccessToken?: string | null;
  tiktokAdvertiserId?: string | null;
  klaviyoApiKey?: string | null;
  pinterestAccessToken?: string | null;
  pinterestAdAccountId?: string | null;
  // Connection booleans from masked API response
  shopifyConnected?: boolean;
  ga4Connected?: boolean;
  metaConnected?: boolean;
  googleAdsConnected?: boolean;
  geminiConnected?: boolean;
  tiktokConnected?: boolean;
  klaviyoConnected?: boolean;
  competitors?: Array<{ name: string; pageId: string }> | null;
}

// ── Shopify OAuth connect component ──
function ShopifyConnect({
  slug,
  brand,
  isConnected,
}: {
  slug: string;
  brand: BrandData;
  isConnected: boolean;
}) {
  const [shopUrl, setShopUrl] = useState(brand.shopifyStoreUrl || '');

  const handleConnect = () => {
    const clean = shopUrl.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!clean) return;
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(clean)}&slug=${encodeURIComponent(slug)}`;
  };

  if (isConnected) {
    return (
      <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>✅</span>
        <div>
          <div style={{ fontWeight: '600', color: '#22c55e', fontSize: '14px' }}>Connected</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Store: <strong>{brand.shopifyStoreUrl}</strong> — data syncing automatically
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {brand.shopifyStoreUrl && !isConnected && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent-amber)' }}>
          ⚠️ Store URL saved but authorization is incomplete — click <strong>Connect Shopify</strong> below to finish.
        </div>
      )}
      <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        Enter your Shopify store URL and click <strong>Connect Shopify</strong>. You will be taken to Shopify to approve the connection — no tokens needed.
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Store URL</label>
          <input
            className="form-input mono"
            placeholder="your-store.myshopify.com"
            value={shopUrl}
            onChange={(e) => setShopUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
        </div>
        <button
          onClick={handleConnect}
          disabled={!shopUrl.trim()}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: shopUrl.trim() ? '#96bf48' : 'var(--bg-card)',
            color: shopUrl.trim() ? '#fff' : 'var(--text-dim)',
            fontSize: '14px', fontWeight: '600', cursor: shopUrl.trim() ? 'pointer' : 'default',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px',
          }}
        >
          🛍️ Connect Shopify
        </button>
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
        You will be redirected to Shopify to approve permissions, then automatically redirected back here.
      </div>
    </div>
  );
}

// Parse the ad account picker list from URL: "act_123|Name,act_456|Other"
function parseAccountsParam(raw: string | null): { id: string; name: string }[] {
  if (!raw) return [];
  return raw.split(',').map(item => {
    const [id, encodedName] = item.split('|');
    return { id, name: decodeURIComponent(encodedName ?? id) };
  });
}

// ── Competitor Tracking Card ──────────────────────────────────────────────────
function CompetitorTrackingCard({
  brand,
  onUpdate,
  params,
}: {
  brand: BrandData;
  onUpdate: (competitors: Array<{ name: string; pageId: string }>) => void;
  params: { slug: string } | null;
}) {
  const [newName, setNewName] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [saving, setSaving] = useState(false);

  const competitors: Array<{ name: string; pageId: string }> = (brand.competitors as Array<{ name: string; pageId: string }>) || [];

  const persist = async (updated: Array<{ name: string; pageId: string }>) => {
    if (!params) return;
    setSaving(true);
    try {
      await fetch(`/api/brands/${params.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors: updated }),
      });
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    if (!newName.trim() || !newPageId.trim()) return;
    const updated = [...competitors, { name: newName.trim(), pageId: newPageId.trim() }];
    await persist(updated);
    setNewName('');
    setNewPageId('');
  };

  const remove = async (idx: number) => {
    const updated = competitors.filter((_, i) => i !== idx);
    await persist(updated);
  };

  return (
    <div className="form-card">
      <div className="form-card-title">🔍 Competitor Tracking</div>
      <div className="form-card-desc">
        Track competitor ads via the Meta Ad Library. Add their Facebook Page ID to monitor their active ads.
      </div>

      {/* Add row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ flex: '1', minWidth: '140px' }}
          placeholder="Brand name (e.g. Nykaa)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          className="form-input mono"
          style={{ flex: '1', minWidth: '160px' }}
          placeholder="Facebook Page ID (e.g. 123456789)"
          value={newPageId}
          onChange={(e) => setNewPageId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button
          className="btn btn-primary"
          onClick={add}
          disabled={saving || !newName.trim() || !newPageId.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {saving ? '⏳' : '+ Add'}
        </button>
      </div>

      {/* Saved competitors */}
      {competitors.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', padding: '12px 0' }}>
          No competitors added yet. Add a competitor above to start tracking their ads.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {competitors.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', background: 'var(--bg-hover)',
              borderRadius: '8px', border: '1px solid var(--glass-border)',
            }}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>{c.name}</span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.pageId}</span>
              <button
                onClick={() => remove(i)}
                disabled={saving}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
        💡 Find a page ID: go to the brand&apos;s Facebook page → right-click → View Page Source → search for <code style={{ fontFamily: 'monospace', background: 'rgba(59,130,246,0.1)', padding: '1px 4px', borderRadius: '3px' }}>page_id</code>. Requires Meta Ads to be connected.
      </div>
    </div>
  );
}

export default function SettingsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [params, setParams] = useState<{ slug: string } | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // OAuth callback state from URL params
  const metaConnectedViaOAuth      = searchParams.get('meta') === 'connected';
  const googleAdsConnectedViaOAuth = searchParams.get('google_ads') === 'connected';
  const ga4ConnectedViaOAuth       = searchParams.get('ga4') === 'connected';
  const metaError      = searchParams.get('meta_error');
  const googleAdsError = searchParams.get('google_ads_error');
  const ga4Error       = searchParams.get('ga4_error');
  const shopifySuccess = searchParams.get('shopify') === 'connected';

  // Parse pending picker lists (shown after OAuth if multiple accounts/properties found)
  const [metaPendingAccounts, setMetaPendingAccounts] = useState(() =>
    parseAccountsParam(searchParams.get('meta_accounts'))
  );
  const [googleAdsPendingAccounts, setGoogleAdsPendingAccounts] = useState(() =>
    parseAccountsParam(searchParams.get('google_ads_accounts'))
  );
  const [ga4PendingProperties, setGa4PendingProperties] = useState(() =>
    parseAccountsParam(searchParams.get('ga4_properties'))
  );

  useEffect(() => {
    paramsPromise.then(setParams);
  }, [paramsPromise]);

  useEffect(() => {
    if (!params) return;
    // Fetch the brand by slug
    fetch(`/api/brands/${params.slug}`)
      .then(r => r.json())
      .then(setBrand)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params, metaConnectedViaOAuth, googleAdsConnectedViaOAuth, ga4ConnectedViaOAuth]);

  const updateField = (field: string, value: string) => {
    if (!brand) return;
    // Only update if user is actually typing a new value (not the masked ••••)
    setBrand({ ...brand, [field]: value });
  };

  const save = async () => {
    if (!brand || !params) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      // Only send fields the user has actually set (non-empty strings)
      // Omit fields that are undefined/empty so we don't accidentally null them out
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(brand)) {
        // Skip connected booleans from masked response
        if (key.endsWith('Connected')) continue;
        // Skip blank/undefined — don't overwrite DB value with nothing
        if (val === undefined || val === '' || val === null) continue;
        payload[key] = val;
      }
      const res = await fetch(`/api/brands/${params.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError((err as { error?: string }).error || 'Failed to save. Please try again.');
      }
    } catch {
      setSaveError('Network error. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const testShopify = async () => {
    if (!brand?.shopifyStoreUrl) return;
    setTesting(p => ({ ...p, shopify: true }));
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shopify',
          storeUrl: brand.shopifyStoreUrl,
          accessToken: brand.shopifyAccessToken,
        }),
      });
      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        shopify: { success: data.success, message: data.success ? `✅ Connected to "${data.shopName}"` : `❌ ${data.error}` },
      }));
    } finally {
      setTesting(p => ({ ...p, shopify: false }));
    }
  };

  const deleteBrand = async () => {
    if (!brand || !params || deleteConfirm !== brand.name) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${params.slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        router.push('/');
      } else {
        alert('Failed to delete brand');
      }
    } catch {
      alert('Failed to delete brand');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h2>⚙️ Connection Settings</h2>
          <p>Loading...</p>
        </div>
        <div className="page-body">
          {[1,2,3].map(i => (
            <div key={i} className="form-card" style={{ marginBottom: '16px' }}>
              <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: '16px' }} />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!brand) return null;

  const isConnected = {
    shopify: !!(brand.shopifyConnected),  // needs both URL + token — shopifyConnected flag set by masked API
    ga4: !!(brand.ga4Connected || brand.ga4PropertyId),
    meta: !!(brand.metaConnected || brand.metaAccessToken),
    googleAds: !!(brand.googleAdsConnected || brand.googleAdsCustomerId),
    // geminiConnected comes from masked API; geminiApiKey is only set when user types a new one
    ai: !!(brand.geminiConnected || brand.geminiApiKey),
    tiktok: !!(brand.tiktokConnected || brand.tiktokAdvertiserId),
    klaviyo: !!(brand.klaviyoConnected || brand.klaviyoApiKey),
  };

  const Step = ({ n, text }: { n: number; text: string }) => (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
      <span style={{ minWidth: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>{n}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );

  const Code = ({ children }: { children: string }) => (
    <code style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1px 6px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent-blue)' }}>{children}</code>
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>⚙️ Connection Setup</h2>
            <p>Step-by-step guides to connect all platforms for <strong>{brand.name}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ThemeToggle />
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* OAuth success/error banners at top */}
        {(shopifySuccess || metaConnectedViaOAuth || googleAdsConnectedViaOAuth || ga4ConnectedViaOAuth) && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            <span>
              {shopifySuccess && 'Shopify connected successfully!'}
              {metaConnectedViaOAuth && 'Meta Ads connected successfully!'}
              {googleAdsConnectedViaOAuth && 'Google Ads connected successfully!'}
              {ga4ConnectedViaOAuth && 'Google Analytics connected successfully!'}
            </span>
          </div>
        )}

        {/* ── SHOPIFY ── */}
        <ConnectionAccordion
          id="shopify"
          title="Shopify"
          icon="🛒"
          isConnected={isConnected.shopify}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Enables orders, products, customers, revenue analytics, and Custom Metrics (ShopifyQL)
          </div>
          <ShopifyConnect
            slug={params?.slug ?? ''}
            brand={brand}
            isConnected={isConnected.shopify}
          />
        </ConnectionAccordion>

        {/* ── GOOGLE ANALYTICS 4 ── */}
        <ConnectionAccordion
          id="ga4"
          title="Google Analytics 4"
          icon="📈"
          isConnected={isConnected.ga4}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Traffic sources, sessions, bounce rates, and conversion funnel data
          </div>

          {/* OAuth error banner */}
          {ga4Error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              ❌ Connection failed: {ga4Error.replace(/_/g, ' ')}. Please try again.
            </div>
          )}

          <GA4Connect
            slug={params?.slug ?? ''}
            isConnected={isConnected.ga4}
            propertyId={brand.ga4PropertyId}
            pendingProperties={ga4PendingProperties}
            onPropertySelected={(id) => {
              setBrand(b => b ? { ...b, ga4PropertyId: id } : b);
              setGa4PendingProperties([]);
            }}
          />
        </ConnectionAccordion>

        {/* ── META ADS ── */}
        <ConnectionAccordion
          id="metaAds"
          title="Meta Ads"
          icon="📱"
          isConnected={isConnected.meta}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Facebook and Instagram ad campaign performance, ROAS and spend analytics
          </div>

          {/* OAuth error banner */}
          {metaError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              ❌ Connection failed: {metaError.replace(/_/g, ' ')}. Please try again.
            </div>
          )}

          <MetaConnect
            slug={params?.slug ?? ''}
            isConnected={isConnected.meta}
            adAccountId={brand.metaAdAccountId}
            pendingAccounts={metaPendingAccounts}
            onAccountSelected={(id) => {
              setBrand(b => b ? { ...b, metaAdAccountId: id } : b);
              setMetaPendingAccounts([]);
            }}
          />
        </ConnectionAccordion>

        {/* ── GOOGLE ADS ── */}
        <ConnectionAccordion
          id="googleAds"
          title="Google Ads"
          icon="🎯"
          isConnected={isConnected.googleAds}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Search, Shopping and Display campaign performance and ROAS
          </div>

          {/* OAuth error banner */}
          {googleAdsError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              ❌ Connection failed: {googleAdsError.replace(/_/g, ' ')}. Please try again.
            </div>
          )}

          <GoogleAdsConnect
            slug={params?.slug ?? ''}
            isConnected={isConnected.googleAds}
            customerId={brand.googleAdsCustomerId}
            pendingAccounts={googleAdsPendingAccounts}
            onAccountSelected={(id) => {
              setBrand(b => b ? { ...b, googleAdsCustomerId: id } : b);
              setGoogleAdsPendingAccounts([]);
            }}
          />
        </ConnectionAccordion>

        {/* ── GEMINI AI ── */}
        <ConnectionAccordion
          id="gemini"
          title="AI Consultant"
          icon="🤖"
          isConnected={isConnected.ai}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Powers the AI chat assistant with real-time brand data for consulting
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text='Go to <a href="https://aistudio.google.com" target="_blank" style="color:var(--accent-blue)">aistudio.google.com</a> → Sign in with Google' />
            <Step n={2} text='Click <strong>"Get API Key"</strong> → Create API Key in new project (free tier: 15 RPM, 1M tokens/day)' />
            <Step n={3} text='Copy the key (starts with <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">AIza</code>) and paste below' />
          </div>

          {isConnected.ai && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>API key is saved and active</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  For security, the key is not shown. Enter a new key below only if you want to replace it.
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              {isConnected.ai ? 'Replace Gemini API Key (leave blank to keep current)' : 'Gemini API Key'}
            </label>
            <input
              className="form-input mono"
              type="password"
              value={brand.geminiApiKey || ''}
              onChange={(e) => updateField('geminiApiKey', e.target.value)}
              placeholder={isConnected.ai ? 'Enter new key only to replace existing…' : 'AIza...'}
              autoComplete="new-password"
            />
          </div>
        </ConnectionAccordion>

        {/* ── TIKTOK ADS ── */}
        <ConnectionAccordion
          id="tiktok"
          title="TikTok Ads"
          icon="🎵"
          isConnected={!!(brand as unknown as Record<string,string|null>).tiktokAdvertiserId}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track TikTok Ads spend, ROAS, video views, and conversions
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text='Go to <a href="https://ads.tiktok.com" target="_blank" style="color:var(--accent-blue)">TikTok Ads Manager</a> → Your Account → <strong>Assets → Business Account</strong>' />
            <Step n={2} text='Go to <strong>My Apps</strong> → Create app → Select <strong>Standard Access</strong> → Enable Marketing API' />
            <Step n={3} text='In your app dashboard, copy the <strong>Access Token</strong>' />
            <Step n={4} text='Your <strong>Advertiser ID</strong> is shown in the URL: <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">ads.tiktok.com/i18n/dashboard?aadvid=XXXXXXXXXX</code>' />
          </div>

          <div className="form-group">
            <label className="form-label">Access Token</label>
            <input className="form-input mono" type="password" value={(brand as unknown as Record<string,string>).tiktokAccessToken || ''} onChange={(e) => updateField('tiktokAccessToken', e.target.value)} placeholder="TikTok access token" />
          </div>
          <div className="form-group">
            <label className="form-label">Advertiser ID</label>
            <input className="form-input mono" value={(brand as unknown as Record<string,string>).tiktokAdvertiserId || ''} onChange={(e) => updateField('tiktokAdvertiserId', e.target.value)} placeholder="1234567890" />
          </div>
        </ConnectionAccordion>

        {/* ── KLAVIYO ── */}
        <ConnectionAccordion
          id="klaviyo"
          title="Klaviyo"
          icon="📧"
          isConnected={!!(brand as unknown as Record<string,string|null>).klaviyoApiKey}
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track email revenue, open rates, click rates, flows, and subscriber growth
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text='Go to <a href="https://www.klaviyo.com/settings/account/api-keys" target="_blank" style="color:var(--accent-blue)">Klaviyo → Account → Settings → API Keys</a>' />
            <Step n={2} text='Click <strong>"Create Private API Key"</strong> → Name it (e.g. "Brand Analytics") → Select <strong>Read-Only Access</strong>' />
            <Step n={3} text='Copy the key (starts with <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">pk_</code>) and paste below' />
          </div>

          <div className="form-group">
            <label className="form-label">Klaviyo Private API Key</label>
            <input className="form-input mono" type="password" value={(brand as unknown as Record<string,string>).klaviyoApiKey || ''} onChange={(e) => updateField('klaviyoApiKey', e.target.value)} placeholder="pk_..." />
          </div>
        </ConnectionAccordion>

        {/* ── Competitor Tracking ── */}
        <CompetitorTrackingCard brand={brand} onUpdate={(competitors) => setBrand({ ...brand, competitors })} params={params} />

        {/* Save */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save All Changes'}
            </button>
            {saved && <span style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>✅ Changes saved — AI consultant will use the new key immediately</span>}
          </div>
          {saveError && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
            }}>
              ❌ {saveError}
            </div>
          )}
        </div>

        {/* ── DANGER ZONE ── */}
        <div className="form-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="form-card-title" style={{ color: 'var(--text-danger)' }}>⚠️ Danger Zone</div>
          <div className="form-card-desc">Permanently delete this brand and all associated data</div>

          {deleteConfirm === '' ? (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                This action cannot be undone. All analytics data, settings, and configurations for <strong>{brand.name}</strong> will be permanently deleted.
              </p>
              <button
                onClick={() => setDeleteConfirm('confirm')}
                className="btn"
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🗑️ Delete Brand
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Type the brand name <strong>"{brand.name}"</strong> to confirm deletion:
              </p>
              <input
                type="text"
                className="form-input"
                placeholder={brand.name}
                value={deleteConfirm === 'confirm' ? '' : deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoFocus
                style={{ marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={deleteBrand}
                  disabled={deleteConfirm !== brand.name || deleting}
                  className="btn"
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    cursor: deleteConfirm === brand.name && !deleting ? 'pointer' : 'not-allowed',
                    opacity: deleteConfirm === brand.name && !deleting ? 1 : 0.5,
                  }}
                >
                  {deleting ? '⏳ Deleting...' : '✓ Confirm Delete'}
                </button>
                <button
                  onClick={() => setDeleteConfirm('')}
                  disabled={deleting}
                  className="btn btn-secondary"
                  style={{ cursor: 'pointer' }}
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
