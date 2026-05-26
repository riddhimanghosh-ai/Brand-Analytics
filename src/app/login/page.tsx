'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: '🛒',
    title: 'Shopify Analytics',
    desc: 'Revenue, orders, AOV, customers, top products, funnels & cohort analysis — all in one view.',
  },
  {
    icon: '📊',
    title: 'Google Analytics 4',
    desc: 'Sessions, users, bounce rate, traffic sources and conversion tracking across your store.',
  },
  {
    icon: '📱',
    title: 'Meta & Google Ads',
    desc: 'Ad spend, ROAS, CPM, CTR and campaign breakdowns for Facebook, Instagram & Google.',
  },
  {
    icon: '📈',
    title: 'Revenue Forecasting',
    desc: 'ML-powered 30/60/90-day revenue and order predictions with confidence bands.',
  },
  {
    icon: '🤖',
    title: 'AI Consultant',
    desc: 'Chat with an AI that knows your brand data — get actionable insights instantly.',
  },
  {
    icon: '🎯',
    title: 'CRO Optimization',
    desc: 'Conversion rate, cart abandonment, LTV, RFM segmentation and growth benchmarks.',
  },
  {
    icon: '💬',
    title: 'Social Comments',
    desc: 'Monitor Facebook & Instagram comments with automatic sentiment analysis.',
  },
  {
    icon: '🎛️',
    title: 'Custom Dashboard',
    desc: 'Drag-and-drop your own metric widgets from any platform into one personalised view.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        redirect: 'manual',
      });

      if (res.ok || res.status === 307 || res.status === 308 || res.type === 'opaqueredirect') {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Top Nav */}
      <div style={{
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: '36px', height: '36px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: '700', color: 'white',
        }}>B</div>
        <div>
          <div style={{
            fontSize: '16px', fontWeight: '700',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Hira Fragrances</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Analytics Dashboard</div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        minHeight: 0,
      }}>

        {/* LEFT — Description */}
        <div style={{
          flex: 1,
          padding: '60px 56px',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
        }}>

          {/* Hero */}
          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '12px',
              color: '#3b82f6',
              fontWeight: '600',
              marginBottom: '20px',
              letterSpacing: '0.05em',
            }}>MULTI-PLATFORM E-COMMERCE ANALYTICS</div>

            <h1 style={{
              fontSize: '36px',
              fontWeight: '800',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}>
              All your brand data.<br />
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>One smart dashboard.</span>
            </h1>

            <p style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              lineHeight: '1.7',
              maxWidth: '480px',
            }}>
              Brand Analytics connects your Shopify store, ad platforms, and analytics tools into a single command centre — so you can make faster, smarter decisions without switching between 10 different tabs.
            </p>
          </div>

          {/* Feature Grid */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: '20px',
              textTransform: 'uppercase',
            }}>What's inside</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}>
              {features.map((f) => (
                <div key={f.title} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{f.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            gap: '32px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border)',
          }}>
            {[
              { val: '8+', label: 'Platforms connected' },
              { val: '30+', label: 'Metrics tracked' },
              { val: 'AI', label: 'Powered insights' },
              { val: 'Live', label: 'Real-time data' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{
                  fontSize: '22px', fontWeight: '800',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>{s.val}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT — Login Form */}
        <div style={{
          width: '420px',
          flexShrink: 0,
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Welcome back</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sign in to access your brand dashboard</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#ef4444',
              }}>
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: '8px', padding: '12px', fontSize: '14px', fontWeight: '600' }}
            >
              {loading ? 'Signing in...' : '→ Sign In'}
            </button>

          </form>

          <div style={{
            marginTop: '40px',
            padding: '16px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
          }}>
            🔒 This tool is private and intended for internal use by the Devx Labs team only.
          </div>

        </div>
      </div>
    </div>
  );
}
