'use client';

import { useState, useEffect } from 'react';

interface Props {
  slug: string;
  isConnected: boolean;
  adAccountId?: string | null;
  /** Passed from URL param after OAuth callback when user has multiple ad accounts */
  pendingAccounts?: { id: string; name: string }[];
  onAccountSelected?: (accountId: string) => void;
}

export function MetaConnect({
  slug,
  isConnected,
  adAccountId,
  pendingAccounts = [],
  onAccountSelected,
}: Props) {
  const [selecting, setSelecting] = useState(false);

  const handleConnect = () => {
    window.location.href = `/api/auth/meta?slug=${encodeURIComponent(slug)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Meta Ads? This will remove the access token from this brand.')) return;
    await fetch(`/api/brands/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaAccessToken: null, metaAdAccountId: null, metaAppId: null, metaAppSecret: null }),
    });
    window.location.reload();
  };

  const handleSelectAccount = async (accountId: string) => {
    setSelecting(true);
    try {
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaAdAccountId: accountId }),
      });
      onAccountSelected?.(accountId);
    } finally {
      setSelecting(false);
    }
  };

  // Show ad account picker after OAuth if multiple accounts
  if (pendingAccounts.length > 1) {
    return (
      <div>
        <div style={{
          padding: '14px 16px', borderRadius: '8px',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent-blue)', marginBottom: '4px' }}>
            ✅ Meta connected — select your Ad Account
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            We found {pendingAccounts.length} active ad accounts on your Meta account. Pick the one for this brand.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingAccounts.map(account => (
            <button
              key={account.id}
              onClick={() => handleSelectAccount(account.id)}
              disabled={selecting}
              style={{
                padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: 'var(--bg-elevated)', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '12px',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-blue)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; }}
            >
              <span style={{ fontSize: '20px' }}>📊</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{account.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{account.id}</div>
              </div>
            </button>
          ))}
        </div>
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
            {adAccountId && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                Ad Account: {adAccountId}
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
        Click below to connect your Meta Ads account. You'll be redirected to Facebook to approve access — no manual API keys needed.
      </div>
      <button
        onClick={handleConnect}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '12px 24px', borderRadius: '10px', border: 'none',
          background: 'linear-gradient(135deg, #1877F2 0%, #0E5EC8 100%)',
          color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(24,119,242,0.4)',
          transition: 'box-shadow 0.2s, transform 0.1s',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(24,119,242,0.5)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(24,119,242,0.4)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Connect with Meta
      </button>
      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-dim)' }}>
        You'll be taken to Facebook to approve permissions, then automatically redirected back.
      </div>
    </div>
  );
}
