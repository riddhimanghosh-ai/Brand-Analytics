'use client';

import { useState } from 'react';

interface Props {
  slug: string;
  isConnected: boolean;
  propertyId?: string | null;
  /** Passed from URL param after OAuth callback when user has multiple GA4 properties */
  pendingProperties?: { id: string; name: string }[];
  /** True when OAuth succeeded but no properties were found automatically */
  needsManualPropertyId?: boolean;
  onPropertySelected?: (propertyId: string) => void;
}

export function GA4Connect({
  slug,
  isConnected,
  propertyId,
  pendingProperties = [],
  needsManualPropertyId = false,
  onPropertySelected,
}: Props) {
  const [selecting, setSelecting] = useState(false);
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleConnect = () => {
    window.location.href = `/api/auth/ga4?slug=${encodeURIComponent(slug)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Analytics? This will remove the OAuth token from this brand.')) return;
    await fetch(`/api/brands/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ga4RefreshToken: null, ga4PropertyId: null }),
    });
    window.location.reload();
  };

  const handleSelectProperty = async (id: string) => {
    setSelecting(true);
    try {
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4PropertyId: id }),
      });
      onPropertySelected?.(id);
    } finally {
      setSelecting(false);
    }
  };

  const handleManualId = async () => {
    const clean = manualId.trim();
    if (!clean) return;
    await handleSelectProperty(clean);
  };

  // Show property picker after OAuth if multiple properties found
  if (pendingProperties.length > 1) {
    return (
      <div>
        <div style={{
          padding: '14px 16px', borderRadius: '8px',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent-blue)', marginBottom: '4px' }}>
            ✅ Google Analytics connected — select your property
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            We found {pendingProperties.length} GA4 properties. Pick the one for this brand.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingProperties.map(prop => (
            <button
              key={prop.id}
              onClick={() => handleSelectProperty(prop.id)}
              disabled={selecting}
              style={{
                padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: 'var(--bg-elevated)', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '12px',
                transition: 'border-color 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E37400'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; }}
            >
              <span style={{ fontSize: '20px' }}>📊</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{prop.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  Property ID: {prop.id}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowManual(m => !m)}
          style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Enter Property ID manually instead
        </button>
        {showManual && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <input
              className="form-input mono"
              style={{ flex: 1, margin: 0 }}
              placeholder="123456789"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
            />
            <button
              onClick={handleManualId}
              disabled={!manualId.trim() || selecting}
              className="btn btn-primary"
            >
              Save
            </button>
          </div>
        )}
      </div>
    );
  }

  // OAuth succeeded but no properties were auto-detected — ask for manual ID
  if (needsManualPropertyId && !isConnected) {
    return (
      <div>
        <div style={{
          padding: '14px 16px', borderRadius: '8px',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#f59e0b', marginBottom: '4px' }}>
            ✅ Google account connected — enter your GA4 Property ID
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We couldn&apos;t auto-detect any GA4 properties for this Google account. This usually means the
            Google account used doesn&apos;t have direct access to the GA4 property, or the property is
            in a different Google account.
            <br /><br />
            Find your Property ID in <strong>GA4 → Admin → Property Settings</strong> (it&apos;s a numeric ID like <code>123456789</code>).
            Make sure to also add this Google account as a <strong>Viewer</strong> in GA4 → Admin → Property Access Management.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input mono"
            style={{ flex: 1, margin: 0 }}
            placeholder="e.g. 123456789"
            value={manualId}
            onChange={e => setManualId(e.target.value)}
          />
          <button
            onClick={async () => {
              const clean = manualId.trim();
              if (!clean) return;
              setSelecting(true);
              try {
                await fetch(`/api/brands/${slug}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ga4PropertyId: clean }),
                });
                onPropertySelected?.(clean);
              } finally {
                setSelecting(false);
              }
            }}
            disabled={!manualId.trim() || selecting}
            className="btn btn-primary"
          >
            {selecting ? 'Saving…' : 'Save'}
          </button>
        </div>
        <button
          onClick={() => window.location.href = `/api/auth/ga4?slug=${encodeURIComponent(slug)}`}
          style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Try connecting with a different Google account
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: '8px',
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <div style={{ fontWeight: '600', color: '#22c55e', fontSize: '14px' }}>Connected</div>
            {propertyId && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                Property ID: {propertyId}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px',
            cursor: 'pointer', fontWeight: '500',
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        Click below to connect Google Analytics 4 with one click. You'll be redirected to Google to approve access — no service accounts or JSON files needed.
      </div>
      <button
        onClick={handleConnect}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '12px 24px', borderRadius: '10px', border: '1px solid #dadce0',
          background: '#fff', color: '#3c4043', fontSize: '14px', fontWeight: '600',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          transition: 'box-shadow 0.2s',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        Connect with Google Analytics
      </button>
      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-dim)' }}>
        You'll be taken to Google to approve permissions, then automatically redirected back.
      </div>
    </div>
  );
}
