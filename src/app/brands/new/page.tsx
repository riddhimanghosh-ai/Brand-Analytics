'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBrandPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  const [form, setForm] = useState({
    name: '',
    shopifyStoreUrl: '',
    shopifyAccessToken: '',
    ga4PropertyId: '',
    ga4ServiceAccountJson: '',
    metaAppId: '',
    metaAppSecret: '',
    metaAccessToken: '',
    metaAdAccountId: '',
    googleAdsDevToken: '',
    googleAdsClientId: '',
    googleAdsClientSecret: '',
    googleAdsRefreshToken: '',
    googleAdsCustomerId: '',
    geminiApiKey: '',
    tiktokAccessToken: '',
    tiktokAdvertiserId: '',
    klaviyoApiKey: '',
    pinterestAccessToken: '',
    pinterestAdAccountId: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const testShopify = async () => {
    if (!form.shopifyStoreUrl || !form.shopifyAccessToken) return;
    setTestResults((prev) => ({ ...prev, shopify: null }));

    try {
      // Create temp brand to test
      const res = await fetch(`/api/shopify?slug=__test__&action=test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: form.shopifyStoreUrl,
          accessToken: form.shopifyAccessToken,
        }),
      });

      // Direct test via shopify API
      const testUrl = `https://${form.shopifyStoreUrl}/admin/api/2024-10/graphql.json`;
      const testRes = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shopify',
          storeUrl: form.shopifyStoreUrl,
          accessToken: form.shopifyAccessToken,
        }),
      });

      if (testRes.ok) {
        const data = await testRes.json();
        setTestResults((prev) => ({
          ...prev,
          shopify: { success: data.success, message: data.success ? `Connected to ${data.shopName}` : data.error },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          shopify: { success: false, message: 'Connection test failed' },
        }));
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        shopify: { success: false, message: 'Connection test failed' },
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    setLoading(true);

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const brand = await res.json();
        router.push(`/dashboard/${brand.slug}`);
      } else {
        alert('Failed to create brand');
      }
    } catch {
      alert('Failed to create brand');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 6;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Back */}
      <a href="/" style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
        ← Back to Brands
      </a>

      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Add New Brand</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
        Connect your platforms to start analyzing — all connections are optional.
      </p>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: i + 1 <= step ? 'var(--accent-blue)' : 'var(--bg-elevated)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Step 1: Brand Name */}
      {step === 1 && (
        <div className="form-card">
          <div className="form-card-title">🏷️ Brand Details</div>
          <div className="form-card-desc">Give your brand a name</div>
          <div className="form-group">
            <label className="form-label">Brand Name *</label>
            <input
              className="form-input"
              placeholder="e.g. The Wandering Bean"
              value={form.name}
              onChange={(e) => {
                updateField('name', e.target.value);
                console.log('Brand name updated to:', e.target.value);
              }}
              autoFocus
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Current value: {form.name ? `"${form.name}"` : '(empty)'}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Shopify */}
      {step === 2 && (
        <div className="form-card">
          <div className="form-card-title">🛒 Shopify Connection</div>
          <div className="form-card-desc">Connect your Shopify store for order, product, and customer analytics</div>
          <div className="form-group">
            <label className="form-label">Store URL</label>
            <input
              className="form-input mono"
              placeholder="your-store.myshopify.com"
              value={form.shopifyStoreUrl}
              onChange={(e) => updateField('shopifyStoreUrl', e.target.value)}
            />
            <div className="form-hint">Your .myshopify.com domain</div>
          </div>
          <div className="form-group">
            <label className="form-label">Admin API Access Token</label>
            <input
              className="form-input mono"
              type="password"
              placeholder="shpat_..."
              value={form.shopifyAccessToken}
              onChange={(e) => updateField('shopifyAccessToken', e.target.value)}
            />
            <div className="form-hint">From Shopify Admin → Settings → Apps → Develop apps</div>
          </div>
          {form.shopifyStoreUrl && form.shopifyAccessToken && (
            <div>
              <button onClick={testShopify} className="test-connection-btn">
                🔌 Test Connection
              </button>
              {testResults.shopify && (
                <div className={`test-result ${testResults.shopify.success ? 'success' : 'error'}`}>
                  {testResults.shopify.success ? '✅' : '❌'} {testResults.shopify.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Google Analytics */}
      {step === 3 && (
        <div className="form-card">
          <div className="form-card-title">📊 Google Analytics</div>
          <div className="form-card-desc">Connect GA4 for traffic, session, and conversion analytics</div>
          <div className="form-group">
            <label className="form-label">GA4 Property ID</label>
            <input
              className="form-input mono"
              placeholder="123456789"
              value={form.ga4PropertyId}
              onChange={(e) => updateField('ga4PropertyId', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Service Account JSON</label>
            <textarea
              className="form-input mono"
              placeholder='Paste your service account JSON key here...'
              value={form.ga4ServiceAccountJson}
              onChange={(e) => updateField('ga4ServiceAccountJson', e.target.value)}
              rows={6}
            />
          </div>
        </div>
      )}

      {/* Step 4: Meta Ads */}
      {step === 4 && (
        <div className="form-card">
          <div className="form-card-title">📱 Meta Ads</div>
          <div className="form-card-desc">Connect Facebook & Instagram ads for campaign analytics</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">App ID</label>
              <input className="form-input mono" placeholder="App ID" value={form.metaAppId} onChange={(e) => updateField('metaAppId', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">App Secret</label>
              <input className="form-input mono" type="password" placeholder="App Secret" value={form.metaAppSecret} onChange={(e) => updateField('metaAppSecret', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Access Token</label>
            <input className="form-input mono" type="password" placeholder="Access Token" value={form.metaAccessToken} onChange={(e) => updateField('metaAccessToken', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ad Account ID</label>
            <input className="form-input mono" placeholder="act_..." value={form.metaAdAccountId} onChange={(e) => updateField('metaAdAccountId', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 5: Google Ads */}
      {step === 5 && (
        <div className="form-card">
          <div className="form-card-title">🎯 Google Ads</div>
          <div className="form-card-desc">Connect Google Ads for search and display campaign data</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Developer Token</label>
              <input className="form-input mono" type="password" value={form.googleAdsDevToken} onChange={(e) => updateField('googleAdsDevToken', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer ID</label>
              <input className="form-input mono" placeholder="123-456-7890" value={form.googleAdsCustomerId} onChange={(e) => updateField('googleAdsCustomerId', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client ID</label>
              <input className="form-input mono" value={form.googleAdsClientId} onChange={(e) => updateField('googleAdsClientId', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input className="form-input mono" type="password" value={form.googleAdsClientSecret} onChange={(e) => updateField('googleAdsClientSecret', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Refresh Token</label>
            <input className="form-input mono" type="password" value={form.googleAdsRefreshToken} onChange={(e) => updateField('googleAdsRefreshToken', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 6: AI */}
      {step === 6 && (
        <div className="form-card">
          <div className="form-card-title">🤖 AI Assistant</div>
          <div className="form-card-desc">Add a Gemini API key for AI-powered insights and consulting chat</div>
          <div className="form-group">
            <label className="form-label">Gemini API Key</label>
            <input
              className="form-input mono"
              type="password"
              placeholder="AIza..."
              value={form.geminiApiKey}
              onChange={(e) => updateField('geminiApiKey', e.target.value)}
            />
            <div className="form-hint">
              Get one free at{' '}
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
                Google AI Studio
              </a>
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
            <div>Brand name in form: {form.name ? `"${form.name}"` : '(empty)'}</div>
            <div>Button disabled: {loading || !form.name ? 'YES' : 'NO'}</div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {step < totalSteps && (
            <button
              className="btn btn-ghost"
              onClick={() => setStep((s) => s + 1)}
            >
              Skip
            </button>
          )}

          {step < totalSteps ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (step === 1 && !form.name) return;
                setStep((s) => s + 1);
              }}
              disabled={step === 1 && !form.name}
            >
              Continue →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || !form.name}
            >
              {loading ? 'Creating...' : '🚀 Create Brand'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
