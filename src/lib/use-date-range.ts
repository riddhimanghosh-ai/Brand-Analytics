'use client';

import { useState, useEffect, useCallback } from 'react';

const FROM_KEY = 'dr_from';
const TO_KEY   = 'dr_to';
const EVENT    = 'globalDateChange';

export interface DateRange {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function defaultRange(): DateRange {
  return { from: daysAgoISO(30), to: todayISO() };
}

function readFromStorage(): DateRange {
  if (typeof window === 'undefined') return defaultRange();
  const from = localStorage.getItem(FROM_KEY);
  const to   = localStorage.getItem(TO_KEY);
  if (from && to) return { from, to };
  return defaultRange();
}

export function setGlobalDateRange(range: DateRange) {
  localStorage.setItem(FROM_KEY, range.from);
  localStorage.setItem(TO_KEY,   range.to);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: range }));
}

export function useGlobalDateRange(): DateRange {
  const [range, setRange] = useState<DateRange>(defaultRange);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setRange(readFromStorage());

    const onCustom = (e: Event) => {
      setRange((e as CustomEvent<DateRange>).detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === FROM_KEY || e.key === TO_KEY) {
        setRange(readFromStorage());
      }
    };

    window.addEventListener(EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return range;
}

/** Returns a label for the current range, e.g. "Last 30 days" or "Apr 1 – May 8" */
export function useDateRangeLabel(): string {
  const { from, to } = useGlobalDateRange();
  const today = todayISO();
  const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  if (to === today) {
    if (diff === 6  || diff === 7)  return 'Last 7 days';
    if (diff === 29 || diff === 30) return 'Last 30 days';
    if (diff === 89 || diff === 90) return 'Last 90 days';
  }
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(from)} – ${fmt(to)}`;
}
