'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <form onSubmit={handleSignup} style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '10px',
          color: 'var(--text-primary)',
        }}>
          Brand Analytics
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginBottom: '30px',
        }}>
          Create your account
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            color: '#ef4444',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
          }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
            disabled={loading}
            required
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--accent-blue)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '16px',
          }}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          Already have an account?{' '}
          <Link href="/login" style={{
            color: 'var(--accent-blue)',
            textDecoration: 'none',
            fontWeight: '500',
          }}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
