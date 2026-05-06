'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TikTokKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  videoViews: number;
  reach: number;
}

interface TikTokCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  videoViews: number;
}

interface TikTokData {
  kpis: TikTokKPIs | null;
  campaigns: TikTokCampaign[];
  error?: string;
}

export default function TikTokPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<TikTokData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/tiktok?slug=${slug}`);
        if (!res.ok) throw new Error('Failed to fetch TikTok data');
        const result = await res.json();
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading TikTok data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>Loading TikTok data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '16px',
          color: '#ef4444',
        }}>
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ color: 'var(--text-muted)' }}>No TikTok data available. Connect your account in Settings.</div>
      </div>
    );
  }

  const kpis = data.kpis;
  const cpm = kpis.spend > 0 ? (kpis.spend / kpis.impressions) * 1000 : 0;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>🎵 TikTok Ads</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Campaign performance, spend & ROAS (Last 30 days)</p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[
          { label: 'Total Spend', value: `₹${kpis.spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#ef4444' },
          { label: 'Conversions', value: kpis.conversions.toLocaleString(), color: '#10b981' },
          { label: 'ROAS', value: `${kpis.roas.toFixed(2)}x`, color: '#3b82f6' },
          { label: 'CPM', value: `₹${cpm.toFixed(0)}`, color: '#f59e0b' },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: kpi.color,
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[
          { label: 'Impressions', value: (kpis.impressions / 1000).toFixed(1) + 'K' },
          { label: 'Clicks', value: kpis.clicks.toLocaleString() },
          { label: 'CTR', value: (kpis.ctr * 100).toFixed(2) + '%' },
          { label: 'CPC', value: `₹${kpis.cpc.toFixed(0)}` },
        ].map((m) => (
          <div key={m.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Campaigns Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Top Campaigns</h2>
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}>
          <thead style={{
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
          }}>
            <tr>
              {['Campaign Name', 'Spend', 'Clicks', 'Conversions', 'ROAS'].map((h) => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c, i) => (
              <tr key={c.id} style={{
                borderBottom: i < data.campaigns.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{c.name}</td>
                <td style={{ padding: '12px 16px' }}>₹{c.spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style={{ padding: '12px 16px' }}>{c.clicks.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '600' }}>{c.conversions.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#3b82f6', fontWeight: '600' }}>{c.roas.toFixed(2)}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
