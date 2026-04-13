'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunnelStage {
  name: string;
  count: number;
  revenue?: number;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  title?: string;
}

export function ConversionFunnel({ stages, title = 'Conversion Funnel' }: ConversionFunnelProps) {
  if (!stages || stages.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No funnel data available</div>;
  }

  const maxCount = Math.max(...stages.map(s => s.count));

  const funnelData = stages.map((stage, idx) => ({
    name: stage.name,
    count: stage.count,
    revenue: stage.revenue || 0,
    dropoff: idx === 0 ? 0 : Math.round(((stages[idx - 1].count - stage.count) / stages[idx - 1].count) * 100),
    conversionFromStart: Math.round((stage.count / stages[0].count) * 100),
  }));

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>{title}</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={funnelData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis type="number" stroke="var(--text-secondary)" />
          <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={100} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            formatter={(value) => value.toLocaleString()}
          />
          <Bar dataKey="count" fill="#3b82f6">
            {funnelData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {funnelData.map((stage, idx) => (
          <div key={stage.name} style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: `3px solid ${colors[idx % colors.length]}` }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{stage.name}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{stage.count.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {stage.conversionFromStart}% of start
              {stage.dropoff > 0 && <span style={{ color: '#ef4444', marginLeft: '8px' }}>↓ {stage.dropoff}% dropout</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
