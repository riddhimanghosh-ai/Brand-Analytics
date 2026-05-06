'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from 'recharts';

interface DataPoint {
  date: string;
  revenue?: number;
  orders?: number;
  aov?: number;
  predicted?: number;
  revenueHigh?: number;
  revenueLow?: number;
  type: 'historical' | 'forecast';
  displayDate: string;
}

interface Summary {
  forecastTotal: number;
  forecastAvg: number;
  historicalAvg: number;
  growthPct: number;
  horizon: number;
  trendSlope: number;
}

const fmt = (n: number) =>
  n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${Math.round(n)}`;

const fmtDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function ForecastPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [horizon, setHorizon] = useState(30);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [data, setData] = useState<DataPoint[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiInsight, setAiInsight] = useState('');

  const loadForecast = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    setAiInsight('');

    try {
      const res = await fetch(`/api/forecast?slug=${slug}&horizon=${horizon}`);
      const json = await res.json();

      if (!res.ok) { setError(json.error || 'Failed to load forecast'); return; }

      const today = new Date().toISOString().split('T')[0];

      // Merge historical + forecast into one chart series
      const combined: DataPoint[] = [
        ...json.historical.map((d: { date: string; revenue: number; orders: number; aov: number }) => ({
          date: d.date,
          revenue: d.revenue,
          orders: d.orders,
          aov: d.aov,
          type: 'historical' as const,
          displayDate: fmtDate(d.date),
        })),
        ...json.forecast.map((d: { date: string; revenue: number; revenueHigh: number; revenueLow: number; orders: number }) => ({
          date: d.date,
          predicted: d.revenue,
          revenueHigh: d.revenueHigh,
          revenueLow: d.revenueLow,
          orders: d.orders,
          type: 'forecast' as const,
          displayDate: fmtDate(d.date),
        })),
      ];

      setData(combined);
      setSummary(json.summary);

      // Fetch AI insight via chat API
      const growthWord = json.summary.growthPct >= 0 ? 'grow' : 'decline';
      const prompt = `Based on my store data, revenue is projected to ${growthWord} ${Math.abs(json.summary.growthPct)}% over the next ${horizon} days. Forecast total: ${fmt(json.summary.forecastTotal)}. Historical daily avg: ${fmt(json.summary.historicalAvg)}. Give me a 2-3 sentence plain-English insight about this forecast and one key action I should take.`;

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: [{ role: 'user', content: prompt }] }),
      });

      if (chatRes.ok) {
        const reader = chatRes.body?.getReader();
        const decoder = new TextDecoder();
        let insight = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value).split('\n')) {
              if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.text) insight += parsed.text;
                } catch { /* skip */ }
              }
            }
          }
        }
        setAiInsight(insight);
      }
    } catch (e) {
      setError('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  }, [slug, horizon]);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDisplay = fmtDate(todayStr);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>📈 Revenue Forecast</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            ML-powered prediction based on your last 90 days of data
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Metric toggle */}
          {['revenue', 'orders'].map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m as 'revenue' | 'orders')}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: metric === m ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: metric === m ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize',
              }}
            >
              {m}
            </button>
          ))}
          {/* Horizon toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
            {[30, 60, 90].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                style={{
                  padding: '6px 14px', border: 'none',
                  background: horizon === h ? 'var(--accent-blue)' : 'transparent',
                  color: horizon === h ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '13px',
                }}
              >
                {h}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          Generating forecast...
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: `Forecast (${horizon}d)`, value: fmt(summary.forecastTotal), sub: 'total projected revenue', color: '#6366f1' },
              { label: 'Daily Average', value: fmt(summary.forecastAvg), sub: 'projected daily revenue', color: '#22c55e' },
              { label: 'vs Historical', value: `${summary.growthPct >= 0 ? '+' : ''}${summary.growthPct}%`, sub: 'growth vs last 90d avg', color: summary.growthPct >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Trend', value: summary.trendSlope >= 0 ? '↗ Upward' : '↘ Downward', sub: `₹${Math.abs(summary.trendSlope)}/day slope`, color: summary.trendSlope >= 0 ? '#22c55e' : '#f59e0b' },
            ].map((kpi) => (
              <div key={kpi.label} style={{
                padding: '20px', borderRadius: '14px', background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{kpi.label}</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ padding: '24px', borderRadius: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
                {metric === 'revenue' ? 'Revenue Forecast' : 'Orders Forecast'}
              </h3>
              <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '2px', background: '#6366f1' }} /> Historical
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '2px', background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} /> Forecast
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '8px', background: 'rgba(245,158,11,0.2)', borderRadius: '2px' }} /> Confidence
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  interval={Math.floor(data.length / 8)}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={metric === 'revenue' ? (v) => `₹${(v / 1000).toFixed(0)}K` : (v) => String(v)}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  formatter={(value: unknown, name: unknown) => {
                    const v = Number(value);
                    const n = String(name);
                    const label = n === 'revenue' ? 'Actual' : n === 'predicted' ? 'Forecast' : n;
                    return [metric === 'revenue' ? fmt(v) : v, label] as [string | number, string];
                  }}
                />
                <ReferenceLine x={todayDisplay} stroke="#6366f1" strokeDasharray="6 3" label={{ value: 'Today', fill: '#6366f1', fontSize: 11 }} />

                {/* Confidence band */}
                {metric === 'revenue' && (
                  <Area dataKey="revenueHigh" fill="rgba(245,158,11,0.15)" stroke="none" />
                )}
                {metric === 'revenue' && (
                  <Area dataKey="revenueLow" fill="var(--bg-elevated)" stroke="none" />
                )}

                {/* Historical line */}
                <Line
                  dataKey={metric === 'revenue' ? 'revenue' : 'orders'}
                  stroke="#6366f1" strokeWidth={2} dot={false} connectNulls
                />
                {/* Forecast line (dashed) */}
                <Line
                  dataKey={metric === 'revenue' ? 'predicted' : 'orders'}
                  stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insight */}
          {aiInsight && (
            <div style={{
              padding: '20px 24px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', gap: '16px', alignItems: 'flex-start',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
              }}>✨</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>AI Forecast Insight</div>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>{aiInsight}</div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
            Forecast based on linear trend + 7-day moving average + weekday seasonality. Actual results may vary due to campaigns, promotions, or external factors.
          </div>
        </>
      )}
    </div>
  );
}
