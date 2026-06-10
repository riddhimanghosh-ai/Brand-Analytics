'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

interface GoalsData {
  target: number | null;
  monthLabel: string;
  daysInMonth: number;
  dayOfMonth: number;
  daysRemaining: number;
  mtdRevenue: number;
  mtdOrders: number;
  dailyRunRate: number;
  projectedRevenue: number;
  neededPerDay: number;
  prevMonthRevenue: number;
  cumulativeSeries: { date: string; revenue: number; cumulative: number }[];
}

export default function GoalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/goals?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setTargetInput(d.target ? String(d.target) : '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function saveTarget() {
    setSaving(true);
    try {
      const r = await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyRevenueTarget: targetInput ? parseFloat(targetInput) : null,
        }),
      });
      if (r.ok) {
        setEditing(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  const progressPct = data?.target ? Math.min(100, (data.mtdRevenue / data.target) * 100) : 0;
  // Where we *should* be by today if pacing linearly toward the target
  const expectedPct = data ? (data.dayOfMonth / data.daysInMonth) * 100 : 0;
  const onTrack = data?.target ? data.projectedRevenue >= data.target : false;
  const monthOverMonth = data && data.prevMonthRevenue > 0
    ? ((data.projectedRevenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              🎯 Revenue Goal
            </h2>
            <p>{data ? `${data.monthLabel} — day ${data.dayOfMonth} of ${data.daysInMonth}` : 'Monthly target & pace tracking'}</p>
          </div>
          <button
            onClick={() => setEditing(v => !v)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' }}
          >
            🎯 {data?.target ? 'Edit Target' : 'Set Target'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Target editor */}
        {(editing || (data && !data.target && !loading)) && (
          <div className="chart-card" style={{ marginBottom: '24px', background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.2)' }}>
            <div className="chart-card-title" style={{ marginBottom: '12px' }}>
              {data?.target ? 'Update monthly revenue target' : 'Set your monthly revenue target'}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '420px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>₹</span>
                <input
                  type="number"
                  className="form-input"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  placeholder="e.g. 2500000"
                  min="0"
                  style={{ paddingLeft: '28px', width: '100%' }}
                />
              </div>
              <button onClick={saveTarget} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? 'Saving…' : '💾 Save'}
              </button>
              {data?.target && (
                <button onClick={() => setEditing(false)} className="btn btn-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="chart-card" style={{ marginBottom: '24px' }}>
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '40px', marginBottom: '12px' }} />
            <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px' }} />
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: '24px' }}>
            ❌ {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Progress hero */}
            <div className="chart-card" style={{ marginBottom: '24px', padding: '28px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em' }}>{fmt(data.mtdRevenue)}</span>
                  {data.target && (
                    <span style={{ fontSize: '16px', color: 'var(--text-dim)', marginLeft: '10px' }}>of {fmt(data.target)} target</span>
                  )}
                </div>
                {data.target && (
                  <span style={{
                    fontSize: '14px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                    background: onTrack ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                    color: onTrack ? '#22c55e' : '#f87171',
                  }}>
                    {onTrack ? '✅ On track' : '⚠️ Behind pace'} · projecting {fmt(data.projectedRevenue)}
                  </span>
                )}
              </div>

              {data.target ? (
                <>
                  {/* Progress bar with expected-pace marker */}
                  <div style={{ position: 'relative', height: '18px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', overflow: 'visible' }}>
                    <div style={{
                      height: '100%', width: `${progressPct}%`, borderRadius: '10px',
                      background: onTrack
                        ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                        : 'linear-gradient(90deg, #d97706, #f59e0b)',
                      transition: 'width 0.6s ease',
                    }} />
                    {/* Expected pace marker */}
                    <div style={{
                      position: 'absolute', top: '-4px', bottom: '-4px', left: `${expectedPct}%`,
                      width: '2px', background: 'var(--text-secondary)', opacity: 0.7,
                    }} />
                    <div style={{
                      position: 'absolute', top: '-22px', left: `${expectedPct}%`, transform: 'translateX(-50%)',
                      fontSize: '10px', color: 'var(--text-dim)', whiteSpace: 'nowrap',
                    }}>
                      pace ↓
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    <span>{progressPct.toFixed(1)}% achieved</span>
                    <span>{expectedPct.toFixed(0)}% of month elapsed</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                  Set a monthly target above to track your pace
                </div>
              )}
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  label: 'Daily Run Rate', value: fmt(data.dailyRunRate),
                  sub: `Avg over ${data.dayOfMonth} days`, color: 'var(--text-primary)',
                },
                {
                  label: 'Needed Per Day', value: data.target ? (data.neededPerDay > 0 ? fmt(data.neededPerDay) : '🎉 Hit!') : '—',
                  sub: data.target ? `${data.daysRemaining} days remaining` : 'Set a target first',
                  color: data.target && data.neededPerDay > data.dailyRunRate * 1.2 ? '#f43f5e' : '#22c55e',
                },
                {
                  label: 'Projected Month-End', value: fmt(data.projectedRevenue),
                  sub: 'At current run rate',
                  color: data.target ? (onTrack ? '#22c55e' : '#f59e0b') : 'var(--text-primary)',
                },
                {
                  label: 'vs Last Month', value: data.prevMonthRevenue > 0 ? `${monthOverMonth >= 0 ? '+' : ''}${monthOverMonth.toFixed(1)}%` : '—',
                  sub: `Last month: ${fmt(data.prevMonthRevenue)}`,
                  color: monthOverMonth >= 0 ? '#22c55e' : '#f43f5e',
                },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-subtext">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Cumulative chart */}
            {data.cumulativeSeries.length > 1 && (
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">📈 Cumulative Revenue This Month</div>
                    <div className="chart-card-subtitle">Running total vs target line</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={data.cumulativeSeries} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tickFormatter={fmtDate} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip
                      formatter={(value, name) => [fmt(Number(value)), name]}
                      labelFormatter={(d) => fmtDate(String(d))}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="cumulative" name="Cumulative Revenue" stroke="#22c55e" fill="url(#cumGrad)" strokeWidth={2} dot={false} />
                    {data.target && (
                      <ReferenceLine y={data.target} stroke="#a78bfa" strokeDasharray="6 3" label={{ value: `Target ${fmt(data.target)}`, fontSize: 11, fill: '#a78bfa', position: 'insideTopLeft' }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
