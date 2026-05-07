export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 32px', animation: 'pulse 1.5s ease-in-out infinite' }}>
      {/* Page header skeleton */}
      <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
        <div style={{ height: '26px', width: '220px', borderRadius: '6px', background: 'var(--bg-elevated)', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '160px', borderRadius: '4px', background: 'var(--bg-elevated)' }} />
      </div>

      {/* KPI cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ height: '12px', width: '80px', borderRadius: '4px', background: 'var(--bg-elevated)' }} />
            <div style={{ height: '32px', width: '120px', borderRadius: '6px', background: 'var(--bg-elevated)' }} />
            <div style={{ height: '10px', width: '60px', borderRadius: '4px', background: 'var(--bg-elevated)' }} />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '14px',
        padding: '20px',
        height: '260px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ height: '16px', width: '140px', borderRadius: '4px', background: 'var(--bg-elevated)' }} />
        <div style={{ flex: 1, borderRadius: '8px', background: 'var(--bg-elevated)' }} />
      </div>

      {/* Two chart skeletons row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[1, 2].map(i => (
          <div key={i} style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            padding: '20px',
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--bg-elevated)' }} />
            <div style={{ flex: 1, borderRadius: '8px', background: 'var(--bg-elevated)' }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
