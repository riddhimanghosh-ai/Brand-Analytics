'use client';

import { useState, useEffect } from 'react';

interface Anomaly {
  metric: string;
  severity: 'critical' | 'warning' | 'good';
  title: string;
  detail: string;
  changePct: number | null;
}

const SEVERITY = {
  critical: { icon: '🚨', color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', border: 'rgba(244,63,94,0.3)' },
  warning:  { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.25)' },
  good:     { icon: '🚀', color: '#22c55e', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.25)' },
} as const;

export function AnomalyWatchdog({ slug }: { slug: string }) {
  const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null);
  const [allClear, setAllClear] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/anomalies?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setFailed(true); return; }
        setAnomalies(d.anomalies ?? []);
        setAllClear(Boolean(d.allClear));
      })
      .catch(() => setFailed(true));
  }, [slug]);

  if (failed) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700 }}>🐕 Anomaly Watchdog</span>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          yesterday vs trailing baselines · refreshed on load
        </span>
      </div>

      {anomalies === null && (
        <div className="chart-card">
          <div className="skeleton skeleton-text" style={{ width: '50%' }} />
        </div>
      )}

      {anomalies !== null && allClear && anomalies.length === 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
          background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e',
        }}>
          ✅ All clear — revenue, orders, AOV, MER and refunds are all within normal ranges.
        </div>
      )}

      {anomalies !== null && anomalies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {anomalies.map((a, i) => {
            const s = SEVERITY[a.severity];
            return (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: '10px',
                background: s.bg, border: `1px solid ${s.border}`,
                display: 'flex', gap: '12px', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '18px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: s.color }}>{a.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                    {a.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
