export default function SocialPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>💬</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
        Social Comments
      </h1>
      <div style={{
        display: 'inline-block',
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.35)',
        borderRadius: '20px',
        padding: '4px 16px',
        fontSize: '12px',
        fontWeight: 700,
        color: '#f59e0b',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '20px',
      }}>
        Coming Soon
      </div>
      <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '420px' }}>
        Monitor Facebook &amp; Instagram comments with automatic sentiment analysis. This feature is being set up for Hira Fragrances.
      </p>
    </div>
  );
}
