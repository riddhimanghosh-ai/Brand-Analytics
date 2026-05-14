'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MetricChart } from '@/components/MetricChart';
import { useGlobalDateRange, useDateRangeLabel } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';

// ─── Widget Catalog ──────────────────────────────────────────────────────────
const WIDGET_CATALOG = [
  // Shopify
  { id: 'shopify_revenue', source: 'Shopify', metric: 'revenue', label: '💰 Revenue', unit: '₹', chartType: 'line', endpoint: '/api/shopify?action=kpis', path: 'totalRevenue' },
  { id: 'shopify_orders', source: 'Shopify', metric: 'orders', label: '📦 Orders', unit: '', chartType: 'bar', endpoint: '/api/shopify?action=kpis', path: 'totalOrders' },
  { id: 'shopify_aov', source: 'Shopify', metric: 'aov', label: '🛒 AOV', unit: '₹', chartType: 'line', endpoint: '/api/shopify?action=kpis', path: 'averageOrderValue' },
  { id: 'shopify_customers', source: 'Shopify', metric: 'customers', label: '👥 Customers', unit: '', chartType: 'bar', endpoint: '/api/shopify?action=kpis', path: 'totalCustomers' },
  { id: 'shopify_repeat_rate', source: 'Shopify', metric: 'repeat_rate', label: '🔄 Repeat Rate', unit: '%', chartType: 'line', endpoint: '/api/shopify?action=kpis', path: 'repeatCustomerRate' },
  { id: 'shopify_refund_rate', source: 'Shopify', metric: 'refund_rate', label: '↩️ Refund Rate', unit: '%', chartType: 'line', endpoint: '/api/shopify?action=kpis', path: 'refundRate' },
  // GA4
  { id: 'ga4_sessions', source: 'GA4', metric: 'sessions', label: '📊 Sessions', unit: '', chartType: 'line', endpoint: '/api/analytics?action=kpis', path: 'sessions' },
  { id: 'ga4_users', source: 'GA4', metric: 'users', label: '👤 Users', unit: '', chartType: 'bar', endpoint: '/api/analytics?action=kpis', path: 'users' },
  { id: 'ga4_bounce', source: 'GA4', metric: 'bounce_rate', label: '📉 Bounce Rate', unit: '%', chartType: 'line', endpoint: '/api/analytics?action=kpis', path: 'bounceRate' },
  // Meta
  { id: 'meta_spend', source: 'Meta', metric: 'spend', label: '💸 Meta Spend', unit: '₹', chartType: 'bar', endpoint: '/api/ads?platform=meta', path: 'spend' },
  { id: 'meta_roas', source: 'Meta', metric: 'roas', label: '📈 Meta ROAS', unit: 'x', chartType: 'line', endpoint: '/api/ads?platform=meta', path: 'roas' },
  // Google Ads
  { id: 'gads_spend', source: 'Google Ads', metric: 'spend', label: '💸 GAds Spend', unit: '₹', chartType: 'bar', endpoint: '/api/ads?platform=google', path: 'spend' },
  { id: 'gads_roas', source: 'Google Ads', metric: 'roas', label: '📈 GAds ROAS', unit: 'x', chartType: 'line', endpoint: '/api/ads?platform=google', path: 'roas' },
];

const SOURCE_COLOR: Record<string, string> = {
  Shopify: '#22c55e',
  GA4: '#6366f1',
  Meta: '#1877f2',
  'Google Ads': '#f59e0b',
  TikTok: '#000000',
  Klaviyo: '#00bfa5',
  'My Metrics': '#8b5cf6',
};

interface Widget {
  id: string;
  catalogId: string;
  label: string;
  source: string;
  unit: string;
  value: number | null;
  loading: boolean;
  error?: string;
  col: number;
  row: number;
  savedMetricQuery?: string;
  savedMetricChartType?: string;
  metricColumns?: { name: string; dataType: string }[];
  metricRows?: string[][];
}

function getNestedValue(obj: Record<string, unknown>, path: string): number {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current === null || typeof current !== 'object') return 0;
    current = (current as Record<string, unknown>)[p];
  }
  return typeof current === 'number' ? current : parseFloat(String(current ?? '0')) || 0;
}

function formatValue(value: number, unit: string): string {
  if (unit === '₹') {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${Math.round(value)}`;
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'x') return `${value.toFixed(2)}x`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(Math.round(value));
}

export default function CustomDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { from, to } = useGlobalDateRange();
  const dateLabel = useDateRangeLabel();

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [savedMetrics, setSavedMetrics] = useState<{ name: string; query: string; chartType: string }[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Load saved layout from brand settings
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/brands/${slug}`)
      .then(r => r.json())
      .then(brand => {
        if (brand.customDashboard) {
          try {
            const saved = JSON.parse(brand.customDashboard);
            setWidgets(saved.map((w: Omit<Widget, 'loading' | 'value'>) => ({ ...w, value: null, loading: true })));
          } catch { /* invalid JSON */ }
        }
        setSavedMetrics(brand.savedMetrics || []);
      })
      .catch(() => {});
  }, [slug]);

  // Fetch data for all widgets (re-runs when date range changes)
  const fetchAllWidgets = useCallback(() => {
    if (widgets.length === 0 || !slug) return;
    setWidgets(prev => prev.map(w => ({ ...w, loading: true, value: null, metricColumns: undefined, metricRows: undefined })));
    widgets.forEach((widget, i) => {
      if (widget.savedMetricQuery) {
        fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, query: widget.savedMetricQuery }),
        })
          .then(r => r.json())
          .then(data => {
            setWidgets(prev => prev.map((w, idx) =>
              idx === i ? { ...w, metricColumns: data.columns, metricRows: data.rows, loading: false } : w
            ));
          })
          .catch(() => setWidgets(prev => prev.map((w, idx) => idx === i ? { ...w, loading: false, error: 'Failed' } : w)));
        return;
      }

      const catalog = WIDGET_CATALOG.find(c => c.id === widget.catalogId);
      if (!catalog) return;

      const url = `${catalog.endpoint}&slug=${slug}&from=${from}&to=${to}`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const value = getNestedValue(data, catalog.path);
          setWidgets(prev => prev.map((w, idx) => idx === i ? { ...w, value, loading: false } : w));
        })
        .catch(() => {
          setWidgets(prev => prev.map((w, idx) => idx === i ? { ...w, loading: false, error: 'Failed' } : w));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, from, to, widgets.length]);

  useEffect(() => {
    fetchAllWidgets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, from, to, widgets.length]);

  const addWidget = (catalogId: string) => {
    const catalog = WIDGET_CATALOG.find(c => c.id === catalogId);
    if (!catalog) return;
    if (widgets.find(w => w.catalogId === catalogId)) return; // already added

    const newWidget: Widget = {
      id: `${catalogId}_${Date.now()}`,
      catalogId,
      label: catalog.label,
      source: catalog.source,
      unit: catalog.unit,
      value: null,
      loading: true,
      col: widgets.length % 3,
      row: Math.floor(widgets.length / 3),
    };
    setWidgets(prev => [...prev, newWidget]);
    setShowPicker(false);
  };

  const addSavedMetricWidget = (metric: { name: string; query: string; chartType: string }) => {
    const catalogId = 'saved_' + metric.name;
    if (widgets.find(w => w.catalogId === catalogId)) return; // already added

    const newWidget: Widget = {
      id: `${catalogId}_${Date.now()}`,
      catalogId,
      label: metric.name,
      source: 'My Metrics',
      unit: '',
      value: null,
      loading: true,
      col: 0,
      row: Math.floor(widgets.length / 3),
      savedMetricQuery: metric.query,
      savedMetricChartType: metric.chartType,
    };
    setWidgets(prev => [...prev, newWidget]);
    setShowPicker(false);
  };

  const removeWidget = (idx: number) => {
    setWidgets(prev => prev.filter((_, i) => i !== idx));
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const layoutData = widgets.map(({ id, catalogId, label, source, unit, col, row, savedMetricQuery, savedMetricChartType }) => ({
        id, catalogId, label, source, unit, col, row,
        ...(savedMetricQuery ? { savedMetricQuery, savedMetricChartType } : {}),
      }));
      await fetch(`/api/brands/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDashboard: JSON.stringify(layoutData) }),
      });
      setSavedMsg('✅ Saved!');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch {
      setSavedMsg('❌ Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Drag reorder
  const handleDragStart = (idx: number) => setDragging(idx);
  const handleDragOver = (idx: number) => setDragOver(idx);
  const handleDrop = (idx: number) => {
    if (dragging === null || dragging === idx) return;
    setWidgets(prev => {
      const next = [...prev];
      const [item] = next.splice(dragging, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragging(null);
    setDragOver(null);
  };

  const filteredCatalog = WIDGET_CATALOG.filter(c =>
    c.label.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.source.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const filteredSavedMetrics = savedMetrics.filter(m =>
    m.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    'my metrics'.includes(pickerSearch.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🎛️ My Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Drag to reorder · Add any metric from any connected platform
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {savedMsg && <span style={{ fontSize: '13px', color: 'var(--accent-blue)' }}>{savedMsg}</span>}
          <DateRangeDropdown />
          {widgets.length > 0 && (
            <button onClick={saveLayout} disabled={saving} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
            }}>
              💾 {saving ? 'Saving...' : 'Save Layout'}
            </button>
          )}
          <button onClick={() => setShowPicker(true)} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: 'var(--accent-blue)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
          }}>
            + Add Widget
          </button>
        </div>
      </div>

      {/* Empty state */}
      {widgets.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 40px', borderRadius: '16px',
          border: '2px dashed var(--glass-border)', color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎛️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Build your custom dashboard
          </div>
          <div style={{ fontSize: '13px', marginBottom: '24px', lineHeight: '1.6', maxWidth: '360px', margin: '0 auto 24px' }}>
            Add any metric from Shopify, Google Analytics, Meta Ads, or Google Ads. Drag to reorder and save your layout.
          </div>
          <button onClick={() => setShowPicker(true)} style={{
            padding: '12px 24px', borderRadius: '10px', border: 'none',
            background: 'var(--accent-blue)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
          }}>
            + Add your first widget
          </button>
        </div>
      )}

      {/* Widget Grid */}
      {widgets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {widgets.map((widget, i) => (
            <div
              key={widget.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(i); }}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              style={{
                padding: '20px', borderRadius: '14px', background: 'var(--bg-elevated)',
                border: `1px solid ${dragOver === i ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                cursor: 'grab', position: 'relative', opacity: dragging === i ? 0.5 : 1,
                transition: 'border-color 0.15s',
                ...(widget.savedMetricQuery ? { gridColumn: '1 / -1', minHeight: '220px' } : {}),
              }}
            >
              {/* Remove button */}
              <button
                onClick={() => removeWidget(i)}
                style={{
                  position: 'absolute', top: '10px', right: '10px', width: '22px', height: '22px',
                  borderRadius: '50%', border: 'none', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>

              {/* Source badge */}
              <div style={{ fontSize: '10px', fontWeight: '600', color: SOURCE_COLOR[widget.source] || '#6366f1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {widget.source}
              </div>

              {/* Label */}
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{widget.label}</div>

              {/* Time period */}
              {!widget.savedMetricQuery && (
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '10px', letterSpacing: '0.03em' }}>
                  📅 {dateLabel}
                </div>
              )}

              {/* Saved metric widget: show chart */}
              {widget.savedMetricQuery ? (
                widget.loading ? (
                  <div style={{ height: '160px', background: 'var(--bg-card)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ) : widget.error ? (
                  <div style={{ fontSize: '13px', color: '#ef4444' }}>⚠️ {widget.error}</div>
                ) : widget.metricColumns && widget.metricRows ? (
                  <MetricChart
                    columns={widget.metricColumns}
                    rows={widget.metricRows}
                    chartType={(widget.savedMetricChartType as 'line' | 'bar' | 'pie' | 'table') || 'line'}
                  />
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No data</div>
                )
              ) : (
                /* Standard KPI widget */
                widget.loading ? (
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-dim)' }}>—</div>
                ) : widget.error ? (
                  <div style={{ fontSize: '13px', color: '#ef4444' }}>⚠️ {widget.error}</div>
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {widget.value !== null ? formatValue(widget.value, widget.unit) : '—'}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Widget Picker Modal */}
      {showPicker && (
        <>
          <div onClick={() => setShowPicker(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '520px', maxHeight: '70vh', borderRadius: '16px',
            background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
            zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Add Widget</h3>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <input
                placeholder="🔍 Search metrics..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--glass-border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Widget list */}
            <div style={{ overflowY: 'auto', padding: '12px' }}>
              {['Shopify', 'GA4', 'Meta', 'Google Ads'].map(source => {
                const items = filteredCatalog.filter(c => c.source === source);
                if (items.length === 0) return null;
                return (
                  <div key={source}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: SOURCE_COLOR[source], textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 8px 4px' }}>{source}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      {items.map(c => {
                        const added = widgets.some(w => w.catalogId === c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => !added && addWidget(c.id)}
                            disabled={added}
                            style={{
                              padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
                              border: '1px solid var(--glass-border)',
                              background: added ? 'var(--bg-card)' : 'var(--bg-card)',
                              color: added ? 'var(--text-dim)' : 'var(--text-primary)',
                              cursor: added ? 'default' : 'pointer', fontSize: '13px',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                          >
                            <span>{c.label}</span>
                            {added ? <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Added</span> : <span style={{ color: 'var(--accent-blue)' }}>+</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* My Metrics section */}
              {filteredSavedMetrics.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: SOURCE_COLOR['My Metrics'], textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 8px 4px' }}>
                    My Metrics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {filteredSavedMetrics.map(metric => {
                      const catalogId = 'saved_' + metric.name;
                      const added = widgets.some(w => w.catalogId === catalogId);
                      return (
                        <button
                          key={metric.name}
                          onClick={() => !added && addSavedMetricWidget(metric)}
                          disabled={added}
                          style={{
                            padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--bg-card)',
                            color: added ? 'var(--text-dim)' : 'var(--text-primary)',
                            cursor: added ? 'default' : 'pointer', fontSize: '13px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div>{metric.name}</div>
                            <div style={{ fontSize: '10px', color: SOURCE_COLOR['My Metrics'], marginTop: '2px', textTransform: 'uppercase' }}>{metric.chartType}</div>
                          </div>
                          {added ? <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Added</span> : <span style={{ color: 'var(--accent-blue)' }}>+</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
