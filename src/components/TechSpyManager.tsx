'use client';

import { useState } from 'react';
import type { TrackedWebsite, DetectedTech } from '@/types';

interface Props {
  slug: string;
  initialWebsites: TrackedWebsite[];
}

const CATEGORY_META: Record<DetectedTech['category'], { label: string; color: string }> = {
  platform:    { label: 'Platform',       color: '#6366f1' },
  analytics:   { label: 'Analytics',      color: '#3b82f6' },
  ads:         { label: 'Ad Pixels',      color: '#f59e0b' },
  shopify_app: { label: 'Shopify Apps',   color: '#22c55e' },
  chat:        { label: 'Chat / Support', color: '#06b6d4' },
  payment:     { label: 'Payment',        color: '#ec4899' },
  other:       { label: 'Other',          color: '#6b7280' },
};

const CATEGORY_ORDER: DetectedTech['category'][] = [
  'platform', 'analytics', 'ads', 'shopify_app', 'chat', 'payment', 'other',
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TechSpyManager({ slug, initialWebsites }: Props) {
  const [websites, setWebsites] = useState<TrackedWebsite[]>(initialWebsites);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function persist(updated: TrackedWebsite[]) {
    setSaving(true);
    try {
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackedWebsites: updated }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function scan(url: string): Promise<DetectedTech[]> {
    const res = await fetch(`/api/tech-spy?url=${encodeURIComponent(url)}`);
    const data = await res.json() as { tech?: DetectedTech[]; error?: string };
    if (data.error && !data.tech?.length) throw new Error(data.error);
    return data.tech ?? [];
  }

  async function handleAdd() {
    const rawUrl = urlInput.trim();
    if (!rawUrl) return;
    setError('');

    let url = rawUrl;
    if (!url.startsWith('http')) url = 'https://' + url;

    let hostname = rawUrl;
    try { hostname = new URL(url).hostname; } catch { /* keep raw */ }

    const newSite: TrackedWebsite = {
      id: Date.now().toString(),
      url,
      name: nameInput.trim() || hostname,
      addedAt: new Date().toISOString(),
    };

    const withNew = [...websites, newSite];
    setWebsites(withNew);
    setUrlInput('');
    setNameInput('');
    setScanningId(newSite.id);

    try {
      const tech = await scan(url);
      const updated = withNew.map(w =>
        w.id === newSite.id ? { ...w, tech, lastScanned: new Date().toISOString() } : w
      );
      setWebsites(updated);
      await persist(updated);
    } catch (err) {
      setError((err as Error).message);
      // Still persist without tech
      await persist(withNew);
    } finally {
      setScanningId(null);
    }
  }

  async function handleRescan(id: string) {
    const site = websites.find(w => w.id === id);
    if (!site) return;
    setError('');
    setScanningId(id);

    try {
      const tech = await scan(site.url);
      const updated = websites.map(w =>
        w.id === id ? { ...w, tech, lastScanned: new Date().toISOString() } : w
      );
      setWebsites(updated);
      await persist(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanningId(null);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeleteConfirm(null);
    const updated = websites.filter(w => w.id !== id);
    setWebsites(updated);
    await persist(updated);
  }

  return (
    <div style={{ maxWidth: 900 }}>

      {/* ── Input row ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !scanningId && handleAdd()}
          placeholder="https://competitor.com"
          style={{
            flex: '1 1 240px',
            padding: '9px 12px',
            fontFamily: 'var(--f-mono)',
            fontSize: 12,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          placeholder="Label (optional)"
          style={{
            width: 160,
            padding: '9px 12px',
            fontFamily: 'var(--f-mono)',
            fontSize: 12,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!urlInput.trim() || !!scanningId}
          style={{
            padding: '9px 18px',
            background: !urlInput.trim() || scanningId ? 'var(--paper-2)' : 'var(--accent)',
            color: !urlInput.trim() || scanningId ? 'var(--muted)' : '#fff',
            border: 'none',
            borderRadius: 6,
            fontFamily: 'var(--f-mono)',
            fontSize: 12,
            fontWeight: 600,
            cursor: !urlInput.trim() || scanningId ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {scanningId ? 'Scanning…' : '+ Add & Scan'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 6,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--warn)', fontFamily: 'var(--f-mono)', fontSize: 11,
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {websites.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          border: '1px dashed var(--rule)', borderRadius: 8,
          color: 'var(--muted)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.05em' }}>
            ADD A WEBSITE TO DETECT ITS TECH STACK
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted-2)' }}>
            Discover what Shopify apps, analytics tools, and ad pixels your competitors use
          </div>
        </div>
      )}

      {/* ── Website cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {websites.map(site => {
          const isScanning = scanningId === site.id;
          const grouped = CATEGORY_ORDER
            .map(cat => ({
              cat,
              techs: (site.tech ?? []).filter(t => t.category === cat),
            }))
            .filter(g => g.techs.length > 0);

          return (
            <div
              key={site.id}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: '16px 18px',
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--f-display)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: 2,
                  }}>
                    {site.name || new URL(site.url).hostname}
                  </div>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      color: 'var(--muted)',
                      textDecoration: 'none',
                    }}
                  >
                    {site.url}
                  </a>
                  {site.lastScanned && (
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--muted-2)', marginTop: 3 }}>
                      Last scanned: {relativeTime(site.lastScanned)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleRescan(site.id)}
                    disabled={!!scanningId}
                    title="Rescan"
                    style={{
                      padding: '5px 10px',
                      background: 'var(--paper-2)',
                      border: '1px solid var(--rule)',
                      borderRadius: 5,
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: scanningId ? 'var(--muted-2)' : 'var(--text-secondary)',
                      cursor: scanningId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isScanning ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                        Scanning
                      </span>
                    ) : '↻ Rescan'}
                  </button>
                  <button
                    onClick={() => handleDelete(site.id)}
                    title={deleteConfirm === site.id ? 'Click again to confirm' : 'Delete'}
                    style={{
                      padding: '5px 10px',
                      background: deleteConfirm === site.id ? 'rgba(239,68,68,0.1)' : 'var(--paper-2)',
                      border: `1px solid ${deleteConfirm === site.id ? 'rgba(239,68,68,0.3)' : 'var(--rule)'}`,
                      borderRadius: 5,
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: deleteConfirm === site.id ? 'var(--warn)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {deleteConfirm === site.id ? 'Confirm?' : '✕'}
                  </button>
                </div>
              </div>

              {/* Scanning state */}
              {isScanning && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 0',
                  fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted)',
                }}>
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  Scanning {site.url}…
                </div>
              )}

              {/* Tech badges */}
              {!isScanning && grouped.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {grouped.map(({ cat, techs }) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <div key={cat}>
                        <div style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          marginBottom: 5,
                        }}>
                          {meta.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {techs.map(t => (
                            <span
                              key={t.name}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 600,
                                fontFamily: 'var(--f-mono)',
                                background: `${meta.color}18`,
                                border: `1px solid ${meta.color}35`,
                                color: meta.color,
                                opacity: t.confidence === 'medium' ? 0.75 : 1,
                              }}
                            >
                              {t.icon} {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No tech detected */}
              {!isScanning && site.lastScanned && grouped.length === 0 && (
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted-2)',
                  fontStyle: 'italic',
                }}>
                  No technologies detected — site may require JavaScript rendering
                </div>
              )}

              {/* Not yet scanned */}
              {!isScanning && !site.lastScanned && (
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted-2)',
                }}>
                  Not scanned yet — click Rescan to detect tech stack
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saving && (
        <div style={{
          position: 'fixed', bottom: 20, right: 24,
          fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--muted)',
        }}>
          Saving…
        </div>
      )}
    </div>
  );
}
