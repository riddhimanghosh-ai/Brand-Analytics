'use server';
import { ConversionFunnel } from '@/components/ConversionFunnel';
import { CROCharts } from '@/components/CROCharts';
import { getBrand } from '@/lib/mongodb-store';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';
import * as shopify from '@/lib/services/shopify';

export const dynamic = 'force-dynamic';

export default async function CROPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return <div>Brand not found</div>;

  // ── Fetch real Shopify data (MongoDB-cached) ───────────────────────────────
  type CombinedData = Awaited<ReturnType<typeof shopify.getAllAnalytics>>;
  let combined: CombinedData | null = null;

  if (brand.shopifyStoreUrl && brand.shopifyAccessToken) {
    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken };
    try {
      const cached = await cacheGet(slug, 'combined', '30d');
      if (cached) {
        combined = cached as CombinedData;
      } else {
        combined = await shopify.getAllAnalytics(config, '30d');
        await cacheSet(slug, 'combined', '30d', combined);
      }
    } catch (e) {
      console.error('CRO page Shopify fetch failed:', e);
    }
  }

  // ── Extract real metrics ───────────────────────────────────────────────────
  const kpis = combined?.kpis;
  const aov           = kpis?.averageOrderValue  ?? 0;
  const repeatRate    = kpis?.repeatCustomerRate ?? 0;
  const totalOrders   = kpis?.totalOrders        ?? 0;
  const totalCustomers= kpis?.totalCustomers     ?? 0;
  const totalRevenue  = kpis?.totalRevenue       ?? 0;
  const newRevenue    = kpis?.newCustomerRevenue      ?? 0;
  const returnRevenue = kpis?.returningCustomerRevenue?? 0;

  // Purchase frequency = orders / unique customers in this period (real data only)
  const purchaseFrequency = totalCustomers > 0
    ? parseFloat((totalOrders / totalCustomers).toFixed(2))
    : 0;

  // Conversion funnel from order data
  const shopifyFunnel = combined?.conversionFunnel ?? [];
  const funnelTotal      = shopifyFunnel.find(s => s.stage === 'Total Orders')?.count ?? totalOrders;
  const funnelPaid       = shopifyFunnel.find(s => s.stage === 'Paid')?.count          ?? 0;
  const funnelFulfilled  = shopifyFunnel.find(s => s.stage === 'Fulfilled')?.count     ?? 0;
  const funnelRefunded   = shopifyFunnel.find(s => s.stage === 'Refunded')?.count      ?? 0;

  const conversionFunnelData = [
    { name: 'Total Orders', count: funnelTotal },
    { name: 'Paid',         count: funnelPaid },
    { name: 'Fulfilled',    count: funnelFulfilled },
    { name: 'Refunded',     count: funnelRefunded },
  ];

  // Revenue per order as a proxy (actual Rev/Session needs GA4)
  const revenuePerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Revenue by date for chart
  const revenueData = (combined?.revenue ?? []).map(r => ({
    date: r.date.slice(5), // "MM-DD"
    revenue: Math.round(r.revenue),
  }));

  const noShopify = !brand.shopifyStoreUrl || !brand.shopifyAccessToken;

  const fmt = (n: number) => n.toLocaleString('en-IN');

  const Benchmark = ({ label, value, benchmark, good }: { label: string; value: string; benchmark: string; good: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '600' }}>{value}</span>
        <span style={{ fontSize: '11px', color: good ? '#22c55e' : '#f59e0b', background: good ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
          {good ? '✓' : '!'} Benchmark: {benchmark}
        </span>
      </div>
    </div>
  );

  if (noShopify) {
    return (
      <div style={{ padding: '40px 32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>CRO Dashboard</h1>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#f59e0b', marginBottom: '8px' }}>⚠️ Shopify not connected</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Connect your Shopify store in Settings to see real CRO metrics.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>CRO Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Conversion rate optimization metrics for {brand.name} — Last 30 days
      </p>

      {/* ── Primary KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          {
            label: 'Avg Order Value',
            value: aov > 0 ? `₹${fmt(Math.round(aov))}` : '—',
            delta: aov > 0 && kpis?.prevAverageOrderValue
              ? `${aov >= kpis.prevAverageOrderValue ? '↑' : '↓'} vs prev period`
              : 'Last 30 days',
            positive: aov >= (kpis?.prevAverageOrderValue ?? 0),
          },
          {
            label: 'Repeat Customer Rate',
            value: repeatRate > 0 ? `${repeatRate.toFixed(1)}%` : '—',
            delta: 'Benchmark: >25%',
            positive: repeatRate >= 25,
          },
          {
            label: 'Total Orders',
            value: totalOrders > 0 ? fmt(totalOrders) : '—',
            delta: kpis?.prevTotalOrders
              ? `${totalOrders >= kpis.prevTotalOrders ? '↑' : '↓'} vs prev period`
              : 'Last 30 days',
            positive: totalOrders >= (kpis?.prevTotalOrders ?? 0),
          },
          {
            label: 'Purchase Frequency',
            value: purchaseFrequency > 0 ? `${purchaseFrequency}×` : '—',
            delta: 'Orders per customer',
            positive: purchaseFrequency >= 1.5,
          },
          {
            label: 'Orders Fulfilled',
            value: funnelFulfilled > 0 ? `${funnelTotal > 0 ? ((funnelFulfilled / funnelTotal) * 100).toFixed(0) : 0}%` : '—',
            delta: `${fmt(funnelFulfilled)} of ${fmt(funnelTotal)} orders`,
            positive: funnelTotal > 0 && funnelFulfilled / funnelTotal >= 0.8,
          },
          {
            label: 'Refund Rate',
            value: funnelRefunded > 0 && funnelTotal > 0 ? `${((funnelRefunded / funnelTotal) * 100).toFixed(1)}%` : '0%',
            delta: 'Benchmark: <5%',
            positive: funnelTotal === 0 || (funnelRefunded / funnelTotal) < 0.05,
          },
          {
            label: 'Revenue / Order',
            value: revenuePerOrder > 0 ? `₹${fmt(revenuePerOrder)}` : '—',
            delta: 'Avg revenue per completed order',
            positive: revenuePerOrder >= 500,
          },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: m.positive ? '#22c55e' : '#f59e0b', fontWeight: '500' }}>{m.delta}</div>
          </div>
        ))}
      </div>

      {/* ── Conversion Funnel ── */}
      <ConversionFunnel stages={conversionFunnelData} title="Order Funnel — Last 30 Days" />

      {/* ── Revenue Chart ── */}
      {revenueData.length > 0 && (
        <CROCharts
          revenueData={revenueData}
          customersData={{ new: Math.round(newRevenue), returning: Math.round(returnRevenue) }}
        />
      )}

      {/* ── Benchmark Table ── */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Industry Benchmarks</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>E-commerce D2C averages — how you compare</div>
        <Benchmark label="Repeat Customer Rate" value={`${repeatRate.toFixed(1)}%`} benchmark=">25%" good={repeatRate >= 25} />
        <Benchmark label="Orders Fulfilled Rate" value={funnelTotal > 0 ? `${((funnelFulfilled/funnelTotal)*100).toFixed(0)}%` : '—'} benchmark=">85%" good={funnelTotal > 0 && funnelFulfilled/funnelTotal >= 0.85} />
        <Benchmark label="Refund Rate" value={funnelTotal > 0 ? `${((funnelRefunded/funnelTotal)*100).toFixed(1)}%` : '0%'} benchmark="<5%" good={funnelTotal === 0 || funnelRefunded/funnelTotal < 0.05} />
        <Benchmark label="Purchase Frequency" value={`${purchaseFrequency}×`} benchmark=">1.5×" good={purchaseFrequency >= 1.5} />
        <Benchmark label="Avg Order Value" value={`₹${fmt(Math.round(aov))}`} benchmark=">₹800" good={aov >= 800} />
      </div>


      {/* ── Revenue Split ── */}
      {(newRevenue > 0 || returnRevenue > 0) && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Revenue Split — New vs Returning</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'New Customer Revenue', value: `₹${fmt(Math.round(newRevenue))}`, pct: totalRevenue > 0 ? ((newRevenue/totalRevenue)*100).toFixed(0) : '0', color: '#3b82f6' },
              { label: 'Returning Customer Revenue', value: `₹${fmt(Math.round(returnRevenue))}`, pct: totalRevenue > 0 ? ((returnRevenue/totalRevenue)*100).toFixed(0) : '0', color: '#22c55e' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '16px', borderLeft: `3px solid ${s.color}` }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '700' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: s.color, marginTop: '4px' }}>{s.pct}% of total revenue</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CRO Tips with real numbers ── */}
      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px' }}>💡 Repeat Rate Opportunity</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {repeatRate > 0
              ? `Your repeat rate is ${repeatRate.toFixed(1)}%. Getting ${Math.round(totalCustomers * 0.05)} more customers to reorder would add ₹${fmt(Math.round(totalCustomers * 0.05 * aov))} in revenue. Launch a post-purchase email sequence (Day 7, 14, 30) and a loyalty program.`
              : 'Connect Shopify to see personalised insights.'}
          </div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>📊 AOV Growth Strategy</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {aov > 0
              ? `Increasing AOV by 20% (₹${fmt(Math.round(aov))} → ₹${fmt(Math.round(aov * 1.2))}) on ${fmt(totalOrders)} orders would add ₹${fmt(Math.round(aov * 0.2 * totalOrders))} revenue. Try: free shipping threshold at ₹${fmt(Math.round(aov * 1.3))}, "You're ₹X away" bar, product bundles.`
              : 'Connect Shopify to see personalised insights.'}
          </div>
        </div>
        {repeatRate > 0 && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e', marginBottom: '4px' }}>✓ Retention Improvement Plan</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {`${repeatRate.toFixed(1)}% repeat rate across ${fmt(totalCustomers)} customers. Getting ${Math.round(totalCustomers * 0.05)} more customers to reorder adds ₹${fmt(Math.round(totalCustomers * 0.05 * aov))} revenue. Launch post-purchase email flows, loyalty/points program, and win-back campaigns.`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
