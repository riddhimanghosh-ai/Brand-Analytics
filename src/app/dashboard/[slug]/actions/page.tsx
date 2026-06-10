'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ActionItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'opportunity';
  title: string;
  detail: string;
  impact: string | null;
  href: string;
  source: string;
}

interface ActionsData {
  actions: ActionItem[];
  generatedAt: string;
  sources: Record<string, boolean>;
}

const SEVERITY_META = {
  critical:    { label: 'Critical',    icon: '🚨', color: '#f43f5e', bg: 'rgba(244,63,94,0.06)',  border: 'rgba(244,63,94,0.3)' },
  high:        { label: 'High',        icon: '🔥', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.25)' },
  medium:      { label: 'Medium',      icon: '🟡', color: '#eab308', bg: 'rgba(234,179,8,0.04)',  border: 'rgba(234,179,8,0.2)' },
  opportunity: { label: 'Opportunity', icon: '💡', color: '#22c55e', bg: 'rgba(34,197,94,0.04)',  border: 'rgba(34,197,94,0.2)' },
} as const;

export default function ActionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState<ActionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/actions?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const counts = data
    ? {
        critical: data.actions.filter(a => a.severity === 'critical').length,
        high: data.actions.filter(a => a.severity === 'high').length,
        medium: data.actions.filter(a => a.severity === 'medium').length,
        opportunity: data.actions.filter(a => a.severity === 'opportunity').length,
      }
    : null;

  const offSources = data ? Object.entries(data.sources).filter(([, ok]) => !ok).map(([k]) => k) : [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              ⚡ Action Center
            </h2>
            <p>Everything that needs a decision today — ranked by urgency, with the numbers behind it</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: loading ? 'wait' : 'pointer', fontSize: '13px' }}
          >
            {loading ? '⏳ Analysing…' : '🔄 Re-analyse'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Pulling revenue, ads, inventory, customer and creative data…
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="chart-card">
                <div className="skeleton skeleton-text" style={{ width: '45%', height: '18px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '90%' }} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: '24px' }}>
            ❌ {error}
          </div>
        )}

        {data && counts && !loading && (
          <>
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(Object.keys(SEVERITY_META) as Array<keyof typeof SEVERITY_META>).map(s => (
                <span key={s} style={{ fontSize: '13px', color: counts[s] > 0 ? SEVERITY_META[s].color : 'var(--text-dim)', fontWeight: counts[s] > 0 ? 700 : 400 }}>
                  {SEVERITY_META[s].icon} {counts[s]} {SEVERITY_META[s].label.toLowerCase()}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>
                Generated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {offSources.length > 0 && <> · sources unavailable: {offSources.join(', ')}</>}
              </span>
            </div>

            {/* All clear */}
            {data.actions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏖️</div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Nothing urgent</div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                  No critical issues or clear opportunities detected across ads, inventory, customers, and goals.
                </div>
              </div>
            )}

            {/* Action queue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.actions.map(a => {
                const meta = SEVERITY_META[a.severity];
                return (
                  <div
                    key={a.id}
                    className="chart-card"
                    style={{ background: meta.bg, borderColor: meta.border }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '22px', lineHeight: 1.2 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px' }}>{a.title}</span>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                            padding: '2px 8px', borderRadius: '10px', background: `${meta.color}18`, color: meta.color,
                          }}>{meta.label}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {a.source}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                          {a.detail}
                        </div>
                        {a.impact && (
                          <div style={{ fontSize: '12px', fontWeight: 700, color: meta.color, marginTop: '6px' }}>
                            💰 {a.impact}
                          </div>
                        )}
                      </div>
                      <Link
                        href={a.href}
                        className="btn btn-sm"
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)', whiteSpace: 'nowrap', alignSelf: 'center',
                        }}
                      >
                        Act on this →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '20px', lineHeight: 1.6 }}>
              Rules check: blended MER vs break-even · campaign winners/losers · creative fatigue · monthly goal pace ·
              stock-outs &amp; dead stock · surging products · winback segments · discount burden.
              Impact figures are directional estimates, not forecasts.
            </div>
          </>
        )}
      </div>
    </>
  );
}
