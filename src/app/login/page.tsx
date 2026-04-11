'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        throw new Error('Login failed');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Failed to login. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '700',
            color: 'white',
            margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
          }}>B</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Brand Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Sign in to access your stores
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text-primary)',
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !username.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginTop: '20px',
        }}>
          Don't have an account? Just enter a new username above to create one.
        </p>
      </div>
    </div>
  );
}
