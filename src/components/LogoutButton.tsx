'use client';

interface LogoutButtonProps {
  /** "sidebar" (dark theme nav-link) or "header" (light theme small button) */
  variant?: 'sidebar' | 'header';
}

export function LogoutButton({ variant = 'sidebar' }: LogoutButtonProps) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } finally {
      window.location.href = '/login';
    }
  };

  if (variant === 'header') {
    return (
      <button
        onClick={handleLogout}
        style={{
          marginLeft: 'auto',
          padding: '6px 14px',
          background: 'transparent',
          border: '1px solid #e5e5e5',
          borderRadius: '4px',
          fontFamily: 'var(--f-mono, monospace)',
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#5c6066',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a0a0a'; e.currentTarget.style.color = '#0a0a0a'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.color = '#5c6066'; }}
      >
        ← Sign out
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="nav-link"
      style={{
        background: 'none',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--text-muted)',
      }}
    >
      ← Sign out
    </button>
  );
}
