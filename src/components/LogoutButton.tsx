'use client';

export function LogoutButton() {
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
