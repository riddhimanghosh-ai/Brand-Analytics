'use client';

import { useState } from 'react';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'drops_below' | 'rises_above';
  threshold: number;
  enabled: boolean;
}

interface AlertRulesProps {
  slug: string;
  initialRules: AlertRule[];
  currentValues: Record<string, number>; // metric key → current value
}

const METRICS = [
  { key: 'aov',               label: 'Avg Order Value (₹)',      format: (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
  { key: 'repeatRate',        label: 'Repeat Customer Rate (%)', format: (v: number) => `${v.toFixed(1)}%` },
  { key: 'refundRate',        label: 'Refund Rate (%)',           format: (v: number) => `${v.toFixed(2)}%` },
  { key: 'totalOrders',       label: 'Total Orders',             format: (v: number) => v.toLocaleString('en-IN') },
  { key: 'totalRevenue',      label: 'Total Revenue (₹)',        format: (v: number) => `₹${(v / 100000).toFixed(2)}L` },
  { key: 'purchaseFrequency', label: 'Purchase Frequency (×)',   format: (v: number) => `${v.toFixed(2)}×` },
  { key: 'revenuePerOrder',   label: 'Revenue per Order (₹)',    format: (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
];

function isTriggered(rule: AlertRule, current: Record<string, number>): boolean {
  const val = current[rule.metric];
  if (val === undefined || val === null) return false;
  if (rule.operator === 'drops_below') return val < rule.threshold;
  if (rule.operator === 'rises_above') return val > rule.threshold;
  return false;
}

export function AlertRules({ slug, initialRules, currentValues }: AlertRulesProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules);
  const [saving, setSaving] = useState(false);

  // New rule form state
  const [newMetric, setNewMetric]     = useState(METRICS[0].key);
  const [newOperator, setNewOperator] = useState<'drops_below' | 'rises_above'>('drops_below');
  const [newThreshold, setNewThreshold] = useState('');
  const [newName, setNewName]         = useState('');
  const [adding, setAdding]           = useState(false);

  async function persist(updated: AlertRule[]) {
    setSaving(true);
    try {
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertRules: updated }),
      });
    } finally {
      setSaving(false);
    }
  }

  const addRule = async () => {
    if (!newThreshold || isNaN(parseFloat(newThreshold))) return;
    const label = METRICS.find(m => m.key === newMetric)?.label ?? newMetric;
    const name = newName.trim() || `${label} ${newOperator === 'drops_below' ? 'drops below' : 'rises above'} ${newThreshold}`;
    const rule: AlertRule = {
      id: Date.now().toString(),
      name,
      metric: newMetric,
      operator: newOperator,
      threshold: parseFloat(newThreshold),
      enabled: true,
    };
    const updated = [...rules, rule];
    setRules(updated);
    setNewName('');
    setNewThreshold('');
    setAdding(false);
    await persist(updated);
  };

  const toggleRule = async (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);
    await persist(updated);
  };

  const deleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    await persist(updated);
  };

  const triggeredRules = rules.filter(r => r.enabled && isTriggered(r, currentValues));

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div>
      {/* Triggered alerts banner */}
      {triggeredRules.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
            🔴 {triggeredRules.length} Alert{triggeredRules.length > 1 ? 's' : ''} Triggered
          </div>
          {triggeredRules.map(r => {
            const meta = METRICS.find(m => m.key === r.metric);
            const cur = currentValues[r.metric];
            return (
              <div key={r.id} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                ⚠️ <strong>{r.name}</strong> — current: {meta ? meta.format(cur) : cur} (threshold: {r.threshold})
              </div>
            );
          })}
        </div>
      )}

      {/* Rules list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {rules.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '12px 0' }}>
            No alert rules yet. Add one below.
          </div>
        )}
        {rules.map(rule => {
          const meta  = METRICS.find(m => m.key === rule.metric);
          const cur   = currentValues[rule.metric];
          const fired = rule.enabled && isTriggered(rule, currentValues);
          return (
            <div
              key={rule.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px',
                background: fired ? 'rgba(239,68,68,0.06)' : 'var(--bg-elevated)',
                border: `1px solid ${fired ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                borderRadius: '8px',
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleRule(rule.id)}
                title={rule.enabled ? 'Disable' : 'Enable'}
                style={{
                  width: '32px', height: '18px', borderRadius: '9px', border: 'none',
                  background: rule.enabled ? (fired ? '#ef4444' : '#22c55e') : 'var(--border-color)',
                  cursor: 'pointer', flexShrink: 0, position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px',
                  left: rule.enabled ? '14px' : '2px',
                  width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>

              {/* Rule info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: fired ? '#ef4444' : 'var(--text-primary)' }}>
                  {fired ? '🔴 ' : rule.enabled ? '🟢 ' : '⚫ '}
                  {rule.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {meta?.label} {rule.operator === 'drops_below' ? '< ' : '> '}{rule.threshold}
                  {cur !== undefined && ` · now: ${meta ? meta.format(cur) : cur}`}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteRule(rule.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}
                title="Delete rule"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add rule form */}
      {adding ? (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>New Alert Rule</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>RULE NAME (optional)</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Low AOV Warning"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>METRIC</label>
              <select value={newMetric} onChange={e => setNewMetric(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CONDITION</label>
              <select value={newOperator} onChange={e => setNewOperator(e.target.value as 'drops_below' | 'rises_above')} style={{ ...selectStyle, width: '100%' }}>
                <option value="drops_below">Drops below</option>
                <option value="rises_above">Rises above</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>THRESHOLD VALUE</label>
              <input
                type="number"
                value={newThreshold}
                onChange={e => setNewThreshold(e.target.value)}
                placeholder="e.g. 1000"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && addRule()}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={addRule}
              disabled={!newThreshold || saving}
              className="btn btn-primary"
              style={{ fontSize: '13px' }}
            >
              {saving ? '⏳ Saving...' : '+ Add Alert'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="btn btn-secondary"
              style={{ fontSize: '13px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            padding: '8px 16px', fontSize: '13px', fontWeight: '600',
            background: 'transparent', border: '1px dashed var(--border-color)',
            borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
            width: '100%', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          + Add Alert Rule
        </button>
      )}
    </div>
  );
}
