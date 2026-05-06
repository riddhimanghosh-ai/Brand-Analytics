'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface SocialComment {
  id: string;
  platform: 'Facebook' | 'Instagram';
  postPreview: string;
  comment: string;
  author: string;
  date: string;
  source: 'post_comment' | 'tagged' | 'mention';
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
}

interface Stats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  facebook: number;
  instagram: number;
}

const SENTIMENT_COLOR = {
  positive: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  neutral:  { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  negative: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

const SOURCE_LABEL = {
  post_comment: 'Comment',
  tagged: 'Tagged Post',
  mention: 'Mention',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function SocialPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [comments, setComments] = useState<SocialComment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadComments = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/social?slug=${slug}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to load comments'); return; }
      setComments(json.comments || []);
      setStats(json.stats);
    } catch {
      setError('Failed to load social comments');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const filtered = comments.filter((c) => {
    if (filterSentiment !== 'all' && c.sentiment !== filterSentiment) return false;
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (search && !c.comment.toLowerCase().includes(search.toLowerCase()) && !c.author.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>💬 Social Comments</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Comments, mentions, and tagged posts across Facebook & Instagram with AI sentiment analysis
          </p>
        </div>
        <button
          onClick={loadComments}
          disabled={loading}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: loading ? 'default' : 'pointer', fontSize: '13px',
          }}
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
          Fetching comments & analysing sentiment...
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            {[
              { label: 'Total', value: stats.total, color: '#6366f1' },
              { label: '😊 Positive', value: stats.positive, color: '#22c55e' },
              { label: '😐 Neutral', value: stats.neutral, color: '#94a3b8' },
              { label: '😠 Negative', value: stats.negative, color: '#ef4444' },
              { label: 'Facebook', value: stats.facebook, color: '#1877f2' },
              { label: 'Instagram', value: stats.instagram, color: '#e1306c' },
            ].map((s) => (
              <div key={s.label} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sentiment Bar */}
          {stats.total > 0 && (
            <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Sentiment breakdown</div>
              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', gap: '2px' }}>
                {stats.positive > 0 && <div style={{ flex: stats.positive, background: '#22c55e' }} title={`${stats.positive} positive`} />}
                {stats.neutral  > 0 && <div style={{ flex: stats.neutral,  background: '#94a3b8' }} title={`${stats.neutral} neutral`} />}
                {stats.negative > 0 && <div style={{ flex: stats.negative, background: '#ef4444' }} title={`${stats.negative} negative`} />}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ color: '#22c55e' }}>● {Math.round((stats.positive / stats.total) * 100)}% positive</span>
                <span style={{ color: '#94a3b8' }}>● {Math.round((stats.neutral  / stats.total) * 100)}% neutral</span>
                <span style={{ color: '#ef4444' }}>● {Math.round((stats.negative / stats.total) * 100)}% negative</span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="🔍 Search comments or authors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: '220px', padding: '8px 14px', borderRadius: '8px',
                border: '1px solid var(--glass-border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
              }}
            />
            {/* Platform filter */}
            {['all', 'Facebook', 'Instagram'].map((p) => (
              <button key={p} onClick={() => setFilterPlatform(p)} style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: filterPlatform === p ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: filterPlatform === p ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '12px',
              }}>{p === 'all' ? 'All Platforms' : p}</button>
            ))}
            {/* Sentiment filter */}
            {['all', 'positive', 'neutral', 'negative'].map((s) => (
              <button key={s} onClick={() => setFilterSentiment(s)} style={{
                padding: '6px 14px', borderRadius: '8px', border: `1px solid ${s !== 'all' ? SENTIMENT_COLOR[s as keyof typeof SENTIMENT_COLOR]?.border : 'var(--glass-border)'}`,
                background: filterSentiment === s ? (s !== 'all' ? SENTIMENT_COLOR[s as keyof typeof SENTIMENT_COLOR]?.bg : 'var(--accent-blue)') : 'var(--bg-card)',
                color: filterSentiment === s ? (s !== 'all' ? SENTIMENT_COLOR[s as keyof typeof SENTIMENT_COLOR]?.text : '#fff') : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize',
              }}>{s === 'all' ? 'All Sentiments' : s}</button>
            ))}
          </div>

          {/* Comments Table */}
          <div style={{ borderRadius: '14px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--glass-border)' }}>
                  {['Platform', 'Post', 'Comment', 'Author', 'Sentiment', 'Type', 'Date'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      {comments.length === 0 ? '💬 No comments found. Make sure your Meta token has page access.' : '🔍 No comments match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--glass-border)', background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                          background: c.platform === 'Facebook' ? 'rgba(24,119,242,0.15)' : 'rgba(225,48,108,0.15)',
                          color: c.platform === 'Facebook' ? '#1877f2' : '#e1306c',
                        }}>
                          {c.platform === 'Facebook' ? 'f' : '📷'} {c.platform}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '140px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.postPreview}>
                          {c.postPreview}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                        <div style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--text-primary)' }}>{c.comment}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{c.author}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {c.sentiment ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                            background: SENTIMENT_COLOR[c.sentiment].bg,
                            color: SENTIMENT_COLOR[c.sentiment].text,
                            border: `1px solid ${SENTIMENT_COLOR[c.sentiment].border}`,
                          }}>
                            {c.sentiment === 'positive' ? '😊' : c.sentiment === 'negative' ? '😠' : '😐'} {c.sentiment}
                          </span>
                        ) : <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '6px' }}>
                          {SOURCE_LABEL[c.source]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{fmtDate(c.date)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filtered.length} of {comments.length} comments
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
