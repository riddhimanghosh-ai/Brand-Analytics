export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-IN');
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getDateRange(range: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '7d': start.setDate(end.getDate() - 7); break;
    case '30d': start.setDate(end.getDate() - 30); break;
    case '90d': start.setDate(end.getDate() - 90); break;
    case '365d': start.setDate(end.getDate() - 365); break;
    default: start.setDate(end.getDate() - 30);
  }

  return { start, end };
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

export function groupByDate(
  items: { date: string; value: number }[]
): { date: string; value: number }[] {
  const grouped: Record<string, number> = {};
  items.forEach(({ date, value }) => {
    const key = date.split('T')[0];
    grouped[key] = (grouped[key] || 0) + value;
  });
  return Object.entries(grouped)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getDaysArray(start: Date, end: Date): string[] {
  const arr: string[] = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(dt.toISOString().split('T')[0]);
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}
