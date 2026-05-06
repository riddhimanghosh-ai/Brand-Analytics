'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
}

export default function SettingsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
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
  }, [params]);

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
    shopify: !!(brand.shopifyConnected || brand.shopifyStoreUrl),
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
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* ── SHOPIFY ── */}
        <div className="form-card">
          <div className="form-card-title">
            🛒 Shopify
            <span className={`badge ${isConnected.shopify ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.shopify ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Enables orders, products, customers, revenue analytics, and Custom Metrics (ShopifyQL)</div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text="Go to <strong>Shopify Admin</strong> → Settings → Apps and sales channels" />
            <Step n={2} text='Click <strong>"Develop apps"</strong> → Allow custom app development' />
            <Step n={3} text='Create a new app → Configure <strong>Admin API access scopes</strong>. <strong>REQUIRED for Custom Metrics:</strong> Include <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">read_analytics</code>. Also add: <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">read_orders, read_products, read_customers, read_inventory, read_fulfillments</code>' />
            <Step n={4} text='Click <strong>Install app</strong> → copy the <strong>Admin API access token</strong> (shown once, starts with <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">shpat_</code>)' />
            <Step n={5} text='Enter your store URL as <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">your-store.myshopify.com</code> (no https://)' />
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '10px 12px', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <strong>Note:</strong> Custom Metrics feature requires the <Code>read_analytics</Code> scope. If you're seeing "ShopifyQL is not available" error, regenerate your access token with this scope included. Not all Shopify plans include Analytics API access.
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Store URL</label>
              <input className="form-input mono" value={brand.shopifyStoreUrl || ''} onChange={(e) => updateField('shopifyStoreUrl', e.target.value)} placeholder="your-store.myshopify.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Admin API Access Token</label>
              <input className="form-input mono" type="password" value={brand.shopifyAccessToken || ''} onChange={(e) => updateField('shopifyAccessToken', e.target.value)} placeholder="shpat_..." />
            </div>
          </div>
          {brand.shopifyStoreUrl && (
            <div>
              <button onClick={testShopify} className="test-connection-btn" disabled={testing.shopify}>
                {testing.shopify ? '⏳ Testing...' : '🔌 Test Connection'}
              </button>
              {testResults.shopify && (
                <div className={`test-result ${testResults.shopify.success ? 'success' : 'error'}`}>{testResults.shopify.message}</div>
              )}
            </div>
          )}
        </div>

        {/* ── GOOGLE ANALYTICS 4 ── */}
        <div className="form-card">
          <div className="form-card-title">
            📈 Google Analytics 4 (GA4)
            <span className={`badge ${isConnected.ga4 ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.ga4 ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Traffic sources, sessions, bounce rates, and conversion funnel data</div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text='Go to <a href="https://console.cloud.google.com" target="_blank" style="color:var(--accent-blue)">Google Cloud Console</a> → Create or select a project' />
            <Step n={2} text='Enable the <strong>Google Analytics Data API</strong> (APIs & Services → Library → search "Analytics Data API")' />
            <Step n={3} text='Go to <strong>IAM & Admin → Service Accounts</strong> → Create Service Account → Download the <strong>JSON key</strong>' />
            <Step n={4} text='In <strong>Google Analytics Admin</strong> → Property → Property Access Management → Add the service account email as <strong>Viewer</strong>' />
            <Step n={5} text='Copy your <strong>GA4 Property ID</strong> from Analytics Admin → Property Settings (numeric ID, e.g. 123456789)' />
            <Step n={6} text='Paste the full JSON key content and Property ID below' />
          </div>

          <div className="form-group">
            <label className="form-label">GA4 Property ID</label>
            <input className="form-input mono" value={brand.ga4PropertyId || ''} onChange={(e) => updateField('ga4PropertyId', e.target.value)} placeholder="123456789" />
          </div>
          <div className="form-group">
            <label className="form-label">Service Account JSON</label>
            <textarea className="form-input mono" rows={5} value={brand.ga4ServiceAccountJson || ''} onChange={(e) => updateField('ga4ServiceAccountJson', e.target.value)} placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\n..."\n}'} />
          </div>
        </div>

        {/* ── META ADS ── */}
        <div className="form-card">
          <div className="form-card-title">
            📱 Meta Ads (Facebook & Instagram)
            <span className={`badge ${isConnected.meta ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.meta ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Facebook and Instagram ad campaign performance, ROAS and spend analytics</div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text='Go to <a href="https://developers.facebook.com" target="_blank" style="color:var(--accent-blue)">developers.facebook.com</a> → My Apps → Create App → Select <strong>Business</strong> type' />
            <Step n={2} text='In your app dashboard, click <strong>Add Product</strong> → Add <strong>Marketing API</strong>' />
            <Step n={3} text='Go to <strong>Tools → Graph API Explorer</strong> → Generate Access Token with permissions: <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">ads_read, ads_management, business_management</code>' />
            <Step n={4} text='Extend token lifetime: use <strong>Access Token Debugger</strong> → Extend to get a long-lived token (60 days)' />
            <Step n={5} text='Find your <strong>Ad Account ID</strong> in Meta Ads Manager → top left account selector (format: <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">act_XXXXXXXXXX</code>)' />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">App ID</label>
              <input className="form-input mono" value={brand.metaAppId || ''} onChange={(e) => updateField('metaAppId', e.target.value)} placeholder="App ID from Meta Developer Console" />
            </div>
            <div className="form-group">
              <label className="form-label">App Secret</label>
              <input className="form-input mono" type="password" value={brand.metaAppSecret || ''} onChange={(e) => updateField('metaAppSecret', e.target.value)} placeholder="App Secret" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Access Token</label>
              <input className="form-input mono" type="password" value={brand.metaAccessToken || ''} onChange={(e) => updateField('metaAccessToken', e.target.value)} placeholder="Long-lived access token" />
            </div>
            <div className="form-group">
              <label className="form-label">Ad Account ID</label>
              <input className="form-input mono" value={brand.metaAdAccountId || ''} onChange={(e) => updateField('metaAdAccountId', e.target.value)} placeholder="act_123456789" />
            </div>
          </div>
        </div>

        {/* ── GOOGLE ADS ── */}
        <div className="form-card">
          <div className="form-card-title">
            🎯 Google Ads
            <span className={`badge ${isConnected.googleAds ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.googleAds ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Search, Shopping and Display campaign performance and ROAS</div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to get credentials</div>
            <Step n={1} text='Apply for <strong>Google Ads API access</strong> at <a href="https://developers.google.com/google-ads/api/docs/first-call/dev-token" target="_blank" style="color:var(--accent-blue)">developers.google.com</a> → Your Developer Token will be emailed' />
            <Step n={2} text='In <a href="https://console.cloud.google.com" target="_blank" style="color:var(--accent-blue)">Google Cloud Console</a> → APIs & Services → Credentials → Create <strong>OAuth 2.0 Client ID</strong> (Web application type)' />
            <Step n={3} text='Enable <strong>Google Ads API</strong> in APIs & Services → Library' />
            <Step n={4} text='Use <a href="https://developers.google.com/oauthplayground" target="_blank" style="color:var(--accent-blue)">OAuth 2.0 Playground</a> to generate a <strong>Refresh Token</strong> with scope: <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">https://www.googleapis.com/auth/adwords</code>' />
            <Step n={5} text='Find your <strong>Customer ID</strong> in Google Ads top-right (format: <code style="font-family:monospace;background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:11px">XXX-XXX-XXXX</code>, enter without dashes)' />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Developer Token</label>
              <input className="form-input mono" type="password" value={brand.googleAdsDevToken || ''} onChange={(e) => updateField('googleAdsDevToken', e.target.value)} placeholder="Developer token" />
            </div>
            <div className="form-group">
              <label className="form-label">Customer ID</label>
              <input className="form-input mono" value={brand.googleAdsCustomerId || ''} onChange={(e) => updateField('googleAdsCustomerId', e.target.value)} placeholder="1234567890" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">OAuth Client ID</label>
              <input className="form-input mono" value={brand.googleAdsClientId || ''} onChange={(e) => updateField('googleAdsClientId', e.target.value)} placeholder="xxx.apps.googleusercontent.com" />
            </div>
            <div className="form-group">
              <label className="form-label">OAuth Client Secret</label>
              <input className="form-input mono" type="password" value={brand.googleAdsClientSecret || ''} onChange={(e) => updateField('googleAdsClientSecret', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Refresh Token</label>
            <input className="form-input mono" type="password" value={brand.googleAdsRefreshToken || ''} onChange={(e) => updateField('googleAdsRefreshToken', e.target.value)} placeholder="1//0g..." />
          </div>
        </div>

        {/* ── GEMINI AI ── */}
        <div className="form-card">
          <div className="form-card-title">
            🤖 AI Consultant (Gemini)
            <span className={`badge ${isConnected.ai ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.ai ? '🔑 Key Saved' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Powers the AI chat assistant with real-time brand data for consulting</div>

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
        </div>

        {/* ── TIKTOK ADS ── */}
        <div className="form-card">
          <div className="form-card-title">
            🎵 TikTok Ads
            <span className={`badge ${(brand as unknown as Record<string,string|null>).tiktokAdvertiserId ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {(brand as unknown as Record<string,string|null>).tiktokAdvertiserId ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Track TikTok Ads spend, ROAS, video views, and conversions</div>

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
        </div>

        {/* ── KLAVIYO ── */}
        <div className="form-card">
          <div className="form-card-title">
            📧 Klaviyo (Email Marketing)
            <span className={`badge ${(brand as unknown as Record<string,string|null>).klaviyoApiKey ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {(brand as unknown as Record<string,string|null>).klaviyoApiKey ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Track email revenue, open rates, click rates, flows, and subscriber growth</div>

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
        </div>

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
