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

interface Permissions {
  granted: string[];
  declined: string[];
  expired: string[];
  hasPageAccess: boolean;
  hasInstagramAccess: boolean;
  pagesCount: number;
  adAccountCount: number;
}

interface Coverage {
  myUserId: string | null;
  myUserName: string | null;
  managedPages: Array<{ id: string; name: string; tasks: string[]; hasIG: boolean }>;
  adPages: Array<{ id: string; sampleAdName: string; samplePostId: string }>;
  managedCount: number;
  adPageCount: number;
  unmanagedAdPages: Array<{ id: string; sampleAdName: string }>;
  feedSampleError: string | null;
  feedSampleSuccess: boolean;
}

interface AdEngagementRow {
  id: string;
  name: string;
  campaignName?: string;
  adsetName?: string;
  pageId?: string;
  status?: string;
  thumbnailUrl?: string;
  permalinkUrl?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  comments: number;
  reactions: number;
  shares: number;
  saves: number;
  postEngagement: number;
  pageEngagement: number;
  videoViews: number;
  engagementRate: number;
  commentRate: number;
}

interface AdEngagementSummary {
  totalAds: number;
  totalComments: number;
  totalReactions: number;
  totalShares: number;
  totalSaves: number;
  totalPostEngagement: number;
  totalImpressions: number;
  totalSpend: number;
}

interface Engagement {
  summary: AdEngagementSummary;
  ads: AdEngagementRow[];
}

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
};
const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

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
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [source, setSource] = useState<'pages' | 'ads' | 'none' | null>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [engagementSort, setEngagementSort] = useState<'engagement' | 'comments' | 'reactions' | 'spend' | 'rate'>('engagement');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadComments = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    setPermError(null);
    try {
      const res = await fetch(`/api/social?slug=${slug}`);
      const json = await res.json();
      setPermissions(json.permissions ?? null);
      setCoverage(json.coverage ?? null);
      setEngagement(json.engagement ?? null);
      setSource(json.source ?? null);

      if (json.error === 'page_access_required') {
        setPermError(json.message || 'Page access required');
        setComments([]);
        setStats(null);
        return;
      }

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

      {permError && (
        <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#f59e0b' }}>
            🔒 Page access not granted
          </div>
          <p style={{ margin: '8px 0 14px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>{permError}</p>
          {permissions && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {[
                'ads_read', 'pages_show_list', 'pages_read_engagement', 'pages_read_user_content', 'instagram_basic', 'instagram_manage_comments',
              ].map((p) => {
                const granted = permissions.granted.includes(p);
                const declined = permissions.declined.includes(p);
                const bg = granted ? 'rgba(34,197,94,0.12)' : declined ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)';
                const fg = granted ? '#22c55e' : declined ? '#ef4444' : '#94a3b8';
                const icon = granted ? '✓' : declined ? '✗' : '—';
                return (
                  <span key={p} style={{
                    padding: '4px 10px', borderRadius: '999px', fontSize: '11px',
                    background: bg, color: fg, fontFamily: 'var(--font-mono)',
                  }}>{icon} {p}</span>
                );
              })}
              <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '11px', background: 'rgba(148,163,184,0.12)', color: 'var(--text-muted)' }}>
                Pages linked: {permissions.pagesCount}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={`/api/auth/meta?slug=${slug}&rerequest=1`}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}
            >
              🔁 Re-authorize with Page access
            </a>
            <a
              href={`/dashboard/${slug}/settings`}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', border: '1px solid var(--glass-border)' }}
            >
              ⚙️ Settings
            </a>
          </div>
          <p style={{ margin: '12px 0 0', color: 'var(--text-dim)', fontSize: '11px', lineHeight: 1.5 }}>
            Tip: on the Facebook consent screen, click <strong style={{ color: 'var(--text-secondary)' }}>“Edit settings”</strong> and enable every toggle — Meta drops any scope you skip.
            If you don&apos;t manage a Facebook Page yet, you can also browse comments on your <strong style={{ color: 'var(--text-secondary)' }}>ad creatives</strong>; those will appear automatically once your ad account has activity.
          </p>
        </div>
      )}

      {source === 'ads' && !permError && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', color: '#60a5fa' }}>
          ℹ️ Showing comments from your <strong>ad creatives</strong> only. <a href={`/api/auth/meta?slug=${slug}&rerequest=1`} style={{ color: '#93c5fd', textDecoration: 'underline' }}>Grant Page access</a> to also see organic Facebook + Instagram comments.
        </div>
      )}

      {/* ── Real-state diagnostic: shows when comments are empty but Meta is connected ── */}
      {coverage && !loading && !permError && comments.length === 0 && (
        <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#f87171' }}>
            🚫 No comments — here&apos;s exactly why
          </div>

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>You can read</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#22c55e', margin: '4px 0' }}>{coverage.managedCount} pages</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>You&apos;re admin of:</div>
              <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {coverage.managedPages.length === 0
                  ? <li style={{ color: 'var(--text-dim)', listStyle: 'none', marginLeft: '-16px' }}>none</li>
                  : coverage.managedPages.map((p) => (
                    <li key={p.id}>{p.name} <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>({p.id})</span></li>
                  ))}
              </ul>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your ads run on</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: coverage.unmanagedAdPages.length > 0 ? '#f59e0b' : '#22c55e', margin: '4px 0' }}>
                {coverage.adPageCount} pages
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {coverage.unmanagedAdPages.length > 0
                  ? `${coverage.unmanagedAdPages.length} not accessible to you:`
                  : 'all accessible ✓'}
              </div>
              <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {coverage.unmanagedAdPages.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>Page {p.id}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>via &ldquo;{p.sampleAdName}&rdquo;</div>
                  </li>
                ))}
                {coverage.unmanagedAdPages.length > 5 && <li style={{ color: 'var(--text-dim)' }}>+ {coverage.unmanagedAdPages.length - 5} more</li>}
              </ul>
            </div>
          </div>

          {coverage.unmanagedAdPages.length > 0 && (
            <div style={{ marginTop: '14px', padding: '14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', marginBottom: '8px' }}>What this means</div>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Your Meta token is for user <strong>{coverage.myUserName || '(unknown)'}</strong> (ID <span style={{ fontFamily: 'var(--font-mono)' }}>{coverage.myUserId || '?'}</span>). Meta grants comment-reading on a per-Page basis — granting <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0 4px', borderRadius: '3px' }}>pages_read_engagement</code> at OAuth is not enough. You also need to be added as <strong>Admin, Editor, or Moderator</strong> on each Page in Meta Business Suite.
              </p>
              <p style={{ margin: '10px 0 0', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#fde68a' }}>Fix:</strong> Open <a href="https://business.facebook.com/settings/pages" target="_blank" rel="noopener" style={{ color: '#fde68a', textDecoration: 'underline' }}>Meta Business Settings → Pages</a>, locate each page listed above, click <strong>Add People</strong>, and invite <strong>{coverage.myUserName || 'your account'}</strong> with at least <strong>Moderator</strong> task access. Then come back here and click Refresh.
              </p>
              {coverage.feedSampleError && (
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  Raw Meta error: {coverage.feedSampleError}
                </p>
              )}
            </div>
          )}

          {coverage.unmanagedAdPages.length === 0 && coverage.managedCount > 0 && (
            <div style={{ marginTop: '14px', padding: '14px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)' }}>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Page access looks fine — likely your pages just have no posts (or no comments) in the lookback window. Try posting something on Facebook or Instagram and refresh.
              </p>
            </div>
          )}

          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href={`/api/auth/meta?slug=${slug}&rerequest=1`} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
              🔁 Re-authorize Meta
            </a>
            <a href="https://business.facebook.com/settings/pages" target="_blank" rel="noopener" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', border: '1px solid var(--glass-border)' }}>
              🏢 Open Business Settings
            </a>
            <button onClick={loadComments} disabled={loading} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
              🔄 Recheck
            </button>
          </div>
        </div>
      )}

      {/* ── Ad Engagement: per-ad counts (comments, reactions, shares, saves) ── */}
      {engagement && !loading && engagement.summary.totalAds > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>📊 Ad Engagement</h2>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                Engagement counts per ad from Meta Insights — works even when comment text is blocked
              </p>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Last 30 days</div>
          </div>

          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '12px' }}>
            {[
              { label: '💬 Comments', value: engagement.summary.totalComments, color: '#3b82f6' },
              { label: '❤️ Reactions', value: engagement.summary.totalReactions, color: '#ef4444' },
              { label: '🔁 Shares', value: engagement.summary.totalShares, color: '#22c55e' },
              { label: '🔖 Saves', value: engagement.summary.totalSaves, color: '#f59e0b' },
              { label: '✨ Engagements', value: engagement.summary.totalPostEngagement, color: '#8b5cf6' },
              { label: '🎯 Ads', value: engagement.summary.totalAds, color: '#06b6d4' },
            ].map((s) => (
              <div key={s.label} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{fmtNum(s.value)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sort controls */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sort by:</span>
            {([
              ['engagement', 'Total Engagement'],
              ['comments', 'Comments'],
              ['reactions', 'Reactions'],
              ['rate', 'Engagement Rate'],
              ['spend', 'Spend'],
            ] as const).map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setEngagementSort(k)}
                style={{
                  padding: '4px 10px', borderRadius: '6px',
                  background: engagementSort === k ? 'var(--accent-blue)' : 'var(--bg-card)',
                  color: engagementSort === k ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)', cursor: 'pointer', fontSize: '11px',
                }}
              >{lbl}</button>
            ))}
          </div>

          {/* Ads table */}
          <div style={{ borderRadius: '14px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--glass-border)' }}>
                  {['Ad', 'Campaign', 'Spend', 'Impressions', '💬 Cmnts', '❤️ React', '🔁 Shares', '🔖 Saves', 'Eng. Rate', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...engagement.ads]
                  .sort((a, b) => {
                    if (engagementSort === 'comments') return b.comments - a.comments;
                    if (engagementSort === 'reactions') return b.reactions - a.reactions;
                    if (engagementSort === 'spend') return b.spend - a.spend;
                    if (engagementSort === 'rate') return b.engagementRate - a.engagementRate;
                    return (b.comments + b.reactions + b.shares + b.saves) - (a.comments + a.reactions + a.shares + a.saves);
                  })
                  .slice(0, 25)
                  .map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)', background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', maxWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {a.thumbnailUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={a.thumbnailUrl} alt="" width={36} height={36} style={{ borderRadius: '6px', objectFit: 'cover', flex: 'none' }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flex: 'none' }}>🎯</div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.name}>{a.name}</div>
                            {a.status && <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{a.status}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '160px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campaignName ?? '—'}</div>
                        {a.adsetName && <div style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>{a.adsetName}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{fmtINR(a.spend)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{fmtNum(a.impressions)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: a.comments > 0 ? '#3b82f6' : 'var(--text-dim)' }}>{a.comments}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: a.reactions > 0 ? '#ef4444' : 'var(--text-dim)' }}>{fmtNum(a.reactions)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: a.shares > 0 ? '#22c55e' : 'var(--text-dim)' }}>{a.shares}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: a.saves > 0 ? '#f59e0b' : 'var(--text-dim)' }}>{a.saves}</td>
                      <td style={{ padding: '10px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{
                          padding: '2px 7px', borderRadius: '10px',
                          background: a.engagementRate >= 2 ? 'rgba(34,197,94,0.15)' : a.engagementRate >= 0.5 ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.1)',
                          color: a.engagementRate >= 2 ? '#22c55e' : a.engagementRate >= 0.5 ? '#f59e0b' : '#94a3b8',
                        }}>{a.engagementRate.toFixed(2)}%</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {a.permalinkUrl ? (
                          <a href={a.permalinkUrl} target="_blank" rel="noopener" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}>↗ View</a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            <strong style={{ color: '#93c5fd' }}>Note:</strong> these counts are from Meta&apos;s Ads Insights API — they work for all your ads including Partnership / UGC ads on creator pages. To read the actual comment <em>text</em> on creator-owned pages, you need Meta App Review approval for <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0 4px', borderRadius: '3px' }}>Page Public Content Access</code>.
          </div>
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
