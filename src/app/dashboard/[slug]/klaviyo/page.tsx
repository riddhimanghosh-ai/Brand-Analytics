'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface KlaviyoKPIs {
  totalRevenue: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  campaignsSent: number;
  activeFlows: number;
  totalProfiles: number;
  newProfiles30d: number;
}

interface KlaviyoCampaign {
  id: string;
  name: string;
  status: string;
  sentAt: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  revenue: number;
  unsubscribeRate: number;
}

interface KlaviyoData {
  kpis: KlaviyoKPIs | null;
  campaigns: KlaviyoCampaign[];
  flows: Array<{
    id: string;
    name: string;
    status: string;
    triggerType: string;
    revenue30d: number;
    emails30d: number;
  }>;
  error?: string;
}

export default function KlaviyoPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<KlaviyoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/klaviyo?slug=${slug}`);
        if (!res.ok) throw new Error('Failed to fetch Klaviyo data');
        const result = await res.json();
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading Klaviyo data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>Loading Klaviyo data...</div>
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
        <div style={{ color: 'var(--text-muted)' }}>No Klaviyo data available. Connect your account in Settings.</div>
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>📧 Klaviyo Email Marketing</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Campaign performance, revenue & engagement metrics (Last 30 days)</p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[
          { label: 'Total Revenue', value: `₹${kpis.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#10b981' },
          { label: 'Campaigns Sent', value: kpis.campaignsSent.toLocaleString(), color: '#3b82f6' },
          { label: 'Active Subscribers', value: kpis.totalProfiles.toLocaleString(), color: '#8b5cf6' },
          { label: 'Active Flows', value: kpis.activeFlows.toLocaleString(), color: '#f59e0b' },
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
          { label: 'Open Rate', value: (kpis.openRate * 100).toFixed(2) + '%' },
          { label: 'Click Rate', value: (kpis.clickRate * 100).toFixed(2) + '%' },
          { label: 'Bounce Rate', value: (kpis.bounceRate * 100).toFixed(2) + '%' },
          { label: 'Unsubscribe Rate', value: (kpis.unsubscribeRate * 100).toFixed(2) + '%' },
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
              {['Campaign Name', 'Recipients', 'Open Rate', 'Click Rate', 'Revenue', 'Status'].map((h) => (
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
                <td style={{ padding: '12px 16px' }}>{c.recipients.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#3b82f6', fontWeight: '600' }}>{(c.openRate * 100).toFixed(2)}%</td>
                <td style={{ padding: '12px 16px', color: '#8b5cf6', fontWeight: '600' }}>{(c.clickRate * 100).toFixed(2)}%</td>
                <td style={{ padding: '12px 16px' }}>₹{c.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '600', color: '#10b981' }}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
