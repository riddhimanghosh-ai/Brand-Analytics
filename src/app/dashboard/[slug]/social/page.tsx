'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

type Sentiment = 'positive' | 'neutral' | 'negative';

interface SocialComment {
  id: string;
  platform: 'facebook' | 'instagram';
  sourceType: string;
  message: string;
  authorName: string;
  createdAt: string;
  adId?: string | null;
  adName?: string | null;
  postPreview: string;
  sentiment?: Sentiment;
  sentimentScore?: number;
}

interface SocialData {
  comments: SocialComment[];
  stats: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    facebook: number;
    instagram: number;
  };
  warnings?: string[];
  access?: { pageAccessError?: string | null };
}

const SENTIMENT_META: Record<Sentiment, { label: string; icon: string; color: string; bg: string }> = {
  positive: { label: 'Positive', icon: '😊', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  neutral:  { label: 'Neutral',  icon: '😐', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  negative: { label: 'Negative', icon: '😠', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Purchase-intent signals worth answering fast
const INTENT_RE = /\b(link|price|kitna|kitne|cost|buy|kaha|kahan|where|how much|order|available|website|dm)\b/i;

export default function SocialPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const { from, to } = useGlobalDateRange();
  const [data, setData] = useState<SocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | 'all' | 'intent'>('all');
  const [adFilter, setAdFilter] = useState<string>('all');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/social?slug=${slug}&from=${from}&to=${to}&sentiment=true`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.message || d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, from, to]);

  useEffect(() => { load(); }, [load]);

  const comments = data?.comments ?? [];

  // Group by ad for the filter dropdown
  const adNames = [...new Set(comments.map(c => c.adName).filter(Boolean))] as string[];

  const filtered = comments.filter(c => {
    if (adFilter !== 'all' && c.adName !== adFilter) return false;
    if (sentimentFilter === 'all') return true;
    if (sentimentFilter === 'intent') return INTENT_RE.test(c.message);
    return c.sentiment === sentimentFilter;
  });

  const intentCount = comments.filter(c => INTENT_RE.test(c.message)).length;
  const stats = data?.stats;
  const negativeShare = stats && stats.total > 0 ? (stats.negative / stats.total) * 100 : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>💬 Social Comments</h2>
            <p>Live comments from your Meta ads with AI sentiment — public social proof you can act on</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={load}
              disabled={loading}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              {loading ? 'Fetching…' : '↻ Refresh'}
            </button>
            <DateRangeDropdown />
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="chart-card">
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>
              Pulling comments from your ads &amp; running sentiment analysis — this takes ~30s for full coverage…
            </div>
            {[85, 60, 75, 50, 65, 70].map((w, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, height: '40px', marginBottom: '10px' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: '24px' }}>
            ❌ {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Comments Pulled', value: String(stats?.total ?? 0), sub: 'Readable text, all sources', color: 'var(--text-primary)' },
                { label: 'Positive', value: String(stats?.positive ?? 0), sub: 'AI-classified', color: '#22c55e' },
                { label: 'Negative', value: String(stats?.negative ?? 0), sub: `${negativeShare.toFixed(0)}% of total`, color: negativeShare > 25 ? '#f43f5e' : '#9ca3af' },
                { label: 'Purchase Intent', value: String(intentCount), sub: '"price", "link", "where to buy"…', color: '#f59e0b' },
                { label: 'Instagram / Facebook', value: `${stats?.instagram ?? 0} / ${stats?.facebook ?? 0}`, sub: 'By platform', color: 'var(--text-primary)' },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Warnings (FB page access etc.) */}
            {data.access?.pageAccessError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', marginBottom: '16px', fontSize: '12px' }}>
                ⚠️ Facebook page comments unavailable: {data.access.pageAccessError} Instagram ad comments are fully live.
              </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              {([
                { value: 'all', label: `All (${comments.length})`, color: 'var(--accent-blue)' },
                { value: 'negative', label: `😠 Negative (${stats?.negative ?? 0})`, color: '#f43f5e' },
                { value: 'positive', label: `😊 Positive (${stats?.positive ?? 0})`, color: '#22c55e' },
                { value: 'neutral', label: `😐 Neutral (${stats?.neutral ?? 0})`, color: '#9ca3af' },
                { value: 'intent', label: `🛒 Purchase Intent (${intentCount})`, color: '#f59e0b' },
              ] as const).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSentimentFilter(tab.value)}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${sentimentFilter === tab.value ? tab.color : 'var(--glass-border)'}`,
                    background: sentimentFilter === tab.value ? `${tab.color}18` : 'var(--bg-card)',
                    color: sentimentFilter === tab.value ? tab.color : 'var(--text-secondary)',
                  }}
                >
                  {tab.label}
                </button>
              ))}

              {adNames.length > 1 && (
                <select
                  value={adFilter}
                  onChange={e => setAdFilter(e.target.value)}
                  style={{
                    marginLeft: 'auto', padding: '7px 10px', borderRadius: '8px', fontSize: '12px',
                    background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)',
                    maxWidth: '260px',
                  }}
                >
                  <option value="all">All ads ({adNames.length})</option>
                  {adNames.map(n => <option key={n} value={n}>{n.length > 40 ? n.slice(0, 40) + '…' : n}</option>)}
                </select>
              )}
            </div>

            {/* Comments list */}
            {filtered.length === 0 ? (
              <div style={{ padding: '32px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                {comments.length === 0
                  ? 'No readable comments found on your ads in this period. Widen the date range to pull more.'
                  : 'No comments match this filter.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.map(c => {
                  const s = c.sentiment ? SENTIMENT_META[c.sentiment] : null;
                  const hasIntent = INTENT_RE.test(c.message);
                  return (
                    <div key={c.id} style={{
                      padding: '12px 16px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--glass-border)',
                      borderLeft: `3px solid ${s ? s.color : 'var(--glass-border)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{c.platform === 'instagram' ? '📸' : '📘'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>{c.message || <em style={{ color: 'var(--text-dim)' }}>[no text]</em>}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {c.authorName && c.authorName !== '@instagram-user' && <span>{c.authorName}</span>}
                            <span>{relativeTime(c.createdAt)}</span>
                            {c.adName && (
                              <span style={{ color: 'var(--accent-blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                📣 {c.adName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                          {hasIntent && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                              🛒 INTENT
                            </span>
                          )}
                          {s && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: s.bg, color: s.color }}>
                              {s.icon} {s.label.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Acting on it */}
            <div className="chart-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
              <div className="chart-card-title" style={{ marginBottom: '8px' }}>📖 Why comments matter</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: '#f43f5e' }}>😠 Hostile comment sections kill ads</strong><br />
                  Comments are public social proof. An ad with visible &ldquo;worst perfume ever&rdquo; comments converts dramatically worse — hide/reply fast, or kill the ad and relaunch the creative fresh.
                </div>
                <div>
                  <strong style={{ color: '#f59e0b' }}>🛒 Intent comments are leads</strong><br />
                  Every &ldquo;price?&rdquo; or &ldquo;link?&rdquo; is a buyer with their wallet out. Reply within hours with the product link — these convert at a higher rate than any retargeting audience.
                </div>
                <div>
                  <strong style={{ color: '#22c55e' }}>😊 Positive comments are creative gold</strong><br />
                  Real customer phrases (&ldquo;lasts all day&rdquo;) outperform copywriter lines. Lift them into your next ad&apos;s hook and primary text.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
