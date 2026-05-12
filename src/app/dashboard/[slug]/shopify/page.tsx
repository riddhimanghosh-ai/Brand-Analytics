'use client';

import { useState, useEffect } from 'react';
import { useGlobalDateRange } from '@/lib/use-date-range';
import { DateRangeDropdown } from '@/components/DateRangeDropdown';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Legend, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopifyKPIs {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  repeatCustomerRate: number;
  refundRate: number;
  averageItemsPerOrder: number;
  returningCustomerRevenue: number;
  newCustomerRevenue: number;
  topSellingProduct: string;
  prevTotalRevenue: number;
  prevTotalOrders: number;
  prevAverageOrderValue: number;
  prevTotalCustomers: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
}

interface Product {
  id: string;
  title: string;
  totalRevenue: number;
  totalUnitsSold: number;
  totalOrders: number;
  averagePrice: number;
}

interface Order {
  id: string;
  name: string;
  email: string;
  totalPrice: number;
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}

interface CustomerData {
  newVsReturning: { name: string; value: number }[];
  revenueBySegment: { name: string; value: number }[];
  topCustomers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    ordersCount: number;
    totalSpent: number;
  }[];
}

interface OrderStatusPoint {
  status: string;
  count: number;
}

interface AdvancedCROMetrics {
  locationBreakdown: {
    byCountry: { country: string; countryCode: string; orders: number; revenue: number }[];
    byCity: { city: string; province: string; country: string; orders: number; revenue: number }[];
  };
  salesChannels: { channel: string; orders: number; revenue: number }[];
  discountAnalysis: {
    topCodes: { code: string; uses: number; totalDiscount: number; avgDiscount: number }[];
    discountedOrdersRate: number;
    totalDiscountGiven: number;
    avgDiscount: number;
  };
  timeAnalysis: {
    byHour: { hour: number; label: string; orders: number; revenue: number }[];
    byDayOfWeek: { day: string; dayNum: number; orders: number; revenue: number }[];
  };
  clvMetrics: {
    avgLTV: number;
    avgOrdersPerCustomer: number;
    buyOnce: number;
    buyTwice: number;
    buyThreePlus: number;
    totalCustomers: number;
  };
  aovByDate: { date: string; orders: number; revenue: number; aov: number }[];
  financialFunnel: { name: string; value: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#6366f1'];

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDateLabel(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function pct(current: number, prev: number): number {
  if (!prev) return 0;
  return ((current - prev) / prev) * 100;
}

function maskEmail(email: string): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 3)}***@${domain}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShopifyDashboard({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { from, to } = useGlobalDateRange();

  // Main data
  const [kpis, setKpis] = useState<ShopifyKPIs | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerData | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatusPoint[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<Array<{stage: string; count: number; dropoffRate: number}>>([]);

  // Advanced (slower)
  const [advanced, setAdvanced] = useState<AdvancedCROMetrics | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'throttled' | 'connection' | null>(null);

  // Resolve params promise
  useEffect(() => {
    paramsPromise.then((p) => setSlug(p.slug));
  }, [paramsPromise]);

  // Refresh: clear server cache then re-fetch
  const handleRefresh = async () => {
    if (!slug || refreshing) return;
    setRefreshing(true);
    await fetch(`/api/shopify?slug=${slug}&action=refresh`);
    setLastRefreshed(new Date());
    setRefreshing(false);
    // Trigger re-fetch by toggling a dummy dep — simplest approach is to just re-run the effect
    setLoading(true);
    setError(null);
    Promise.allSettled([
      fetch(`/api/shopify?slug=${slug}&from=${from}&to=${to}&action=combined`).then((r) => r.json()),
      fetch(`/api/shopify?slug=${slug}&action=orders`).then((r) => r.json()),
      fetch(`/api/shopify?slug=${slug}&from=${from}&to=${to}&action=conversion-funnel`).then((r) => r.json()),
    ]).then(([combinedRes, ordersRes, funnelRes]) => {
      if (combinedRes.status === 'fulfilled') {
        const data = combinedRes.value;
        if (data?.kpis) setKpis(data.kpis);
        if (Array.isArray(data?.revenue)) setRevenue(data.revenue);
        if (Array.isArray(data?.products)) setProducts(data.products);
        if (data?.customers) setCustomers(data.customers);
        if (Array.isArray(data?.orderStatus)) setOrderStatus(data.orderStatus);
      }
      if (ordersRes.status === 'fulfilled') setOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
      if (funnelRes.status === 'fulfilled') setConversionFunnel(Array.isArray(funnelRes.value) ? funnelRes.value : []);
      setLoading(false);
    });
  };

  // Fetch main data — single combined call + orders separately
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      fetch(`/api/shopify?slug=${slug}&from=${from}&to=${to}&action=combined`).then((r) => r.json()),
      fetch(`/api/shopify?slug=${slug}&action=orders`).then((r) => r.json()),
      fetch(`/api/shopify?slug=${slug}&from=${from}&to=${to}&action=conversion-funnel`).then((r) => r.json()),
    ]).then(([combinedRes, ordersRes, funnelRes]) => {
      if (combinedRes.status === 'fulfilled') {
        const data = combinedRes.value;
        if (data?.error) {
          const msg: string = data.error || '';
          if (msg.includes('THROTTLED') || msg.includes('throttle') || msg.includes('rate limit')) {
            setError('throttled');
          } else {
            setError('connection');
          }
        } else {
          if (data?.kpis) setKpis(data.kpis);
          if (Array.isArray(data?.revenue)) setRevenue(data.revenue);
          if (Array.isArray(data?.products)) setProducts(data.products);
          if (data?.customers) setCustomers(data.customers);
          if (Array.isArray(data?.orderStatus)) setOrderStatus(data.orderStatus);
        }
      } else {
        setError('connection');
      }
      if (ordersRes.status === 'fulfilled') setOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
      if (funnelRes.status === 'fulfilled') setConversionFunnel(Array.isArray(funnelRes.value) ? funnelRes.value : []);
      setLoading(false);
    });
  }, [slug, from, to]);

  // Fetch advanced data separately
  useEffect(() => {
    if (!slug) return;
    setAdvancedLoading(true);
    setAdvanced(null);

    fetch(`/api/shopify?slug=${slug}&action=advanced&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error) setAdvanced(data);
        setAdvancedLoading(false);
      })
      .catch(() => setAdvancedLoading(false));
  }, [slug, from, to]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const totalRevenueChange = kpis ? pct(kpis.totalRevenue, kpis.prevTotalRevenue) : 0;
  const totalOrdersChange = kpis ? pct(kpis.totalOrders, kpis.prevTotalOrders) : 0;
  const aovChange = kpis ? pct(kpis.averageOrderValue, kpis.prevAverageOrderValue) : 0;
  const customersChange = kpis ? pct(kpis.totalCustomers, kpis.prevTotalCustomers) : 0;

  const totalProductRevenue = Array.isArray(products) ? products.reduce((s, p) => s + p.totalRevenue, 0) : 0;

  // ─── Render helpers ─────────────────────────────────────────────────────────

  function KPIChange({ val }: { val: number }) {
    const cls = val >= 0 ? 'positive' : 'negative';
    const sign = val >= 0 ? '+' : '';
    return <span className={`kpi-change ${cls}`}>{sign}{val.toFixed(1)}% vs prev</span>;
  }

  // ─── OVERVIEW TAB ───────────────────────────────────────────────────────────

  function OverviewTab() {
    const peakHour = advanced?.timeAnalysis.byHour.reduce(
      (best, h) => (h.orders > best.orders ? h : best),
      { hour: 0, label: '12am', orders: 0, revenue: 0 }
    );

    const funnelData = advanced?.financialFunnel ?? [];

    return (
      <>
        {/* KPI Grid */}
        <div className="kpi-grid">
          {/* Total Revenue */}
          <div className="kpi-card blue">
            <div className="kpi-icon">₹</div>
            <div className="kpi-label">Total Revenue</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? formatCurrency(kpis.totalRevenue) : '—'}</div>
                <KPIChange val={totalRevenueChange} />
              </>
            )}
          </div>

          {/* Total Orders */}
          <div className="kpi-card violet">
            <div className="kpi-icon">#</div>
            <div className="kpi-label">Total Orders</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? formatNum(kpis.totalOrders) : '—'}</div>
                <KPIChange val={totalOrdersChange} />
              </>
            )}
          </div>

          {/* AOV */}
          <div className="kpi-card emerald">
            <div className="kpi-icon">⌀</div>
            <div className="kpi-label">Avg Order Value</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? formatCurrency(kpis.averageOrderValue) : '—'}</div>
                <KPIChange val={aovChange} />
              </>
            )}
          </div>

          {/* Unique Customers */}
          <div className="kpi-card amber">
            <div className="kpi-icon">👤</div>
            <div className="kpi-label">Unique Customers</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? formatNum(kpis.totalCustomers) : '—'}</div>
                <KPIChange val={customersChange} />
              </>
            )}
          </div>

          {/* Repeat Customer Rate */}
          <div className="kpi-card cyan">
            <div className="kpi-icon">🔁</div>
            <div className="kpi-label">Repeat Customer Rate</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? `${kpis.repeatCustomerRate.toFixed(1)}%` : '—'}</div>
                <div className="kpi-subtext">CRO Key Metric</div>
              </>
            )}
          </div>

          {/* Avg Items / Order */}
          <div className="kpi-card rose">
            <div className="kpi-icon">🛒</div>
            <div className="kpi-label">Avg Items / Order</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? kpis.averageItemsPerOrder.toFixed(2) : '—'}</div>
                <div className="kpi-subtext">Refund rate: {kpis ? `${kpis.refundRate.toFixed(1)}%` : '—'}</div>
              </>
            )}
          </div>

          {/* Refund Rate */}
          <div className="kpi-card rose">
            <div className="kpi-icon">↩</div>
            <div className="kpi-label">Refund Rate</div>
            {loading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">{kpis ? `${kpis.refundRate.toFixed(1)}%` : '—'}</div>
                {kpis && kpis.refundRate > 5 && (
                  <span className="badge rose">High!</span>
                )}
              </>
            )}
          </div>

          {/* Total Discounts Given */}
          <div className="kpi-card amber">
            <div className="kpi-icon">🏷</div>
            <div className="kpi-label">Total Discounts Given</div>
            {advancedLoading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <div className="kpi-value">
                {advanced ? formatCurrency(advanced.discountAnalysis.totalDiscountGiven) : '—'}
              </div>
            )}
          </div>

          {/* Avg Customer LTV */}
          <div className="kpi-card emerald">
            <div className="kpi-icon">💎</div>
            <div className="kpi-label">Avg Customer LTV</div>
            {advancedLoading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <div className="kpi-value">
                {advanced ? formatCurrency(advanced.clvMetrics.avgLTV) : '—'}
              </div>
            )}
          </div>

          {/* Purchase Frequency */}
          <div className="kpi-card violet">
            <div className="kpi-icon">📦</div>
            <div className="kpi-label">Purchase Frequency</div>
            {advancedLoading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <>
                <div className="kpi-value">
                  {advanced ? advanced.clvMetrics.avgOrdersPerCustomer.toFixed(2) : '—'}
                </div>
                <div className="kpi-subtext">orders/customer</div>
              </>
            )}
          </div>
        </div>

        {/* Revenue & AOV Chart */}
        <div className="chart-card" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue &amp; AOV Over Time</div>
              <div className="chart-card-subtitle">Daily revenue with average order value trend</div>
            </div>
          </div>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={revenue} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  orientation="left"
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="aov"
                  orientation="right"
                  tickFormatter={(v) => `₹${Number(v).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v, name) =>
                    name === 'revenue'
                      ? [formatCurrency(Number(v)), 'Revenue']
                      : [formatCurrency(Number(v)), 'AOV']
                  }
                  labelFormatter={(l) => formatDateLabel(String(l))}
                />
                <Legend />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  fill="#3b82f620"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="revenue"
                />
                <Line
                  yAxisId="aov"
                  type="monotone"
                  dataKey="aov"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="aov"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders Per Day + Day of Week */}
        <div className="charts-grid cols-2" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Orders Per Day</div>
            </div>
            {loading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(l) => formatDateLabel(String(l))} />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Orders by Day of Week</div>
            </div>
            {advancedLoading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={advanced?.timeAnalysis.byDayOfWeek ?? []}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Conversion Funnel */}
        <div className="chart-card" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Order Conversion Funnel</div>
              <div className="chart-card-subtitle">Financial flow breakdown</div>
            </div>
          </div>
          {advancedLoading ? (
            <div className="skeleton skeleton-chart" />
          ) : funnelData.length === 0 ? (
            <p className="text-muted" style={{ padding: '1rem' }}>No funnel data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={funnelData.length * 52 + 40}>
              <BarChart
                layout="vertical"
                data={funnelData}
                margin={{ top: 5, right: 120, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Drop-off annotations */}
          {!advancedLoading && funnelData.length > 1 && (
            <div style={{ padding: '0 1rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {funnelData.slice(1).map((stage, i) => {
                const prev = funnelData[i].value;
                const dropoff = prev > 0 ? ((prev - stage.value) / prev) * 100 : 0;
                return (
                  <span key={stage.name} className="badge amber">
                    {funnelData[i].name} → {stage.name}: -{dropoff.toFixed(1)}%
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales Channels + Peak Shopping Hours */}
        <div className="charts-grid cols-2" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Sales Channels</div>
            </div>
            {advancedLoading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={advanced?.salesChannels ?? []}
                    dataKey="orders"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {(advanced?.salesChannels ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatNum(Number(v)), 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Peak Shopping Hours</div>
                {peakHour && !advancedLoading && (
                  <div className="chart-card-subtitle">Peak: {peakHour.label}</div>
                )}
              </div>
            </div>
            {advancedLoading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={advanced?.timeAnalysis.byHour ?? []}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
                    {(advanced?.timeAnalysis.byHour ?? []).map((h, i) => (
                      <Cell
                        key={i}
                        fill={h.orders === (peakHour?.orders ?? 0) ? '#f59e0b' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── SALES TAB ──────────────────────────────────────────────────────────────

  function SalesTab() {
    const countries = advanced?.locationBreakdown.byCountry ?? [];
    const cities = advanced?.locationBreakdown.byCity ?? [];
    const discount = advanced?.discountAnalysis;

    return (
      <>
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🌍</span> Geographic Distribution
        </div>

        <div className="charts-grid cols-2" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Top Countries by Orders</div>
            </div>
            {advancedLoading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  layout="vertical"
                  data={countries.slice(0, 10)}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis type="category" dataKey="country" width={100} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Top Cities</div>
            </div>
            {advancedLoading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>City</th>
                      <th>Country</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.slice(0, 10).map((c, i) => (
                      <tr key={i}>
                        <td>{c.city}</td>
                        <td><span className="text-muted">{c.country}</span></td>
                        <td className="mono">{c.orders}</td>
                        <td className="mono">{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🏷</span> Discount Analysis
        </div>

        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="kpi-card amber">
            <div className="kpi-label">Discount Rate</div>
            {advancedLoading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <div className="kpi-value">{discount ? `${discount.discountedOrdersRate.toFixed(1)}%` : '—'}</div>
            )}
          </div>
          <div className="kpi-card rose">
            <div className="kpi-label">Total Discounts Given</div>
            {advancedLoading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <div className="kpi-value">{discount ? formatCurrency(discount.totalDiscountGiven) : '—'}</div>
            )}
          </div>
          <div className="kpi-card violet">
            <div className="kpi-label">Avg Discount / Order</div>
            {advancedLoading ? (
              <div className="skeleton skeleton-text" />
            ) : (
              <div className="kpi-value">{discount ? formatCurrency(discount.avgDiscount) : '—'}</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Top Discount Codes</div>
          </div>
          {advancedLoading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Uses</th>
                    <th>Total Discount</th>
                    <th>Avg Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {(discount?.topCodes ?? []).map((code, i) => (
                    <tr key={i}>
                      <td><span className="badge cyan">{code.code}</span></td>
                      <td className="mono">{code.uses}</td>
                      <td className="mono">{formatCurrency(code.totalDiscount)}</td>
                      <td className="mono">{formatCurrency(code.avgDiscount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── CUSTOMERS TAB ──────────────────────────────────────────────────────────

  function CustomersTab() {
    const clv = advanced?.clvMetrics;
    const totalBuyers = clv ? clv.buyOnce + clv.buyTwice + clv.buyThreePlus : 0;
    const oneTimePct = totalBuyers > 0 && clv ? (clv.buyOnce / totalBuyers) * 100 : 0;

    const segmentPie = customers?.newVsReturning ?? [];

    const segmentRevenue = customers
      ? customers.revenueBySegment.map((s) => ({ segment: s.name, revenue: s.value }))
      : [];

    const frequencyData = clv
      ? [
          { label: '1x Buyers', count: clv.buyOnce, pct: totalBuyers > 0 ? (clv.buyOnce / totalBuyers) * 100 : 0 },
          { label: '2x Buyers', count: clv.buyTwice, pct: totalBuyers > 0 ? (clv.buyTwice / totalBuyers) * 100 : 0 },
          { label: '3x+ Buyers', count: clv.buyThreePlus, pct: totalBuyers > 0 ? (clv.buyThreePlus / totalBuyers) * 100 : 0 },
        ]
      : [];

    return (
      <>
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">📊</span> Customer Segmentation
        </div>

        <div className="charts-grid cols-2" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">New vs Returning</div>
            </div>
            {loading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={segmentPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {segmentPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatNum(Number(v)), 'Customers']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Revenue by Segment</div>
            </div>
            {loading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={segmentRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="segment" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {segmentRevenue.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🔁</span> Purchase Frequency Breakdown
        </div>

        <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-card-header">
            <div className="chart-card-title">Buyer Frequency</div>
          </div>
          {advancedLoading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <>
              <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
                {frequencyData.map((f) => (
                  <div className="kpi-card blue" key={f.label}>
                    <div className="kpi-label">{f.label}</div>
                    <div className="kpi-value">{formatNum(f.count)}</div>
                    <div className="kpi-subtext">{f.pct.toFixed(1)}% of buyers</div>
                  </div>
                ))}
              </div>
              {oneTimePct > 0 && (
                <div className="insight-item" style={{ padding: '0 1rem 1rem' }}>
                  <span className="insight-icon">💡</span>
                  <span>
                    <span className="highlight">{oneTimePct.toFixed(0)}%</span> are one-time buyers — set up win-back campaigns
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🏆</span> Top Customers
        </div>

        <div className="chart-card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {(customers?.topCustomers ?? []).map((c, i) => (
                    <tr key={c.id}>
                      <td className="text-muted mono">{i + 1}</td>
                      <td>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</td>
                      <td className="text-muted mono">{maskEmail(c.email)}</td>
                      <td className="mono">{c.ordersCount}</td>
                      <td className="mono">{formatCurrency(c.totalSpent)}</td>
                      <td className="mono">{c.ordersCount > 0 ? formatCurrency(c.totalSpent / c.ordersCount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── PRODUCTS TAB ───────────────────────────────────────────────────────────

  function ProductsTab() {
    const top8 = (Array.isArray(products) ? products : []).slice(0, 8);

    return (
      <>
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">📦</span> Top Products by Revenue
        </div>

        <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
          <div className="data-table-wrapper">
            {loading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Revenue</th>
                    <th>Units Sold</th>
                    <th>Orders</th>
                    <th>Avg Price</th>
                    <th>Revenue Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(products) ? products : []).map((p, i) => {
                    const share = totalProductRevenue > 0 ? (p.totalRevenue / totalProductRevenue) * 100 : 0;
                    const avgPrice = p.totalUnitsSold > 0 ? p.totalRevenue / p.totalUnitsSold : p.averagePrice;
                    return (
                      <tr key={p.id}>
                        <td className="text-muted mono">{i + 1}</td>
                        <td>{p.title}</td>
                        <td className="mono">{formatCurrency(p.totalRevenue)}</td>
                        <td className="mono">{formatNum(p.totalUnitsSold)}</td>
                        <td className="mono">{p.totalOrders}</td>
                        <td className="mono">{formatCurrency(avgPrice)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                height: '6px',
                                width: `${Math.max(share * 2, 4)}px`,
                                background: COLORS[i % COLORS.length],
                                borderRadius: '3px',
                                minWidth: '4px',
                                maxWidth: '80px',
                              }}
                            />
                            <span className="mono text-muted">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🥧</span> Product Revenue Distribution (Top 8)
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Revenue by Product</div>
          </div>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={top8}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={140}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                <Bar dataKey="totalRevenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {top8.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </>
    );
  }

  // ─── ORDERS TAB ─────────────────────────────────────────────────────────────

  function OrdersTab() {
    function statusBadge(status: string) {
      const s = (status || '').toLowerCase();
      if (s === 'paid' || s === 'fulfilled') return 'green';
      if (s === 'pending' || s === 'partial') return 'amber';
      if (s === 'refunded' || s === 'unfulfilled' || s === 'cancelled') return 'rose';
      return 'gray';
    }

    return (
      <>
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">📊</span> Fulfillment Status
        </div>

        <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={orderStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {orderStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [formatNum(Number(v)), 'Orders']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🧾</span> Recent Orders
        </div>

        <div className="chart-card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="skeleton skeleton-chart" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Fulfillment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="mono">{o.name}</td>
                      <td className="text-muted">{maskEmail(o.email)}</td>
                      <td className="mono">{formatCurrency(o.totalPrice)}</td>
                      <td>
                        <span className={`badge ${statusBadge(o.financialStatus)}`}>
                          {o.financialStatus || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(o.fulfillmentStatus)}`}>
                          {o.fulfillmentStatus || 'unfulfilled'}
                        </span>
                      </td>
                      <td className="text-muted mono">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </>
    );
  }

  function FunnelsTab() {
    return (
      <>
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <span className="section-icon">🔄</span> Order Conversion Funnel
        </div>

        <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={conversionFunnel}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="stage"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(v) => (typeof v === 'number' ? [v.toLocaleString('en-IN'), 'Orders'] : v)}
                />
                <Bar dataKey="count" fill="var(--accent-blue)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="data-grid">
          {conversionFunnel.map((stage, i) => (
            <div key={i} className="data-card">
              <div className="data-label">{stage.stage}</div>
              <div className="data-value">{stage.count.toLocaleString('en-IN')}</div>
              {stage.dropoffRate > 0 && (
                <div className="data-secondary">
                  {stage.dropoffRate.toFixed(1)}% dropoff
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          <span className="section-icon">📊</span> Funnel Summary
        </div>

        {conversionFunnel.length > 0 && (
          <div className="chart-card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Stage</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Count</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>% of Previous</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Dropoff %</th>
                </tr>
              </thead>
              <tbody>
                {conversionFunnel.map((stage, i) => {
                  const prevStage = i > 0 ? conversionFunnel[i - 1].count : stage.count;
                  const pctOfPrev = prevStage > 0 ? (stage.count / prevStage) * 100 : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{stage.stage}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stage.count.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{pctOfPrev.toFixed(1)}%</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stage.dropoffRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!slug) {
    return (
      <div className="page-body">
        <div className="skeleton skeleton-title" style={{ width: '200px', marginBottom: '2rem' }} />
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kpi-card blue">
              <div className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>🛍️</span>
            <span>Shopify Analytics</span>
            {slug && <span className="badge violet" style={{ fontSize: '0.75rem' }}>{slug}</span>}
          </h1>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Clear cache and reload fresh data from Shopify"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)',
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
              fontSize: '13px', fontWeight: '500', cursor: refreshing ? 'wait' : 'pointer',
              opacity: refreshing ? 0.7 : 1, transition: 'all 0.15s',
            }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            {refreshing ? 'Refreshing...' : 'Refresh data'}
            {lastRefreshed && !refreshing && (
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '2px' }}>
                · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>
          <DateRangeDropdown />
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          {([
            { id: 'overview',   label: 'Overview',   icon: '📊' },
            { id: 'sales',      label: 'Sales',      icon: '💰' },
            { id: 'customers',  label: 'Customers',  icon: '👥' },
            { id: 'products',   label: 'Products',   icon: '📦' },
            { id: 'orders',     label: 'Orders',     icon: '🧾' },
            { id: 'funnels',    label: 'Funnels',    icon: '🔻' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              className={`dashboard-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="connection-required">
            <span className="cr-icon">⚠️</span>
            <p>
              {error === 'throttled'
                ? 'Taking longer than expected — please refresh'
                : 'Shopify connection error'}
            </p>
          </div>
        )}

        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'sales' && <SalesTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'funnels' && <FunnelsTab />}
      </div>
    </div>
  );
}
