'use client';

import { useState, useEffect, useRef } from 'react';
import { setGlobalDateRange, useGlobalDateRange, useDateRangeLabel } from '@/lib/use-date-range';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// days = N → from N days ago to today.
// 'today' / 'yesterday' are single-day ranges.
const PRESETS: Array<{ label: string; preset: 'today' | 'yesterday' | number }> = [
  { label: 'Today',          preset: 'today' },
  { label: 'Yesterday',      preset: 'yesterday' },
  { label: 'Last 7 days',    preset: 7 },
  { label: 'Last 30 days',   preset: 30 },
  { label: 'Last 90 days',   preset: 90 },
  { label: 'Last 12 months', preset: 365 },
];

export function DateRangeDropdown() {
  const { from: globalFrom, to: globalTo } = useGlobalDateRange();
  const label = useDateRangeLabel();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(globalFrom);
  const [to,   setTo]   = useState(globalTo);
  const [lastX, setLastX] = useState('');
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Keep local inputs in sync with global
  useEffect(() => {
    setFrom(globalFrom);
    setTo(globalTo);
  }, [globalFrom, globalTo]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!mounted) return null;

  const today = todayISO();

  function presetRange(preset: 'today' | 'yesterday' | number) {
    if (preset === 'today') return { from: today, to: today };
    if (preset === 'yesterday') return { from: daysAgoISO(1), to: daysAgoISO(1) };
    return { from: daysAgoISO(preset), to: today };
  }

  function applyPreset(preset: 'today' | 'yesterday' | number) {
    setGlobalDateRange(presetRange(preset));
    setOpen(false);
  }

  function applyCustom() {
    if (!from || !to || from > to) return;
    setGlobalDateRange({ from, to });
    setOpen(false);
  }

  function applyLastX() {
    const n = parseInt(lastX, 10);
    if (!n || n < 1 || n > 730) return;
    setGlobalDateRange({ from: daysAgoISO(n), to: today });
    setOpen(false);
  }

  function isActivePreset(preset: 'today' | 'yesterday' | number) {
    const r = presetRange(preset);
    return globalFrom === r.from && globalTo === r.to;
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger chip */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '7px 14px',
          background: open ? 'var(--accent-blue)' : 'var(--bg-elevated)',
          color: open ? '#fff' : 'var(--text-secondary)',
          border: `1px solid ${open ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: '14px' }}>📅</span>
        {label}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s ease', opacity: 0.7 }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          zIndex: 200,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
          width: '280px',
          overflow: 'hidden',
        }}>
          {/* Quick presets */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Quick select
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {PRESETS.map(({ label: pLabel, preset }) => (
                <button
                  key={pLabel}
                  onClick={() => applyPreset(preset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '7px 10px',
                    fontSize: '13px',
                    fontWeight: isActivePreset(preset) ? 600 : 400,
                    background: isActivePreset(preset) ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: isActivePreset(preset) ? 'var(--accent-blue)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActivePreset(preset)) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActivePreset(preset)) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {isActivePreset(preset) && <span style={{ marginRight: '8px', fontSize: '12px' }}>✓</span>}
                  {!isActivePreset(preset) && <span style={{ marginRight: '8px', fontSize: '12px', opacity: 0 }}>✓</span>}
                  {pLabel}
                </button>
              ))}
            </div>

            {/* Last X days */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px 4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Last</span>
              <input
                type="number"
                min={1}
                max={730}
                value={lastX}
                placeholder="X"
                onChange={(e) => setLastX(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyLastX(); }}
                style={{
                  width: '56px',
                  padding: '5px 8px',
                  fontSize: '13px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>days</span>
              <button
                onClick={applyLastX}
                disabled={!parseInt(lastX, 10) || parseInt(lastX, 10) < 1}
                style={{
                  marginLeft: 'auto',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: parseInt(lastX, 10) >= 1 ? 'pointer' : 'not-allowed',
                  opacity: parseInt(lastX, 10) >= 1 ? 1 : 0.4,
                }}
              >
                Go
              </button>
            </div>
          </div>

          {/* Custom range */}
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Custom range
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', width: '28px', flexShrink: 0 }}>From</span>
                <input
                  type="date"
                  value={from}
                  max={to || today}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', width: '28px', flexShrink: 0 }}>To</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!from || !to || from > to}
                style={{
                  marginTop: '4px',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: from && to && from <= to ? 'pointer' : 'not-allowed',
                  opacity: from && to && from <= to ? 1 : 0.4,
                  transition: 'opacity 0.15s ease',
                  width: '100%',
                }}
              >
                Apply custom range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
