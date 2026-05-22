'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type Sentiment = 'positive' | 'neutral' | 'negative';
type SourceType = 'ad_comment' | 'page_comment' | 'ig_comment' | 'page_tag' | 'ig_mention';
type Platform = 'facebook' | 'instagram';

interface SocialComment {
  id: string;
  platform: Platform;
  sourceType: SourceType;
  contentObjectId: string;
  postPreview: string;
  message: string;
  authorName: string;
  authorPlatformId: string;
  createdAt: string;
  parentCommentId?: string | null;
  adId?: string | null;
  adName?: string | null;
  sentiment?: Sentiment;
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
  comments: number;
  reactions: number;
  shares: number;
  saves: number;
  engagementRate: number;
}

interface Engagement {
  summary: {
    totalAds: number;
    totalComments: number;
    totalReactions: number;
    totalShares: number;
    totalSaves: number;
    totalPostEngagement: number;
    totalImpressions: number;
    totalSpend: number;
  };
  ads: AdEngagementRow[];
}

interface AdCommentAnalytics {
  summary: {
    totalAds: number;
    totalCommentActions: number;
    readableComments: number;
    unreadableCommentEstimate: number;
    adsWithReadableText: number;
    adsWithCommentActivity: number;
  };
  ads: Array<{
    id: string;
    name: string;
    campaignName?: string;
    adsetName?: string;
    platform: Platform | 'unknown';
    contentObjectId?: string;
    spend: number;
    impressions: number;
    comments: number;
    readableComments: number;
    unreadableCommentEstimate: number;
    textAvailable: boolean;
    thumbnailUrl?: string;
  }>;
}

interface AccessState {
  hasAdAccountAccess: boolean;
  hasPageAccess: boolean;
  hasInstagramAccess: boolean;
  pageAccessError: string | null;
}

const SOURCE_LABEL: Record<SourceType, string> = {
  ad_comment: 'Ad comment',
  page_comment: 'Facebook post',
  ig_comment: 'Instagram post',
  page_tag: 'Tagged post',
  ig_mention: 'IG mention',
};

const SENTIMENT_COLOR = {
  positive: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  neutral: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  negative: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeDemoItem(item: Record<string, unknown>): SocialComment {
  const platform = item.platform === 'Instagram' ? 'instagram' : 'facebook';
  const sourceMap: Record<string, SourceType> = {
    post_comment: platform === 'instagram' ? 'ig_comment' : 'page_comment',
    tagged: platform === 'instagram' ? 'ig_mention' : 'page_tag',
    mention: 'ig_mention',
  };

  return {
    id: String(item.id),
    platform,
    sourceType: sourceMap[String(item.source || 'post_comment')] || 'page_comment',
    contentObjectId: String(item.postId || item.id),
    postPreview: String(item.postPreview || '[Post]'),
    message: String(item.comment || ''),
    authorName: String(item.author || 'Unknown'),
    authorPlatformId: '',
    createdAt: String(item.date || new Date().toISOString()),
    sentiment: item.sentiment as Sentiment | undefined,
    sentimentScore: typeof item.sentimentScore === 'number' ? item.sentimentScore : undefined,
  };
}

export default function SocialPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const focusAdId = searchParams.get('adId');

  const [comments, setComments] = useState<SocialComment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [adAnalytics, setAdAnalytics] = useState<AdCommentAnalytics | null>(null);
  const [access, setAccess] = useState<AccessState | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/social?slug=${slug}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load social comments');
        return;
      }

      const normalized = (json.comments || []).map((item: Record<string, unknown>) => {
        if ('sourceType' in item) return item as unknown as SocialComment;
        return normalizeDemoItem(item);
      });

      setComments(normalized);
      setStats(json.stats || null);
      setPermissions(json.permissions || null);
      setCoverage(json.coverage || null);
      setEngagement(json.engagement || null);
      setAdAnalytics(json.adAnalytics || null);
      setAccess(json.access || null);
      setWarnings(Array.isArray(json.warnings) ? json.warnings : []);
    } catch {
      setError('Failed to load social comments');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const filtered = useMemo(() => {
    return comments.filter((comment) => {
      if (focusAdId && comment.adId !== focusAdId) return false;
      if (filterSentiment !== 'all' && comment.sentiment !== filterSentiment) return false;
      if (filterPlatform !== 'all' && comment.platform !== filterPlatform) return false;
      if (filterSource !== 'all' && comment.sourceType !== filterSource) return false;

      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [
        comment.message,
        comment.authorName,
        comment.postPreview,
        comment.adName || '',
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [comments, filterPlatform, filterSentiment, filterSource, search, focusAdId]);

  const emptyReason = useMemo(() => {
    if (comments.length > 0 && filtered.length === 0) return 'No comments match the current filters.';
    if (adAnalytics?.summary.totalCommentActions) {
      return 'Meta reports comment activity on your ads, but some comment text is not readable with the current access.';
    }
    if (access?.pageAccessError) return access.pageAccessError;
    return 'No comments found in the current inbox.';
  }, [comments.length, filtered.length, adAnalytics, access]);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Social Inbox</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Meta ad comments first, then Facebook Page and Instagram comments, mentions, and tagged posts.
          </p>
          {focusAdId && (
            <p style={{ margin: '6px 0 0', color: '#60a5fa', fontSize: '12px' }}>
              Filtered to ad <span style={{ fontFamily: 'var(--font-mono)' }}>{focusAdId}</span>. Clear the query string to return to the full inbox.
            </p>
          )}
        </div>
        <button
          onClick={() => void loadComments()}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            cursor: loading ? 'default' : 'pointer',
            fontSize: '13px',
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {access?.pageAccessError && (
        <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>Page access is incomplete</div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
            {access.pageAccessError}
          </p>
          {permissions && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {['ads_read', 'pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_comments'].map((permission) => {
                const granted = permissions.granted.includes(permission);
                return (
                  <span
                    key={permission}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      background: granted ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: granted ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {granted ? 'OK' : 'Missing'} {permission}
                  </span>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
            <a href={`/api/auth/meta?slug=${slug}&rerequest=1`} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
              Re-authorize Meta
            </a>
            <a href="https://business.facebook.com/settings/pages" target="_blank" rel="noopener" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', border: '1px solid var(--glass-border)' }}>
              Open Business Settings
            </a>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>Fetch warnings</div>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6 }}>
            {warnings.slice(0, 6).map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {adAnalytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Ad comment actions', value: adAnalytics.summary.totalCommentActions, color: '#3b82f6' },
            { label: 'Readable comments', value: adAnalytics.summary.readableComments, color: '#22c55e' },
            { label: 'Text unavailable', value: adAnalytics.summary.unreadableCommentEstimate, color: '#f59e0b' },
            { label: 'Ads with comments', value: adAnalytics.summary.adsWithCommentActivity, color: '#8b5cf6' },
          ].map((item) => (
            <div key={item.label} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>{fmtNum(item.value)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            {[
              { label: 'Total', value: stats.total, color: '#6366f1' },
              { label: 'Positive', value: stats.positive, color: '#22c55e' },
              { label: 'Neutral', value: stats.neutral, color: '#94a3b8' },
              { label: 'Negative', value: stats.negative, color: '#ef4444' },
              { label: 'Facebook', value: stats.facebook, color: '#1877f2' },
              { label: 'Instagram', value: stats.instagram, color: '#e1306c' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {stats.total > 0 && (
            <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Sentiment breakdown</div>
              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', gap: '2px' }}>
                {stats.positive > 0 && <div style={{ flex: stats.positive, background: '#22c55e' }} />}
                {stats.neutral > 0 && <div style={{ flex: stats.neutral, background: '#94a3b8' }} />}
                {stats.negative > 0 && <div style={{ flex: stats.negative, background: '#ef4444' }} />}
              </div>
            </div>
          )}
        </>
      )}

      {engagement && engagement.summary.totalAds > 0 && (
        <div style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Ad engagement counts</h2>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                Works even when Meta lets you see comment counts but not full text.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {[
              { label: 'Comments', value: engagement.summary.totalComments, color: '#3b82f6' },
              { label: 'Reactions', value: engagement.summary.totalReactions, color: '#ef4444' },
              { label: 'Shares', value: engagement.summary.totalShares, color: '#22c55e' },
              { label: 'Saves', value: engagement.summary.totalSaves, color: '#f59e0b' },
              { label: 'Ads', value: engagement.summary.totalAds, color: '#8b5cf6' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: item.color }}>{fmtNum(item.value)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search comments, authors, ad names..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            flex: 1,
            minWidth: '240px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        />
        {(['all', 'facebook', 'instagram'] as const).map((platform) => (
          <button
            key={platform}
            onClick={() => setFilterPlatform(platform)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: filterPlatform === platform ? 'var(--accent-blue)' : 'var(--bg-card)',
              color: filterPlatform === platform ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {platform === 'all' ? 'All platforms' : platform}
          </button>
        ))}
        {(['all', 'ad_comment', 'page_comment', 'ig_comment', 'page_tag', 'ig_mention'] as const).map((source) => (
          <button
            key={source}
            onClick={() => setFilterSource(source)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: filterSource === source ? 'rgba(59,130,246,0.15)' : 'var(--bg-card)',
              color: filterSource === source ? '#60a5fa' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {source === 'all' ? 'All sources' : SOURCE_LABEL[source]}
          </button>
        ))}
        {(['all', 'positive', 'neutral', 'negative'] as const).map((sentiment) => (
          <button
            key={sentiment}
            onClick={() => setFilterSentiment(sentiment)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${sentiment === 'all' ? 'var(--glass-border)' : SENTIMENT_COLOR[sentiment].border}`,
              background: filterSentiment === sentiment ? (sentiment === 'all' ? 'var(--accent-blue)' : SENTIMENT_COLOR[sentiment].bg) : 'var(--bg-card)',
              color: filterSentiment === sentiment ? (sentiment === 'all' ? '#fff' : SENTIMENT_COLOR[sentiment].text) : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {sentiment === 'all' ? 'All sentiment' : sentiment}
          </button>
        ))}
      </div>

      {adAnalytics && adAnalytics.ads.length > 0 && (
        <div style={{ borderRadius: '14px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--glass-border)', fontWeight: 700 }}>
            Top ads by comment activity
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--glass-border)' }}>
                {['Ad', 'Campaign', 'Platform', 'Comment actions', 'Readable text', 'Spend', ''].map((header) => (
                  <th key={header} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adAnalytics.ads.slice(0, 12).map((ad, index) => (
                <tr key={ad.id} style={{ borderBottom: '1px solid var(--glass-border)', background: index % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', maxWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ad.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.thumbnailUrl} alt="" width={36} height={36} style={{ borderRadius: '6px', objectFit: 'cover', flex: 'none' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ad</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</div>
                        {ad.adsetName && <div style={{ fontSize: '10px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.adsetName}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>{ad.campaignName || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{ad.platform}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{fmtNum(ad.comments)}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: ad.textAvailable ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: ad.textAvailable ? '#22c55e' : '#f59e0b',
                    }}>
                      {ad.textAvailable ? `${fmtNum(ad.readableComments)} readable` : `${fmtNum(ad.unreadableCommentEstimate)} blocked`}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{fmtINR(ad.spend)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <a href={`/dashboard/${slug}/social?adId=${encodeURIComponent(ad.id)}`} style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none' }}>
                      Open comments
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {coverage && !loading && comments.length === 0 && (
        <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>No readable comments yet</div>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Managed pages: {coverage.managedCount}. Ad pages: {coverage.adPageCount}. Unmanaged ad pages: {coverage.unmanagedAdPages.length}.
          </p>
          {coverage.unmanagedAdPages.length > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Ads are running on pages this user does not manage. Add <strong>{coverage.myUserName || 'the connecting user'}</strong> to those Pages in Meta Business Settings, then re-authorize.
            </p>
          )}
          {coverage.feedSampleError && (
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Raw Meta error: {coverage.feedSampleError}
            </p>
          )}
        </div>
      )}

      <div style={{ borderRadius: '14px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--glass-border)' }}>
              {['Platform', 'Source', 'Post', 'Message', 'Author', 'Ad', 'Sentiment', 'Date'].map((header) => (
                <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading comments...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{emptyReason}</td>
              </tr>
            ) : (
              filtered.map((comment, index) => (
                <tr key={`${comment.id}-${comment.sourceType}`} style={{ borderBottom: '1px solid var(--glass-border)', background: index % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: comment.platform === 'facebook' ? 'rgba(24,119,242,0.15)' : 'rgba(225,48,108,0.15)',
                      color: comment.platform === 'facebook' ? '#1877f2' : '#e1306c',
                    }}>
                      {comment.platform}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '6px' }}>
                      {SOURCE_LABEL[comment.sourceType]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '160px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={comment.postPreview}>
                      {comment.postPreview}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                    <div style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--text-primary)' }}>{comment.message || 'Text unavailable'}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{comment.authorName}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '180px' }}>
                    {comment.adId ? (
                      <a href={`/dashboard/${slug}/social?adId=${encodeURIComponent(comment.adId)}`} style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none' }}>
                        {comment.adName || comment.adId}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {comment.sentiment ? (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: SENTIMENT_COLOR[comment.sentiment].bg,
                        color: SENTIMENT_COLOR[comment.sentiment].text,
                        border: `1px solid ${SENTIMENT_COLOR[comment.sentiment].border}`,
                      }}>
                        {comment.sentiment}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-dim)' }}>{fmtDate(comment.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filtered.length} of {comments.length} inbox items
          </div>
        )}
      </div>
    </div>
  );
}
