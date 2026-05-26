'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Scoped users (e.g. hira) go straight to their brand dashboard; admins go to brands list
        router.push(data.redirectTo || '/');
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink:         #0A0A0A;
          --ink-2:       #1A1A1A;
          --muted:       #5C6066;
          --muted-2:     #8A8F96;
          --rule:        #E5E5E5;
          --rule-2:      #F0F0F0;
          --paper:       #FFFFFF;
          --paper-2:     #FAFAF8;
          --paper-3:     #F4F4F1;
          --accent:      #1E6FFF;
          --accent-soft: #E8F0FF;
          --warn:        #C0392B;
          --ok:          #0A7C53;
          --f-display:   'Inter Tight', -apple-system, sans-serif;
          --f-serif:     'Source Serif 4', Georgia, serif;
          --f-mono:      'JetBrains Mono', monospace;
        }

        body {
          font-family: var(--f-display);
          background: var(--paper);
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .login-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 440px;
        }

        /* LEFT PANEL */
        .login-left {
          background: var(--paper-2);
          border-right: 1px solid var(--rule);
          display: flex;
          flex-direction: column;
          padding: 64px;
        }

        .brand-mark {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 96px;
        }

        .brand-mark-box {
          width: 36px;
          height: 36px;
          border: 1px solid var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--f-mono);
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          letter-spacing: 0.05em;
        }

        .brand-mark-name {
          font-family: var(--f-mono);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .hero-eyebrow {
          font-family: var(--f-mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 24px;
        }

        .hero-headline {
          font-family: var(--f-display);
          font-size: 40px;
          font-weight: 500;
          letter-spacing: -0.025em;
          line-height: 1.1;
          color: var(--ink);
          margin-bottom: 24px;
        }

        .hero-headline em {
          font-family: var(--f-serif);
          font-style: italic;
          color: var(--accent);
          font-weight: 400;
        }

        .hero-body {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.65;
          max-width: 440px;
          margin-bottom: 64px;
        }

        /* Stat row */
        .stat-row {
          display: flex;
          gap: 0;
          border-top: 1px solid var(--ink);
          padding-top: 32px;
          margin-top: auto;
        }

        .stat-cell {
          flex: 1;
          padding-right: 32px;
          border-right: 1px solid var(--rule);
          margin-right: 32px;
        }

        .stat-cell:last-child {
          border-right: none;
          margin-right: 0;
          padding-right: 0;
        }

        .stat-val {
          font-family: var(--f-display);
          font-size: 48px;
          font-weight: 400;
          letter-spacing: -0.035em;
          color: var(--ink);
          font-feature-settings: "tnum";
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-val span {
          color: var(--accent);
        }

        .stat-label {
          font-family: var(--f-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }

        /* RIGHT PANEL — login form */
        .login-right {
          background: var(--paper);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 48px;
          border-left: 1px solid var(--rule);
        }

        .form-eyebrow {
          font-family: var(--f-mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 16px;
        }

        .form-heading {
          font-family: var(--f-display);
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin-bottom: 8px;
        }

        .form-subhead {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 40px;
          line-height: 1.5;
        }

        .field-label {
          display: block;
          font-family: var(--f-mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .field-input {
          display: block;
          width: 100%;
          padding: 12px 0;
          font-family: var(--f-display);
          font-size: 15px;
          color: var(--ink);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--rule);
          outline: none;
          transition: border-color 150ms ease;
          margin-bottom: 32px;
        }

        .field-input:focus {
          border-bottom-color: var(--accent);
        }

        .field-input::placeholder {
          color: var(--muted-2);
        }

        .submit-btn {
          width: 100%;
          padding: 14px 24px;
          background: var(--ink);
          color: var(--paper);
          border: 1px solid var(--ink);
          font-family: var(--f-display);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
          margin-bottom: 24px;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--accent);
          border-color: var(--accent);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-bar {
          padding: 12px 16px;
          border-left: 2px solid var(--warn);
          background: #fdf2f2;
          font-size: 13px;
          color: var(--warn);
          margin-bottom: 24px;
        }

        .login-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid var(--rule-2);
          font-family: var(--f-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted-2);
        }

        @media (max-width: 768px) {
          .login-wrap { grid-template-columns: 1fr; }
          .login-left { display: none; }
          .login-right { padding: 48px 32px; }
        }
      `}</style>

      <div className="login-wrap">

        {/* LEFT */}
        <div className="login-left">
          <div className="brand-mark">
            <div className="brand-mark-box">HF</div>
            <div className="brand-mark-name">Hira Fragrances</div>
          </div>

          <div className="hero-eyebrow">Analytics Intelligence</div>

          <h1 className="hero-headline">
            Every metric that<br />
            <em>moves the needle</em>,<br />
            in one place.
          </h1>

          <p className="hero-body">
            Shopify revenue, Meta and Google ad performance, customer cohorts,
            revenue forecasting — unified into a single command centre built
            for the Hira Fragrances team.
          </p>

          <div className="stat-row">
            {[
              { val: '8', unit: '+', label: 'Platforms' },
              { val: '40', unit: '+', label: 'Metrics' },
              { val: 'AI', unit: '', label: 'Insights' },
              { val: 'Live', unit: '', label: 'Data' },
            ].map((s) => (
              <div className="stat-cell" key={s.label}>
                <div className="stat-val">{s.val}<span>{s.unit}</span></div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <div className="form-eyebrow">Secure access</div>
          <h2 className="form-heading">Sign in</h2>
          <p className="form-subhead">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleLogin}>
            <label className="field-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="field-input"
              type="text"
              placeholder="your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />

            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="field-input"
              type="password"
              placeholder="your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div className="error-bar">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="login-footer">
            Private — Hira Fragrances internal use only
          </div>
        </div>

      </div>
    </>
  );
}
