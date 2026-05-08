'use client';

import { useState, useEffect } from 'react';
import { setGlobalDateRange, useGlobalDateRange } from '@/lib/use-date-range';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const PRESETS = [
  { label: '7D',  from: () => daysAgoISO(7) },
  { label: '30D', from: () => daysAgoISO(30) },
  { label: '90D', from: () => daysAgoISO(90) },
];

export function GlobalDateRangePicker() {
  const current = useGlobalDateRange();
  const [from, setFrom] = useState(current.from);
  const [to,   setTo]   = useState(current.to);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Keep local inputs in sync when global range changes (e.g. preset click)
  useEffect(() => {
    setFrom(current.from);
    setTo(current.to);
  }, [current.from, current.to]);

  if (!mounted) return null;

  const today = todayISO();

  function applyPreset(daysAgo: string) {
    const f = daysAgo;
    const t = today;
    setGlobalDateRange({ from: f, to: t });
  }

  function applyCustom() {
    if (!from || !to || from > to) return;
    setGlobalDateRange({ from, to });
  }

  // Determine which preset is active
  function isPreset(days: number) {
    return current.to === today && current.from === daysAgoISO(days);
  }

  return (
    <div style={{
      padding: '12px 14px',
      borderTop: '1px solid var(--glass-border)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        Date Range
      </div>

      {/* Quick presets */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {PRESETS.map(({ label, from: getFr }) => {
          const days = label === '7D' ? 7 : label === '30D' ? 30 : 90;
          const active = isPreset(days);
          return (
            <button
              key={label}
              onClick={() => applyPreset(getFr())}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: '11px',
                fontWeight: active ? 600 : 400,
                background: active ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* From / To inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '26px', flexShrink: 0 }}>From</span>
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
            onBlur={applyCustom}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: '11px',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              outline: 'none',
              colorScheme: 'dark',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '26px', flexShrink: 0 }}>To</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            onBlur={applyCustom}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: '11px',
              background: 'var(--bg-elevated)',
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
            marginTop: '2px',
            padding: '6px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: from && to && from <= to ? 'pointer' : 'not-allowed',
            opacity: from && to && from <= to ? 1 : 0.4,
            transition: 'opacity 0.15s ease',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
