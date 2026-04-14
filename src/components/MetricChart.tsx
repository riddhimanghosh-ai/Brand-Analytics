'use client';

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Column { name: string; dataType: string }
type Row = string[];

interface MetricChartProps {
  columns: Column[];
  rows: Row[];
  chartType: 'line' | 'bar' | 'pie' | 'table';
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#f97316'];

function parseValue(val: string): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

export function MetricChart({ columns, rows, chartType }: MetricChartProps) {
  if (!columns.length || !rows.length) return null;

  // Find label column (first string/date) and value columns (money/int/float)
  const labelCol = columns.findIndex(c =>
    ['string', 'datetime', 'date'].includes(c.dataType?.toLowerCase() || '') || c.dataType === null
  );
  const valueColIndices = columns
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => ['money', 'int', 'float', 'count', 'percent', 'integer'].includes(c.dataType?.toLowerCase() || ''))
    .map(({ i }) => i);

  // If no label col found, use first col as label
  const effectiveLabelCol = labelCol >= 0 ? labelCol : 0;
  const effectiveValueCols = valueColIndices.length > 0 ? valueColIndices : [1].filter(i => i < columns.length);

  const chartData = rows.map(row => {
    const label = row[effectiveLabelCol] || '';
    const entry: Record<string, string | number> = { label: label.length > 20 ? label.slice(0, 20) + '…' : label };
    effectiveValueCols.forEach(i => {
      entry[columns[i].name] = parseValue(row[i]);
    });
    return entry;
  });

  const valueKeys = effectiveValueCols.map(i => columns[i].name);

  if (chartType === 'table') {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {columns.map((col, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.9 }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === 'pie') {
    const pieData = chartData.map(d => ({ name: d.label as string, value: d[valueKeys[0]] as number }));
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => (v as number).toLocaleString()} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
          <Tooltip formatter={(v) => (v as number).toLocaleString()} />
          {valueKeys.length > 1 && <Legend />}
          {valueKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Line chart (default)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
        <Tooltip formatter={(v) => (v as number).toLocaleString()} />
        {valueKeys.length > 1 && <Legend />}
        {valueKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
