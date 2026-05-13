'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CompetitorAd, BenchmarkRange } from '@/lib/services/competitor-ads';

// ── Helpers ───────────────────────────────────────────────────────────────────
const C = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','can',
  'this','that','these','those','i','we','you','he','she','it','they',
  'my','your','our','their','its','your','our',
  'not','no','so','as','if','by','from','up','out','about','into',
  'get','now','just','more','new','your','our','all','also','up',
]);

function wordFrequency(ads: CompetitorAd[]): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const ad of ads) {
    for (const copy of ad.adCopy) {
      const words = copy
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
      for (const w of words) {
        freq[w] = (freq[w] ?? 0) + 1;
      }
    }
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRange(lower: number, upper: number, prefix = '', suffix = '') {
  if (!lower && !upper) return '—';
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
  return `${prefix}${fmt(lower)}–${prefix}${fmt(upper)}${suffix}`;
}

function platformIcon(p: string) {
  const map: Record<string, string> = {
    FACEBOOK: '📘',
    INSTAGRAM: '📷',
    MESSENGER: '💬',
    AUDIENCE_NETWORK: '🌐',
    WHATSAPP: '📱',
    THREADS: '🧵',
  };
  return map[p.toUpperCase()] ?? '📢';
}

// Benchmark status — are we in range, above, or below?
function benchmarkStatus(value: number, range: BenchmarkRange): { label: string; color: string; badge: string } {
  const { low, high, higherIsBetter } = range;
  const inRange = value >= low && value <= high;
  const above = value > high;

  if (inRange) return { label: 'In range', color: 'var(--accent-green)', badge: 'green' };
  if (above) {
    return higherIsBetter
      ? { label: 'Above avg', color: 'var(--accent-green)', badge: 'green' }
      : { label: 'High', color: 'var(--accent-rose)', badge: 'rose' };
  }
  // below
  return higherIsBetter
    ? { label: 'Below avg', color: 'var(--accent-rose)', badge: 'rose' }
    : { label: 'Low — good', color: 'var(--accent-green)', badge: 'green' };
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'intelligence' | 'benchmark' | 'creative';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'intelligence', label: 'Ad Intelligence', icon: '🔍' },
  { id: 'benchmark',    label: 'Performance Benchmark', icon: '📊' },
  { id: 'creative',     label: 'Creative Analysis', icon: '🎨' },
];

interface Competitor { name: string; pageId: string }

interface BenchmarkData {
  benchmarks: {
    meta: Record<string, BenchmarkRange>;
    google: Record<string, BenchmarkRange>;
  };
  brandMeta: {
    spend: number; impressions: number; clicks: number;
    ctr: number; cpc: number; cpm: number; roas: number;
    reach: number;
  } | null;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CompetitorsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('intelligence');

  // Ad intelligence state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  // Benchmark state
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);

  useEffect(() => {
    paramsPromise.then((p) => setSlug(p.slug));
  }, [paramsPromise]);

  // Load brand's saved competitors + benchmark data
  useEffect(() => {
    if (!slug) return;

    // Fetch brand to get saved competitors
    fetch(`/api/brands/${slug}`)
      .then((r) => r.json())
      .then((brand) => {
        setCompetitors(Array.isArray(brand.competitors) ? brand.competitors : []);
      })
      .catch(console.error);

    // Fetch benchmarks
    setBenchmarkLoading(true);
    fetch(`/api/competitor-ads?slug=${slug}&action=benchmarks`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'Brand not found') return;
        setBenchmarkData(data);
      })
      .catch(console.error)
      .finally(() => setBenchmarkLoading(false));
  }, [slug]);

  const fetchAds = useCallback(async () => {
    if (!slug) return;
    setAdsLoading(true);
    setAdsError(null);
    setAds([]);

    try {
      let url = '';
      if (searchQ.trim()) {
        url = `/api/competitor-ads?slug=${slug}&action=search&q=${encodeURIComponent(searchQ)}&status=${statusFilter}`;
      } else if (selectedCompetitor === 'all' && competitors.length > 0) {
        const ids = competitors.map((c) => c.pageId).join(',');
        url = `/api/competitor-ads?slug=${slug}&action=ads&pageIds=${ids}&status=${statusFilter}`;
      } else if (selectedCompetitor !== 'all') {
        url = `/api/competitor-ads?slug=${slug}&action=ads&pageIds=${selectedCompetitor}&status=${statusFilter}`;
      } else {
        setAdsLoading(false);
        return;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.error === 'Meta Ads not connected') { setNotConnected(true); return; }
      if (data.error) { setAdsError(data.error); return; }
      setAds(Array.isArray(data) ? data : []);
    } catch (e) {
      setAdsError((e as Error).message);
    } finally {
      setAdsLoading(false);
    }
  }, [slug, selectedCompetitor, searchQ, statusFilter, competitors]);

  // Auto-fetch when competitor selection changes
  useEffect(() => {
    if (!searchQ.trim() && (competitors.length > 0 || selectedCompetitor !== 'all')) {
      fetchAds();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompetitor, statusFilter, slug]);

  if (notConnected) return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div><h2>🔍 Competitor Ads</h2><p>Track and benchmark competitor advertising</p></div>
        </div>
      </div>
      <div className="page-body">
        <div className="connection-required">
          <div className="cr-icon">📘</div>
          <h3>Meta Ads Not Connected</h3>
          <p>Competitor ad intelligence uses your Meta access token to query the public Meta Ad Library.</p>
          {slug && <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">⚙️ Connect Meta Ads</Link>}
        </div>
      </div>
    </>
  );

  // ── Tab: Ad Intelligence ────────────────────────────────────────────────
  function IntelligenceTab() {
    return (
      <>
        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-end' }}>
          {/* Competitor filter */}
          {competitors.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Competitor</label>
              <select
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(e.target.value)}
                className="form-input"
                style={{ minWidth: '160px' }}
              >
                <option value="all">All competitors</option>
                {competitors.map((c) => (
                  <option key={c.pageId} value={c.pageId}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Keyword search */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search by keyword / brand name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="e.g. Nykaa perfume, Forest Essentials…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAds()}
              />
              <button className="btn btn-primary" onClick={fetchAds} disabled={adsLoading} style={{ whiteSpace: 'nowrap' }}>
                {adsLoading ? '⏳' : '🔍 Search'}
              </button>
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="form-input"
            >
              <option value="ALL">All ads</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>
          </div>
        </div>

        {/* Setup prompt if no competitors added */}
        {competitors.length === 0 && !searchQ && (
          <div style={{ padding: '32px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px dashed var(--glass-border)', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>No competitors tracked yet</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '480px', margin: '0 auto 20px' }}>
              Add competitor Facebook Page IDs in Settings to auto-track their ads — or search by brand/keyword above.
            </div>
            {slug && (
              <Link href={`/dashboard/${slug}/settings`} className="btn btn-primary">
                ⚙️ Add Competitors in Settings
              </Link>
            )}
          </div>
        )}

        {/* Error */}
        {adsError && (
          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#ef4444', fontSize: '14px', marginBottom: '20px' }}>
            ⚠️ {adsError}
          </div>
        )}

        {/* Loading */}
        {adsLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="chart-card" style={{ height: '200px' }}>
                <div className="skeleton skeleton-chart" />
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!adsLoading && !adsError && ads.length === 0 && (competitors.length > 0 || searchQ) && (
          <div style={{ padding: '32px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌍</div>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>No ads found</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
              The Meta Ad Library primarily covers ads running in <strong>EU countries</strong>. Ads targeting only India may not appear.
              <br /><br />
              Try: searching by the brand&apos;s exact name, switching the status filter to <strong>All ads</strong>, or checking the page ID is correct.
            </div>
          </div>
        )}

        {/* Ad cards */}
        {!adsLoading && ads.length > 0 && (
          <>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Showing <strong>{ads.length}</strong> ads · Spend and impressions are ranges from Meta Ad Library
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  // ── Ad Card ───────────────────────────────────────────────────────────────
  function AdCard({ ad }: { ad: CompetitorAd }) {
    const primaryCopy = ad.adCopy[0] ?? ad.linkTitle ?? '';
    const truncated = primaryCopy.length > 180 ? `${primaryCopy.slice(0, 180)}…` : primaryCopy;

    return (
      <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{ad.pageName}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
              {fmtDate(ad.startDate)} → {ad.endDate ? fmtDate(ad.endDate) : 'Running'}
            </div>
          </div>
          <span className={`badge ${ad.status === 'active' ? 'green' : 'rose'}`} style={{ flexShrink: 0, marginLeft: '8px' }}>
            {ad.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
          </span>
        </div>

        {/* Ad copy */}
        {truncated && (
          <div style={{
            fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.55,
            padding: '10px 12px', background: 'var(--bg-hover)',
            borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)',
          }}>
            &ldquo;{truncated}&rdquo;
          </div>
        )}

        {/* Link title */}
        {ad.linkTitle && ad.linkTitle !== primaryCopy && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            📎 {ad.linkTitle}
          </div>
        )}

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ad.spendRange && (
            <span style={{ fontSize: '12px', padding: '3px 8px', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', borderRadius: '6px', fontWeight: 600 }}>
              💰 {fmtRange(ad.spendRange.lower, ad.spendRange.upper, ad.spendRange.currency === 'INR' ? '₹' : '$')}
            </span>
          )}
          {ad.impressionsRange && (
            <span style={{ fontSize: '12px', padding: '3px 8px', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', borderRadius: '6px', fontWeight: 600 }}>
              👁️ {fmtRange(ad.impressionsRange.lower, ad.impressionsRange.upper)}
            </span>
          )}
          <span style={{ fontSize: '12px', padding: '3px 8px', background: 'var(--bg-hover)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
            {ad.mediaType}
          </span>
        </div>

        {/* Platforms */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ad.platforms.map((p) => (
            <span key={p} style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--bg-hover)', borderRadius: '20px', color: 'var(--text-secondary)' }}>
              {platformIcon(p)} {p.charAt(0) + p.slice(1).toLowerCase()}
            </span>
          ))}
        </div>

        {/* View in library link */}
        {ad.snapshotUrl && (
          <a
            href={ad.snapshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
          >
            📖 View in Meta Ad Library →
          </a>
        )}
      </div>
    );
  }

  // ── Tab: Benchmark ────────────────────────────────────────────────────────
  function BenchmarkTab() {
    if (benchmarkLoading) return (
      <div className="charts-grid cols-2" style={{ marginTop: '8px' }}>
        {[1, 2].map((i) => <div key={i} className="chart-card" style={{ height: '280px' }}><div className="skeleton skeleton-chart" /></div>)}
      </div>
    );

    if (!benchmarkData) return null;
    const { benchmarks, brandMeta } = benchmarkData;

    function MetricRow({ metricKey, range }: { metricKey: string; range: BenchmarkRange }) {
      const brandVal = brandMeta
        ? ({
            ctr: brandMeta.ctr,
            cpc: brandMeta.cpc,
            cpm: brandMeta.cpm,
            roas: brandMeta.roas,
            frequency: brandMeta.reach > 0 ? brandMeta.impressions / brandMeta.reach : 0,
          } as Record<string, number>)[metricKey] ?? null
        : null;

      const status = brandVal !== null ? benchmarkStatus(brandVal, range) : null;

      const displayVal = brandVal !== null
        ? `${range.unit === '₹' ? '₹' : ''}${brandVal.toFixed(range.unit === '×' ? 2 : 1)}${range.unit === '%' ? '%' : range.unit === '×' ? '×' : ''}`
        : '—';

      return (
        <tr>
          <td className="highlight">{range.label}</td>
          <td className="mono" style={{ fontWeight: 700, color: status?.color ?? 'var(--text-secondary)' }}>{displayVal}</td>
          <td className="mono" style={{ color: 'var(--text-secondary)' }}>
            {range.unit === '₹' ? `₹${range.low}–₹${range.high}` : `${range.low}–${range.high}${range.unit}`}
          </td>
          <td>
            {status ? (
              <span className={`badge ${status.badge}`}>{status.label}</span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No data</span>
            )}
          </td>
          <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {range.higherIsBetter ? '↑ higher = better' : '↓ lower = better'}
          </td>
        </tr>
      );
    }

    return (
      <>
        {!brandMeta && (
          <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', fontSize: '13px', color: '#f59e0b', marginBottom: '24px' }}>
            ⚠️ Connect Meta Ads to see your brand&apos;s live metrics alongside benchmarks. Benchmarks are shown below for reference.
          </div>
        )}

        <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Industry benchmarks for <strong>e-commerce / fashion / fragrance</strong> vertical (India market). Your brand&apos;s data is pulled from the connected Meta Ads account.
        </div>

        {/* Meta benchmarks */}
        <div className="data-table-wrapper" style={{ marginBottom: '24px' }}>
          <div className="data-table-header">
            <div className="data-table-title">📘 Meta Ads Benchmarks</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th>Your Brand</th><th>Industry Range</th><th>Status</th><th>Direction</th></tr>
              </thead>
              <tbody>
                {Object.entries(benchmarks.meta).map(([k, r]) => (
                  <MetricRow key={k} metricKey={k} range={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Google benchmarks (informational, no live data yet) */}
        <div className="data-table-wrapper">
          <div className="data-table-header">
            <div className="data-table-title">🎯 Google Ads Benchmarks</div>
            <div className="data-table-subtitle">Reference ranges — connect Google Ads for live comparison</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th>Your Brand</th><th>Industry Range</th><th>Status</th><th>Direction</th></tr>
              </thead>
              <tbody>
                {Object.entries(benchmarks.google).map(([k, r]) => (
                  <MetricRow key={k} metricKey={k} range={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          ℹ️ <strong>Note on competitor metrics:</strong> The Meta Ad Library provides spend and impression <em>ranges</em> for competitor ads — not exact values. Precise CTR, CPC, or ROAS data for competitors is not publicly available. The benchmarks above are industry averages, not competitor-specific data.
        </div>
      </>
    );
  }

  // ── Tab: Creative Analysis ────────────────────────────────────────────────
  function CreativeTab() {
    if (ads.length === 0) return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎨</div>
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>No ad data to analyse</div>
        <div>Load competitor ads in the <strong>Ad Intelligence</strong> tab first, then come back here for creative insights.</div>
      </div>
    );

    const words = wordFrequency(ads);

    // Creative type breakdown
    const mediaTypes: Record<string, number> = {};
    for (const ad of ads) {
      const t = ad.mediaType || 'UNKNOWN';
      mediaTypes[t] = (mediaTypes[t] ?? 0) + 1;
    }
    const mediaData = Object.entries(mediaTypes).map(([name, value]) => ({ name, value }));

    // Platform distribution
    const platforms: Record<string, number> = {};
    for (const ad of ads) {
      for (const p of ad.platforms) {
        platforms[p] = (platforms[p] ?? 0) + 1;
      }
    }
    const platformData = Object.entries(platforms)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    // Ad activity by month
    const monthly: Record<string, number> = {};
    for (const ad of ads) {
      if (ad.startDate) {
        const month = ad.startDate.slice(0, 7); // YYYY-MM
        monthly[month] = (monthly[month] ?? 0) + 1;
      }
    }
    const monthlyData = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month: month.replace('-', ' / '), count }));

    // Active vs inactive
    const activeCount = ads.filter((a) => a.status === 'active').length;
    const inactiveCount = ads.length - activeCount;

    return (
      <>
        {/* Summary row */}
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <div className="kpi-card blue">
            <div className="kpi-icon">📢</div>
            <div className="kpi-label">Total Ads Found</div>
            <div className="kpi-value">{ads.length}</div>
          </div>
          <div className="kpi-card emerald">
            <div className="kpi-icon">🟢</div>
            <div className="kpi-label">Active Ads</div>
            <div className="kpi-value">{activeCount}</div>
            <div className="kpi-subtext">{ads.length > 0 ? `${((activeCount / ads.length) * 100).toFixed(0)}% of total` : ''}</div>
          </div>
          <div className="kpi-card violet">
            <div className="kpi-icon">📸</div>
            <div className="kpi-label">Unique Pages</div>
            <div className="kpi-value">{new Set(ads.map((a) => a.pageId)).size}</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-icon">📝</div>
            <div className="kpi-label">Ads with Copy</div>
            <div className="kpi-value">{ads.filter((a) => a.adCopy.length > 0).length}</div>
          </div>
        </div>

        <div className="charts-grid cols-2">
          {/* Word frequency */}
          {words.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Top Keywords in Ad Copy</div>
                  <div className="chart-card-subtitle">Most frequent words across all competitor ads (stop words removed)</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Word</th><th>Occurrences</th><th>Frequency</th></tr></thead>
                  <tbody>
                    {words.map((w, i) => (
                      <tr key={w.word}>
                        <td className="mono">{i + 1}</td>
                        <td className="highlight" style={{ fontWeight: 600 }}>{w.word}</td>
                        <td className="mono">{w.count}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(w.count / words[0].count) * 100}%`, background: 'var(--accent-blue)', borderRadius: '3px' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Creative type */}
          {mediaData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Creative Types</div>
                  <div className="chart-card-subtitle">Ad format distribution across competitors</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={mediaData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {mediaData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                {mediaData.map((m, i) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C[i % C.length], flexShrink: 0 }} />
                    {m.name}: <strong>{m.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform distribution */}
          {platformData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Platform Distribution</div>
                  <div className="chart-card-subtitle">Where competitors are advertising</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis type="category" dataKey="platform" stroke="var(--text-dim)" fontSize={11} width={120} />
                  <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                  <Bar dataKey="count" name="Ads" radius={[0, 6, 6, 0]}>
                    {platformData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly activity */}
          {monthlyData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Ad Activity Over Time</div>
                  <div className="chart-card-subtitle">Number of ads started per month</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                  <Bar dataKey="count" name="Ads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Active vs inactive */}
          {ads.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Ad Status Breakdown</div>
                  <div className="chart-card-subtitle">Currently active vs stopped campaigns</div>
                </div>
              </div>
              <div style={{ padding: '20px 8px' }}>
                {[
                  { label: 'Active', count: activeCount, color: 'var(--accent-green)' },
                  { label: 'Inactive', count: inactiveCount, color: 'var(--accent-rose)' },
                ].map((item) => (
                  <div key={item.label} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.count} ads ({ads.length > 0 ? ((item.count / ads.length) * 100).toFixed(0) : 0}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${ads.length > 0 ? (item.count / ads.length) * 100 : 0}%`, background: item.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>🔍 Competitor Ads</h2>
            <p>Track competitor advertising, benchmark performance, and analyse creative strategies</p>
          </div>
          {slug && (
            <Link href={`/dashboard/${slug}/settings#competitor`} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
              ⚙️ Manage Competitors
            </Link>
          )}
        </div>
      </div>

      <div className="dashboard-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {activeTab === 'intelligence' && <IntelligenceTab />}
        {activeTab === 'benchmark'    && <BenchmarkTab />}
        {activeTab === 'creative'     && <CreativeTab />}
      </div>
    </>
  );
}
