'use client';

import { useState, useEffect } from 'react';
import { MetricChart } from '@/components/MetricChart';

const PRESETS = [
  {
    name: '📈 Revenue by Day',
    query: 'FROM sales SHOW total_sales TIMESERIES day SINCE startOfDay(-90d) UNTIL today ORDER BY day ASC LIMIT 1000',
    chartType: 'line' as const,
  },
  {
    name: '📦 Orders by Source',
    query: 'FROM orders SHOW orders_count GROUPED BY source_name SINCE startOfDay(-90d) UNTIL today ORDER BY orders_count DESC LIMIT 20',
    chartType: 'bar' as const,
  },
  {
    name: '🏆 Top Products',
    query: 'FROM products SHOW net_sales GROUPED BY product_title SINCE startOfDay(-90d) UNTIL today ORDER BY net_sales DESC LIMIT 20',
    chartType: 'bar' as const,
  },
  {
    name: '🛒 Fulfillment Status',
    query: 'FROM fulfillments SHOW orders_fulfilled, orders_shipped, orders_delivered TIMESERIES day WITH TOTALS, PERCENT_CHANGE SINCE startOfDay(-90d) UNTIL today COMPARE TO previous_period ORDER BY day ASC LIMIT 1000',
    chartType: 'line' as const,
  },
  {
    name: '💳 Cart Abandonment by Device',
    query: 'FROM checkouts SHOW abandoned_checkouts_count GROUPED BY device_type SINCE startOfDay(-30d) UNTIL today',
    chartType: 'pie' as const,
  },
  {
    name: '👥 Customers by Country',
    query: 'FROM customers SHOW customer_count GROUPED BY billing_country SINCE startOfDay(-90d) UNTIL today ORDER BY customer_count DESC LIMIT 20',
    chartType: 'bar' as const,
  },
];

interface SavedMetric { name: string; query: string; chartType: string }
interface Column { name: string; dataType: string }
type Row = string[];

export default function MetricsPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [query, setQuery] = useState(PRESETS[0].query);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie' | 'table'>('line');
  const [running, setRunning] = useState(false);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [savedMetrics, setSavedMetrics] = useState<SavedMetric[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paramsPromise.then(p => {
      const resolvedSlug = p.slug;
      setSlug(resolvedSlug);
      // Load saved metrics on mount
      fetch(`/api/brands/${resolvedSlug}`)
        .then(r => r.json())
        .then(brand => {
          setSavedMetrics(brand.savedMetrics || []);
        })
        .catch(() => {});
    });
  }, [paramsPromise]);

  const runQuery = async () => {
    if (!query.trim() || !slug) return;
    setRunning(true);
    setError('');
    setColumns([]);
    setRows([]);
    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Query failed');
      } else {
        setColumns(data.columns);
        setRows(data.rows);
      }
    } catch {
      setError('Failed to connect to Shopify');
    } finally {
      setRunning(false);
    }
  };

  const applyPreset = (preset: { name: string; query: string; chartType: string }) => {
    setQuery(preset.query);
    setChartType(preset.chartType as 'line' | 'bar' | 'pie' | 'table');
    setColumns([]);
    setRows([]);
    setError('');
  };

  const saveMetric = async () => {
    if (!saveName.trim() || !slug) return;
    setSaving(true);
    try {
      // Fetch current savedMetrics from the brand
      const res = await fetch(`/api/brands/${slug}`);
      const brand = await res.json();
      const existing: SavedMetric[] = brand.savedMetrics || [];
      const updated = [...existing, { name: saveName.trim(), query, chartType }];

      // Only send savedMetrics — don't touch any other field
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedMetrics: updated }),
      });
      setSavedMetrics(updated);
      setSaveName('');
    } finally {
      setSaving(false);
    }
  };

  const deleteMetric = async (idx: number) => {
    const updated = savedMetrics.filter((_, i) => i !== idx);
    await fetch(`/api/brands/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedMetrics: updated }),
    });
    setSavedMetrics(updated);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>📐 Custom Metrics</h2>
            <p>Write ShopifyQL queries to build custom reports and visualizations</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Preset Templates */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Preset Templates
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Metrics */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Saved Metrics
          </div>
          {savedMetrics.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
              Run a query and save it to see it here and in My Dashboard.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {savedMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  style={{
                    minWidth: '180px',
                    maxWidth: '180px',
                    padding: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {metric.name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#8b5cf6',
                    background: 'rgba(139,92,246,0.1)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {metric.chartType}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                    <button
                      onClick={() => applyPreset(metric)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteMetric(idx)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-dim)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '5px',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Query Editor */}
        <div className="form-card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ShopifyQL Query
          </div>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              minHeight: '140px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'var(--text-primary)',
              resize: 'vertical',
              lineHeight: '1.6',
              boxSizing: 'border-box',
            }}
            placeholder="FROM sales SHOW total_sales TIMESERIES day SINCE startOfDay(-90d) UNTIL today"
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runQuery(); }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Chart type selector */}
              {(['line', 'bar', 'pie', 'table'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '5px',
                    border: '1px solid var(--border-color)',
                    background: chartType === type ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                    color: chartType === type ? '#fff' : 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {type === 'line' ? '📈' : type === 'bar' ? '📊' : type === 'pie' ? '🥧' : '📋'} {type}
                </button>
              ))}
            </div>
            <button
              onClick={runQuery}
              disabled={running || !query.trim()}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              {running ? '⏳ Running...' : '▶ Run Query'}
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
            Tip: Press ⌘+Enter to run · <a href="https://shopify.dev/docs/api/shopifyql" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>ShopifyQL docs →</a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '13px' }}>
            ❌ {error}
          </div>
        )}

        {/* Results */}
        {columns.length > 0 && (
          <div className="chart-card" style={{ marginBottom: '16px' }}>
            <div className="chart-card-header" style={{ marginBottom: '16px' }}>
              <div>
                <div className="chart-card-title">Query Results</div>
                <div className="chart-card-subtitle">{rows.length} rows · {columns.length} columns</div>
              </div>
            </div>
            <MetricChart columns={columns} rows={rows} chartType={chartType} />
          </div>
        )}

        {/* Save Metric Section */}
        {columns.length > 0 && (
          <div className="form-card" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
              💾 Save this metric
            </div>
            <input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Name this metric..."
              style={{
                flex: 1,
                minWidth: '160px',
                padding: '7px 12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
              onKeyDown={e => { if (e.key === 'Enter') saveMetric(); }}
            />
            <button
              onClick={saveMetric}
              disabled={saving || !saveName.trim()}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '7px 16px', flexShrink: 0 }}
            >
              {saving ? '⏳ Saving...' : '💾 Save Metric'}
            </button>
          </div>
        )}

        {/* ShopifyQL Reference */}
        <div className="form-card">
          <div className="form-card-title">📖 ShopifyQL Quick Reference</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
            {[
              { title: 'Data Sources (FROM)', items: ['sales', 'orders', 'products', 'customers', 'checkouts', 'fulfillments', 'inventory'] },
              { title: 'Time Ranges (SINCE)', items: ['startOfDay(-30d)', 'startOfMonth(-3m)', 'startOfYear(-1y)', '"2024-01-01"'] },
              { title: 'Grouping', items: ['GROUPED BY product_title', 'GROUPED BY source_name', 'GROUPED BY billing_country', 'GROUPED BY device_type'] },
              { title: 'Modifiers', items: ['WITH TOTALS', 'PERCENT_CHANGE', 'COMPARE TO previous_period', 'TIMESERIES day/week/month'] },
            ].map(section => (
              <div key={section.title}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {section.title}
                </div>
                {section.items.map(item => (
                  <div
                    key={item}
                    onClick={() => setQuery(q => q + ' ' + item)}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: 'var(--accent-blue)',
                      padding: '3px 0',
                      cursor: 'pointer',
                    }}
                    title="Click to append to query"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
