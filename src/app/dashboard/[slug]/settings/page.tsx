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
}

export default function SettingsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [params, setParams] = useState<{ slug: string } | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    paramsPromise.then(setParams);
  }, [paramsPromise]);

  useEffect(() => {
    if (!params) return;
    // Fetch brands list to find the id, then fetch the full brand by id
    fetch(`/api/brands`)
      .then(r => r.json())
      .then((brands: { slug: string; id: string }[]) => {
        const found = brands.find((b) => b.slug === params.slug);
        if (found) {
          return fetch(`/api/brands/${found.id}`).then(r => r.json());
        }
        throw new Error('Brand not found');
      })
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
    if (!brand) return;
    setSaving(true);
    setSaved(false);
    try {
      // Filter out masked values (don't send back masked tokens)
      const payload = { ...brand };
      for (const key of Object.keys(payload) as (keyof BrandData)[]) {
        const val = payload[key] as string | null;
        if (typeof val === 'string' && val.includes('••••')) {
          (payload as Record<string, string | null>)[key] = null; // Don't overwrite with masked value
        }
      }
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
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
    shopify: !!(brand.shopifyStoreUrl),
    ga4: !!brand.ga4PropertyId,
    meta: !!brand.metaAccessToken,
    googleAds: !!(brand.googleAdsCustomerId),
    ai: !!(brand.geminiApiKey),
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>⚙️ Connection Settings</h2>
            <p>Manage API connections for <strong>{brand.name}</strong></p>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Shopify */}
        <div className="form-card">
          <div className="form-card-title">
            🛒 Shopify
            <span className={`badge ${isConnected.shopify ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.shopify ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Order, product, and customer analytics from your Shopify Admin API</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Store URL</label>
              <input
                className="form-input mono"
                value={brand.shopifyStoreUrl || ''}
                onChange={(e) => updateField('shopifyStoreUrl', e.target.value)}
                placeholder="your-store.myshopify.com"
              />
              <div className="form-hint">Your .myshopify.com domain (without https://)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Admin API Access Token</label>
              <input
                className="form-input mono"
                type="password"
                value={brand.shopifyAccessToken || ''}
                onChange={(e) => updateField('shopifyAccessToken', e.target.value)}
                placeholder="shpat_..."
              />
              <div className="form-hint">
                Shopify Admin → Settings → Apps → Develop apps
              </div>
            </div>
          </div>
          {brand.shopifyStoreUrl && (
            <div>
              <button
                onClick={testShopify}
                className="test-connection-btn"
                disabled={testing.shopify}
              >
                {testing.shopify ? '⏳ Testing...' : '🔌 Test Connection'}
              </button>
              {testResults.shopify && (
                <div className={`test-result ${testResults.shopify.success ? 'success' : 'error'}`}>
                  {testResults.shopify.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Google Analytics */}
        <div className="form-card">
          <div className="form-card-title">
            📈 Google Analytics (GA4)
            <span className={`badge ${isConnected.ga4 ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.ga4 ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Traffic sources, sessions, bounce rates, and conversion funnel data</div>
          <div className="form-group">
            <label className="form-label">GA4 Property ID</label>
            <input
              className="form-input mono"
              value={brand.ga4PropertyId || ''}
              onChange={(e) => updateField('ga4PropertyId', e.target.value)}
              placeholder="123456789"
            />
            <div className="form-hint">Found in Google Analytics Admin → Property Settings</div>
          </div>
          <div className="form-group">
            <label className="form-label">Service Account JSON</label>
            <textarea
              className="form-input mono"
              rows={5}
              value={brand.ga4ServiceAccountJson || ''}
              onChange={(e) => updateField('ga4ServiceAccountJson', e.target.value)}
              placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
            />
            <div className="form-hint">Create a service account in Google Cloud Console with GA4 Viewer role</div>
          </div>
        </div>

        {/* Meta Ads */}
        <div className="form-card">
          <div className="form-card-title">
            📱 Meta Ads (Facebook & Instagram)
            <span className={`badge ${isConnected.meta ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.meta ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Facebook and Instagram ad campaign performance, ROAS and spend analytics</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">App ID</label>
              <input
                className="form-input mono"
                value={brand.metaAppId || ''}
                onChange={(e) => updateField('metaAppId', e.target.value)}
                placeholder="App ID from Meta Developer Console"
              />
            </div>
            <div className="form-group">
              <label className="form-label">App Secret</label>
              <input
                className="form-input mono"
                type="password"
                value={brand.metaAppSecret || ''}
                onChange={(e) => updateField('metaAppSecret', e.target.value)}
                placeholder="App Secret"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Access Token</label>
              <input
                className="form-input mono"
                type="password"
                value={brand.metaAccessToken || ''}
                onChange={(e) => updateField('metaAccessToken', e.target.value)}
                placeholder="Long-lived page access token"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ad Account ID</label>
              <input
                className="form-input mono"
                value={brand.metaAdAccountId || ''}
                onChange={(e) => updateField('metaAdAccountId', e.target.value)}
                placeholder="act_123456789"
              />
            </div>
          </div>
        </div>

        {/* Google Ads */}
        <div className="form-card">
          <div className="form-card-title">
            🎯 Google Ads
            <span className={`badge ${isConnected.googleAds ? 'green' : 'gray'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.googleAds ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="form-card-desc">Search, Shopping and Display campaign performance and ROAS</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Developer Token</label>
              <input
                className="form-input mono"
                type="password"
                value={brand.googleAdsDevToken || ''}
                onChange={(e) => updateField('googleAdsDevToken', e.target.value)}
                placeholder="Developer token from Google Ads API Center"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Customer ID</label>
              <input
                className="form-input mono"
                value={brand.googleAdsCustomerId || ''}
                onChange={(e) => updateField('googleAdsCustomerId', e.target.value)}
                placeholder="123-456-7890"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">OAuth Client ID</label>
              <input
                className="form-input mono"
                value={brand.googleAdsClientId || ''}
                onChange={(e) => updateField('googleAdsClientId', e.target.value)}
                placeholder="xxx.apps.googleusercontent.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">OAuth Client Secret</label>
              <input
                className="form-input mono"
                type="password"
                value={brand.googleAdsClientSecret || ''}
                onChange={(e) => updateField('googleAdsClientSecret', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Refresh Token</label>
            <input
              className="form-input mono"
              type="password"
              value={brand.googleAdsRefreshToken || ''}
              onChange={(e) => updateField('googleAdsRefreshToken', e.target.value)}
              placeholder="OAuth refresh token"
            />
          </div>
        </div>

        {/* AI Assistant */}
        <div className="form-card">
          <div className="form-card-title">
            🤖 AI Consultant (Gemini)
            <span className={`badge ${isConnected.ai ? 'green' : 'violet'}`} style={{ marginLeft: '8px', fontSize: '11px' }}>
              {isConnected.ai ? 'Custom Key' : 'Using Global Key'}
            </span>
          </div>
          <div className="form-card-desc">
            Gemini-powered AI chatbot with real-time Shopify data context for CRO consulting
          </div>
          <div className="form-group">
            <label className="form-label">Gemini API Key (optional)</label>
            <input
              className="form-input mono"
              type="password"
              value={brand.geminiApiKey || ''}
              onChange={(e) => updateField('geminiApiKey', e.target.value)}
              placeholder="AIza... (leave blank to use global key from .env)"
            />
            <div className="form-hint">
              Get a free key at{' '}
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
                Google AI Studio →
              </a>
              {' '}| Or set GEMINI_API_KEY in your .env file to share across all brands
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save All Changes'}
          </button>
          {saved && (
            <span style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>
              Changes saved successfully
            </span>
          )}
        </div>
      </div>
    </>
  );
}
