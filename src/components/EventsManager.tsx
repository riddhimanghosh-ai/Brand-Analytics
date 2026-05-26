'use client';

import { useState, useMemo } from 'react';
import type { BrandEvent } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

type EventStatus = 'active' | 'upcoming' | 'ended';

function getStatus(ev: BrandEvent): EventStatus {
  const now = new Date();
  const start = new Date(ev.startDate + 'T' + (ev.startTime ?? '00:00'));
  const end   = new Date(ev.endDate   + 'T' + (ev.endTime   ?? '23:59'));
  if (now < start) return 'upcoming';
  if (now > end)   return 'ended';
  return 'active';
}

function durationDays(ev: BrandEvent): number {
  const s = new Date(ev.startDate);
  const e = new Date(ev.endDate);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── config ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<BrandEvent['type'], { label: string; color: string; emoji: string }> = {
  bogo:           { label: 'Buy 1 Get 1',    color: '#a855f7', emoji: '🎁' },
  bundle:         { label: 'Bundle',          color: '#3b82f6', emoji: '📦' },
  discount_pct:   { label: '% Discount',      color: '#22c55e', emoji: '🏷️' },
  discount_fixed: { label: 'Fixed Discount',  color: '#10b981', emoji: '💸' },
  flash_sale:     { label: 'Flash Sale',      color: '#ef4444', emoji: '⚡' },
  free_shipping:  { label: 'Free Shipping',   color: '#06b6d4', emoji: '🚚' },
  loyalty:        { label: 'Loyalty Reward',  color: '#f59e0b', emoji: '⭐' },
  other:          { label: 'Other',           color: '#6b7280', emoji: '📋' },
};

const CHANNEL_META: Record<string, { label: string; emoji: string }> = {
  email:     { label: 'Email',     emoji: '📧' },
  whatsapp:  { label: 'WhatsApp',  emoji: '💬' },
  instagram: { label: 'Instagram', emoji: '📸' },
  paid_ads:  { label: 'Paid Ads',  emoji: '📢' },
  website:   { label: 'Website',   emoji: '🌐' },
  in_store:  { label: 'In-Store',  emoji: '🏪' },
};

const ALL_CHANNELS = Object.keys(CHANNEL_META);

const STATUS_STYLE: Record<EventStatus, { bg: string; border: string; color: string; label: string }> = {
  active:   { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.35)',  color: '#22c55e', label: 'Active'    },
  upcoming: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.35)', color: '#3b82f6', label: 'Upcoming'  },
  ended:    { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', color: '#9ca3af', label: 'Ended'  },
};

// ── default form state ────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  title: '',
  type: 'discount_pct' as BrandEvent['type'],
  description: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  audience: 'all' as BrandEvent['audience'],
  audienceDetails: '',
  channels: [] as string[],
  tags: '',
  discountValue: '',
  discountUnit: 'pct' as 'pct' | 'fixed',
  notes: '',
  revenueTarget: '',
};

type FormState = typeof DEFAULT_FORM;

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EventStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {status === 'active' && (
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
      )}
      {s.label}
    </span>
  );
}

function TypePill({ type }: { type: BrandEvent['type'] }) {
  const m = TYPE_META[type];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
      background: m.color + '20', border: `1px solid ${m.color}40`, color: m.color,
    }}>
      {m.emoji} {m.label}
    </span>
  );
}

function TagPill({ tag, onClick, active }: { tag: string; onClick?: () => void; active?: boolean }) {
  return (
    <span
      onClick={onClick}
      style={{
        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500',
        background: active ? 'var(--accent-blue)' : 'rgba(59,130,246,0.1)',
        color: active ? '#fff' : 'var(--accent-blue)',
        border: '1px solid rgba(59,130,246,0.2)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {tag}
    </span>
  );
}

// ── Timeline strip (mini horizontal bar for current month) ───────────────────

function TimelineStrip({ events }: { events: BrandEvent[] }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const totalDays  = monthEnd.getDate();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const strips = events.map(ev => {
    const s = new Date(ev.startDate + 'T12:00');
    const e = new Date(ev.endDate   + 'T12:00');
    const clampS = s < monthStart ? monthStart : s;
    const clampE = e > monthEnd   ? monthEnd   : e;
    if (clampE < monthStart || clampS > monthEnd) return null;
    const leftPct  = ((clampS.getDate() - 1) / totalDays) * 100;
    const widthPct = Math.max(((clampE.getDate() - clampS.getDate() + 1) / totalDays) * 100, 1.5);
    const tm = TYPE_META[ev.type];
    return { ev, leftPct, widthPct, color: tm.color };
  }).filter(Boolean) as { ev: BrandEvent; leftPct: number; widthPct: number; color: string }[];

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
      borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        📅 {monthLabel} — Event Timeline
      </div>
      {/* Day markers */}
      <div style={{ position: 'relative', height: '6px', background: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '6px' }}>
        {strips.map(({ ev, leftPct, widthPct, color }) => (
          <div
            key={ev.id}
            title={ev.title}
            style={{
              position: 'absolute', top: 0, left: `${leftPct}%`, width: `${widthPct}%`,
              height: '100%', borderRadius: '3px', background: color, opacity: 0.85,
            }}
          />
        ))}
      </div>
      {/* Day labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
        {[1, Math.ceil(totalDays / 4), Math.ceil(totalDays / 2), Math.ceil(totalDays * 3 / 4), totalDays].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {strips.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '4px' }}>No events this month</div>
      )}
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        paddingBottom: '8px', borderBottom: '1px solid var(--border-color)',
        marginBottom: '14px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: '1 / -1' } : {}}>
      <label style={{
        fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        display: 'block', marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EventForm({
  form, setForm, onSave, onCancel, saving, editId,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  editId: string | null;
}) {
  const inp: React.CSSProperties = {
    padding: '9px 12px', background: 'var(--bg-primary)',
    border: '1.5px solid rgba(150,150,160,0.5)', borderRadius: '8px',
    color: 'var(--text-primary)', fontSize: '13px', width: '100%', boxSizing: 'border-box',
    lineHeight: '1.4',
  };
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

  function toggleChannel(ch: string) {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderRadius: '14px',
      padding: '24px',
      marginBottom: '20px',
    }}>
      {/* Form header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        paddingBottom: '16px', borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
        }}>
          {editId ? '✏️' : '➕'}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {editId ? 'Edit Event' : 'New Event'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Fill in the details below to {editId ? 'update' : 'log'} this campaign
          </div>
        </div>
      </div>

      {/* ── Section 1: Basic Info ── */}
      <FormSection title="Basic Info">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <Field label="Event Title *">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Buy 1 Get 1 Free – 20ml range"
              style={inp}
            />
          </Field>
          <Field label="Event Type">
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as BrandEvent['type'] }))}
              style={sel}
            >
              {(Object.keys(TYPE_META) as BrandEvent['type'][]).map(t => (
                <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description / Offer Details">
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Buy any 3 products for ₹1999. Applicable on all 20ml SKUs."
            rows={2}
            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Schedule ── */}
      <FormSection title="Schedule">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Start */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>🟢 Start</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Field label="Date *">
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
              </Field>
              <Field label="Time">
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inp} />
              </Field>
            </div>
          </div>
          {/* End */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>🔴 End</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Field label="Date *">
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
              </Field>
              <Field label="Time">
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={inp} />
              </Field>
            </div>
          </div>
        </div>
      </FormSection>

      {/* ── Section 3: Offer Details ── */}
      <FormSection title="Offer Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Discount Value">
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                placeholder="e.g. 20"
                style={{ ...inp, flex: 1 }}
              />
              <select
                value={form.discountUnit}
                onChange={e => setForm(f => ({ ...f, discountUnit: e.target.value as 'pct' | 'fixed' }))}
                style={{ ...sel, width: '68px', flex: 'none' }}
              >
                <option value="pct">%</option>
                <option value="fixed">₹</option>
              </select>
            </div>
          </Field>
          <Field label="Revenue Target (₹)">
            <input
              type="number"
              value={form.revenueTarget}
              onChange={e => setForm(f => ({ ...f, revenueTarget: e.target.value }))}
              placeholder="e.g. 500000"
              style={inp}
            />
          </Field>
        </div>
      </FormSection>

      {/* ── Section 4: Targeting ── */}
      <FormSection title="Targeting">
        <Field label="Target Audience">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: form.audience !== 'all' ? '10px' : '0' }}>
            {(['all', 'campaign', 'specific'] as const).map(a => {
              const active = form.audience === a;
              return (
                <label key={a} style={{
                  display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                  background: active ? 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                  border: `1px solid ${active ? 'rgba(59,130,246,0.4)' : 'var(--border-color)'}`,
                  color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="audience" value={a} checked={active}
                    onChange={() => setForm(f => ({ ...f, audience: a }))} style={{ display: 'none' }} />
                  {a === 'all' ? '👥 All Users' : a === 'campaign' ? '📣 Campaign Users' : '🎯 Specific Segment'}
                </label>
              );
            })}
          </div>
          {form.audience !== 'all' && (
            <input
              value={form.audienceDetails}
              onChange={e => setForm(f => ({ ...f, audienceDetails: e.target.value }))}
              placeholder={form.audience === 'campaign' ? 'Campaign name (e.g. Diwali email list)' : 'Segment description (e.g. VIP customers, 3+ orders)'}
              style={inp}
            />
          )}
        </Field>

        <div style={{ marginTop: '14px' }}>
          <Field label="Channels">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              {ALL_CHANNELS.map(ch => {
                const m = CHANNEL_META[ch];
                const checked = form.channels.includes(ch);
                return (
                  <label key={ch} style={{
                    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                    background: checked ? 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                    border: `1px solid ${checked ? 'rgba(59,130,246,0.4)' : 'var(--border-color)'}`,
                    color: checked ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleChannel(ch)} style={{ display: 'none' }} />
                    {m.emoji} {m.label}
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
      </FormSection>

      {/* ── Section 5: Notes & Tags ── */}
      <FormSection title="Notes & Tags">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Tags (comma-separated)">
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. Diwali, Summer, Product Launch"
              style={inp}
            />
          </Field>
          <Field label="Internal Notes">
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="What worked, what didn't..."
              style={inp}
            />
          </Field>
        </div>
      </FormSection>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: '10px', alignItems: 'center',
        paddingTop: '16px', borderTop: '1px solid var(--border-color)',
      }}>
        <button
          onClick={onSave}
          disabled={!form.title || !form.startDate || !form.endDate || saving}
          className="btn btn-primary"
          style={{ fontSize: '13px', padding: '9px 20px' }}
        >
          {saving ? '⏳ Saving...' : editId ? '💾 Save Changes' : '➕ Add Event'}
        </button>
        <button onClick={onCancel} className="btn btn-secondary" style={{ fontSize: '13px', padding: '9px 16px' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Metric presets ────────────────────────────────────────────────────────────

const METRIC_PRESETS = [
  { id: 'revenue',   label: 'Revenue',      emoji: '💰', group: 'Sales',    query: (s: string, e: string) => `FROM sales SHOW gross_sales, net_sales, returns SINCE ${s} UNTIL ${e}` },
  { id: 'orders',    label: 'Orders & AOV', emoji: '📦', group: 'Sales',    query: (s: string, e: string) => `FROM sales SHOW orders, average_order_value SINCE ${s} UNTIL ${e}` },
  { id: 'products',  label: 'Top Products', emoji: '🏆', group: 'Sales',    query: (s: string, e: string) => `FROM sales SHOW net_sales, orders GROUP BY product_title ORDER BY net_sales DESC LIMIT 10 SINCE ${s} UNTIL ${e}` },
  { id: 'cvr',       label: 'CVR & ATC',   emoji: '🛒', group: 'Sessions', query: (s: string, e: string) => `FROM sessions SHOW sessions, conversion_rate, added_to_cart_rate, reached_checkout_rate SINCE ${s} UNTIL ${e}` },
  { id: 'funnel',    label: 'Full Funnel',  emoji: '🔀', group: 'Sessions', query: (s: string, e: string) => `FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout SINCE ${s} UNTIL ${e}` },
  { id: 'bounce',    label: 'Engagement',   emoji: '📊', group: 'Sessions', query: (s: string, e: string) => `FROM sessions SHOW sessions, bounce_rate, pageviews, pageviews_per_session, average_session_duration SINCE ${s} UNTIL ${e}` },
] as const;

// Column formatting helpers
function formatMetricValue(colName: string, raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  const col = colName.toLowerCase();
  if (/gross_sales|net_sales|returns|average_order_value|total_sales/.test(col))
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  if (/rate|_pct/.test(col))
    return `${n.toFixed(2)}%`;
  if (/duration/.test(col)) {
    const mins = Math.floor(n / 60); const secs = Math.round(n % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
  if (/pageviews_per_session/.test(col)) return n.toFixed(2);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function prettyColName(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace('Gross Sales', 'Gross Revenue')
    .replace('Net Sales', 'Net Revenue')
    .replace('Average Order Value', 'AOV')
    .replace('Sessions That Completed Checkout', 'Completed Checkout')
    .replace(/^Orders$/, 'Orders (Converted)')
    .replace('Sessions That Reached Checkout', 'Reached Checkout')
    .replace('Sessions With Cart Additions', 'Added To Cart')
    .replace('Added To Cart Rate', 'ATC Rate')
    .replace('Reached Checkout Rate', 'Checkout Rate')
    .replace('Pageviews Per Session', 'Pages/Session')
    .replace('Average Session Duration', 'Avg Duration')
    .replace('Conversion Rate', 'CVR');
}

// ── Metrics panel inside each event card ─────────────────────────────────────

type MetricResult = {
  columns: { name: string; dataType: string }[];
  rows: string[][];
  error?: string;
};

function EventMetricsPanel({ ev, slug }: { ev: BrandEvent; slug: string }) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetricResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetric(presetId: string) {
    const preset = METRIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      if (presetId === 'funnel') {
        // Fetch sessions funnel + orders (from sales) in parallel.
        // We use orders instead of sessions_that_completed_checkout because
        // checkout is handled via Gokwik — session completion data is unreliable.
        const [sessRes, ordRes] = await Promise.all([
          fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, query: preset.query(ev.startDate, ev.endDate) }),
          }),
          fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, query: `FROM sales SHOW orders SINCE ${ev.startDate} UNTIL ${ev.endDate}` }),
          }),
        ]);
        const sessData = await sessRes.json();
        const ordData  = await ordRes.json();
        if (sessData.error) { setError(sessData.error); return; }
        // Merge: sessions columns + orders column
        const mergedColumns = [
          ...(sessData.columns ?? []),
          { name: 'orders', dataType: 'Int' },
        ];
        const mergedRow = [
          ...(sessData.rows?.[0] ?? []),
          ordData.rows?.[0]?.[0] ?? '0',
        ];
        setResult({ columns: mergedColumns, rows: [mergedRow] });
      } else {
        const query = preset.query(ev.startDate, ev.endDate);
        const res = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, query }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); }
        else { setResult(data); }
      }
    } catch {
      setError('Failed to fetch metric.');
    } finally {
      setLoading(false);
    }
  }

  const isGroupBy = result && result.rows.length > 1 && result.columns[0]?.dataType === 'String' && result.columns.length === 3;
  // aggregate: 1 row of numbers; table: GROUP BY results

  return (
    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: open ? 'rgba(59,130,246,0.1)' : 'var(--bg-primary)',
          border: `1px solid ${open ? 'rgba(59,130,246,0.35)' : 'var(--border-color)'}`,
          borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
          fontSize: '12px', fontWeight: '600',
          color: open ? 'var(--accent-blue)' : 'var(--text-secondary)',
          transition: 'all 0.15s',
        }}
      >
        📊 Pull Event Metrics
        <span style={{ fontSize: '10px', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '12px' }}>
          {/* Preset buttons, grouped */}
          {(['Sales', 'Sessions'] as const).map(group => (
            <div key={group} style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                {group}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {METRIC_PRESETS.filter(p => p.group === group).map(preset => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => fetchMetric(preset.id)}
                      disabled={loading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px', fontWeight: '600', border: '1px solid',
                        background: isActive ? (group === 'Sales' ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.12)') : 'var(--bg-primary)',
                        borderColor: isActive ? (group === 'Sales' ? 'rgba(34,197,94,0.4)' : 'rgba(168,85,247,0.4)') : 'var(--border-color)',
                        color: isActive ? (group === 'Sales' ? '#22c55e' : '#a855f7') : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                        opacity: loading && !isActive ? 0.5 : 1,
                      }}
                    >
                      {isActive && loading ? '⏳' : preset.emoji} {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Period note */}
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px', fontStyle: 'italic' }}>
            Showing data for {fmtDate(ev.startDate)} → {fmtDate(ev.endDate)}
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Results */}
          {result && !error && (
            <div>
              {isGroupBy ? (
                // Table view for GROUP BY results (e.g. Top Products)
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {result.columns.map(col => (
                          <th key={col.name} style={{
                            textAlign: col.dataType === 'String' ? 'left' : 'right',
                            padding: '6px 10px', fontSize: '10px', fontWeight: '700',
                            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: '1px solid var(--border-color)',
                          }}>
                            {prettyColName(col.name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < result.rows.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          {row.map((cell, j) => (
                            <td key={j} style={{
                              padding: '7px 10px',
                              textAlign: result.columns[j]?.dataType === 'String' ? 'left' : 'right',
                              color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: j === 0 ? '500' : '400',
                            }}>
                              {j === 0 ? cell : formatMetricValue(result.columns[j]?.name ?? '', cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Stat card grid for aggregate results
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {result.columns.map((col, i) => {
                    const val = result.rows[0]?.[i] ?? '—';
                    return (
                      <div key={col.name} style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          {prettyColName(col.name)}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {formatMetricValue(col.name, val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({
  ev, slug, onEdit, onDuplicate, onDelete,
}: {
  ev: BrandEvent;
  slug: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getStatus(ev);
  const ss = STATUS_STYLE[status];
  const tm = TYPE_META[ev.type];
  const days = durationDays(ev);

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: `1px solid ${ss.border}`,
      borderLeft: `4px solid ${ss.color}`,
      borderRadius: '10px', padding: '16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <StatusBadge status={status} />
            <TypePill type={ev.type} />
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
            {tm.emoji} {ev.title}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={onEdit} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)', padding: '2px 4px' }}>✏️</button>
          <button onClick={onDuplicate} title="Duplicate" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)', padding: '2px 4px' }}>📋</button>
          {confirmDelete ? (
            <>
              <button onClick={onDelete} style={{ background: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', padding: '2px 4px' }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)', padding: '2px 4px' }}>×</button>
          )}
        </div>
      </div>

      {/* Description */}
      {ev.description && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.5' }}>
          {ev.description}
        </div>
      )}

      {/* Date + duration */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
        <span>📅 {fmtDate(ev.startDate)}{ev.startTime ? ` ${ev.startTime}` : ''} → {fmtDate(ev.endDate)}{ev.endTime ? ` ${ev.endTime}` : ''}</span>
        <span>⏱ {days} day{days !== 1 ? 's' : ''}</span>
        {ev.discountValue && (
          <span>🏷️ {ev.discountUnit === 'pct' ? `${ev.discountValue}% off` : `₹${ev.discountValue} off`}</span>
        )}
        {ev.revenueTarget && (
          <span>🎯 ₹{ev.revenueTarget.toLocaleString('en-IN')} target</span>
        )}
      </div>

      {/* Audience + channels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: ev.tags?.length || ev.notes ? '10px' : 0 }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {ev.audience === 'all' ? '👥 All Users' : ev.audience === 'campaign' ? `📣 ${ev.audienceDetails || 'Campaign Users'}` : `🎯 ${ev.audienceDetails || 'Specific Segment'}`}
        </span>
        {ev.channels.map(ch => (
          <span key={ch} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px 6px' }}>
            {CHANNEL_META[ch]?.emoji} {CHANNEL_META[ch]?.label ?? ch}
          </span>
        ))}
      </div>

      {/* Tags */}
      {ev.tags && ev.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: ev.notes ? '8px' : 0 }}>
          {ev.tags.map(t => <TagPill key={t} tag={t} />)}
        </div>
      )}

      {/* Notes */}
      {ev.notes && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '4px' }}>
          📝 {ev.notes}
        </div>
      )}

      {/* Metrics panel */}
      <EventMetricsPanel ev={ev} slug={slug} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface EventsManagerProps {
  slug: string;
  initialEvents: BrandEvent[];
}

export function EventsManager({ slug, initialEvents }: EventsManagerProps) {
  const [events, setEvents] = useState<BrandEvent[]>(initialEvents);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [filterStatus, setFilterStatus] = useState<'all' | EventStatus>('all');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // All unique tags across events
  const allTags = useMemo(() => {
    const s = new Set<string>();
    events.forEach(ev => ev.tags?.forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [events]);

  async function persist(updated: BrandEvent[]) {
    setSaving(true);
    try {
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: updated }),
      });
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(ev: BrandEvent) {
    setForm({
      title: ev.title,
      type: ev.type,
      description: ev.description,
      startDate: ev.startDate,
      endDate: ev.endDate,
      startTime: ev.startTime ?? '',
      endTime: ev.endTime ?? '',
      audience: ev.audience,
      audienceDetails: ev.audienceDetails ?? '',
      channels: [...ev.channels],
      tags: ev.tags?.join(', ') ?? '',
      discountValue: ev.discountValue !== undefined ? String(ev.discountValue) : '',
      discountUnit: ev.discountUnit ?? 'pct',
      notes: ev.notes ?? '',
      revenueTarget: ev.revenueTarget !== undefined ? String(ev.revenueTarget) : '',
    });
    setEditId(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDuplicate(ev: BrandEvent) {
    setForm({
      title: ev.title + ' (copy)',
      type: ev.type,
      description: ev.description,
      startDate: '',
      endDate: '',
      startTime: ev.startTime ?? '',
      endTime: ev.endTime ?? '',
      audience: ev.audience,
      audienceDetails: ev.audienceDetails ?? '',
      channels: [...ev.channels],
      tags: ev.tags?.join(', ') ?? '',
      discountValue: ev.discountValue !== undefined ? String(ev.discountValue) : '',
      discountUnit: ev.discountUnit ?? 'pct',
      notes: ev.notes ?? '',
      revenueTarget: ev.revenueTarget !== undefined ? String(ev.revenueTarget) : '',
    });
    setEditId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave() {
    if (!form.title || !form.startDate || !form.endDate) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const ev: BrandEvent = {
      id: editId ?? Date.now().toString(),
      title: form.title.trim(),
      type: form.type,
      description: form.description.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      audience: form.audience,
      audienceDetails: form.audienceDetails.trim() || undefined,
      channels: form.channels,
      tags: tags.length ? tags : undefined,
      discountValue: form.discountValue ? parseFloat(form.discountValue) : undefined,
      discountUnit: form.discountValue ? form.discountUnit : undefined,
      notes: form.notes.trim() || undefined,
      revenueTarget: form.revenueTarget ? parseFloat(form.revenueTarget) : undefined,
    };
    const updated = editId
      ? events.map(e => e.id === editId ? ev : e)
      : [...events, ev];
    setEvents(updated);
    setShowForm(false);
    setEditId(null);
    await persist(updated);
  }

  async function handleDelete(id: string) {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    await persist(updated);
  }

  // Filtered + sorted events
  const filtered = useMemo(() => {
    return events
      .filter(ev => {
        if (filterStatus !== 'all' && getStatus(ev) !== filterStatus) return false;
        if (filterTag && !ev.tags?.includes(filterTag)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events, filterStatus, filterTag]);

  const counts = useMemo(() => ({
    all: events.length,
    active: events.filter(e => getStatus(e) === 'active').length,
    upcoming: events.filter(e => getStatus(e) === 'upcoming').length,
    ended: events.filter(e => getStatus(e) === 'ended').length,
  }), [events]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: '12px', fontWeight: '600',
    background: active ? 'var(--accent-blue)' : 'var(--bg-elevated)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-color)'}`,
    borderRadius: '8px', cursor: 'pointer',
  });

  return (
    <div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Timeline */}
      <TimelineStrip events={events} />

      {/* Add button */}
      {!showForm && (
        <button
          onClick={openAdd}
          style={{
            width: '100%', padding: '10px', marginBottom: '16px',
            background: 'transparent', border: '2px dashed var(--border-color)',
            borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          ➕ Add Event or Campaign
        </button>
      )}

      {/* Form */}
      {showForm && (
        <EventForm
          form={form} setForm={setForm}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditId(null); }}
          saving={saving}
          editId={editId}
        />
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {(['all', 'active', 'upcoming', 'ended'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={tabStyle(filterStatus === s)}>
            {s === 'all' ? `All (${counts.all})` : s === 'active' ? `🟢 Active (${counts.active})` : s === 'upcoming' ? `🔵 Upcoming (${counts.upcoming})` : `⚫ Past (${counts.ended})`}
          </button>
        ))}
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', alignSelf: 'center' }}>Filter by tag:</span>
          {allTags.map(t => (
            <TagPill key={t} tag={t} active={filterTag === t} onClick={() => setFilterTag(filterTag === t ? null : t)} />
          ))}
        </div>
      )}

      {/* Events list */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--bg-elevated)', border: '1px dashed var(--border-color)',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗓️</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {events.length === 0 ? 'No events yet' : 'No events match this filter'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {events.length === 0 ? 'Add your first campaign or offer to start tracking events.' : 'Try changing the filter above.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(ev => (
            <EventCard
              key={ev.id}
              ev={ev}
              slug={slug}
              onEdit={() => openEdit(ev)}
              onDuplicate={() => openDuplicate(ev)}
              onDelete={() => handleDelete(ev.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
