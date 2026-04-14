import { ConversionFunnel } from '@/components/ConversionFunnel';
import { CROCharts } from '@/components/CROCharts';
import { getBrand } from '@/lib/github-store';

export const dynamic = 'force-dynamic';

export default async function CROPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) return <div>Brand not found</div>;

  // ── Sample metrics (replace with real Shopify data when connected) ──
  const conversionRate = 2.5;
  const cartAbandonmentRate = 68;
  const aov = 4500;
  const repeatRate = 35;
  const sessions = 10000;
  const addToCartCount = 1800;
  const checkoutInitiated = 500;
  const checkoutCompleted = 250;

  // Derived metrics
  const addToCartRate = ((addToCartCount / sessions) * 100).toFixed(1);
  const checkoutConvRate = ((checkoutCompleted / checkoutInitiated) * 100).toFixed(1);
  const revenuePerSession = ((aov * checkoutCompleted) / sessions).toFixed(0);

  // Customer LTV estimate
  const purchaseFrequency = 2.4; // orders/year
  const avgLifespan = 2.5; // years
  const ltv = Math.round(aov * purchaseFrequency * avgLifespan);

  const conversionFunnelData = [
    { name: 'Sessions', count: sessions },
    { name: 'Add to Cart', count: addToCartCount },
    { name: 'Checkout Started', count: checkoutInitiated },
    { name: 'Order Completed', count: checkoutCompleted },
  ];

  const revenueData = [
    { date: 'Mon', revenue: 45000 },
    { date: 'Tue', revenue: 52000 },
    { date: 'Wed', revenue: 48000 },
    { date: 'Thu', revenue: 61000 },
    { date: 'Fri', revenue: 55000 },
    { date: 'Sat', revenue: 72000 },
    { date: 'Sun', revenue: 68000 },
  ];

  // Cohort repeat rate (sample)
  const cohorts = [
    { month: 'Jan 2025', acquired: 420, day30: 18, day60: 28, day90: 35 },
    { month: 'Feb 2025', acquired: 380, day30: 21, day60: 31, day90: 38 },
    { month: 'Mar 2025', acquired: 510, day30: 16, day60: 25, day90: null },
    { month: 'Apr 2025', acquired: 460, day30: 19, day60: null, day90: null },
    { month: 'May 2025', acquired: 490, day30: null, day60: null, day90: null },
  ];

  // RFM segments (sample)
  const rfmSegments = [
    { label: 'Champions', desc: 'Bought recently, often, high value', count: 142, color: '#22c55e' },
    { label: 'Loyal Customers', desc: 'Regular buyers, good value', count: 287, color: '#3b82f6' },
    { label: 'At Risk', desc: "Used to buy often, haven't recently", count: 198, color: '#f59e0b' },
    { label: 'Need Attention', desc: 'Below avg recency & frequency', count: 156, color: '#f97316' },
    { label: 'Lost', desc: 'Lowest recency scores', count: 89, color: '#ef4444' },
  ];

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

  return (
    <div style={{ padding: '40px 32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>CRO Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Conversion rate optimization metrics for {brand.name}</p>

      {/* ── Primary KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Conversion Rate', value: `${conversionRate}%`, delta: '↑ 0.3%', positive: true },
          { label: 'Avg Order Value', value: `₹${aov.toLocaleString()}`, delta: '↓ 2.1%', positive: false },
          { label: 'Cart Abandonment', value: `${cartAbandonmentRate}%`, delta: '↑ 3.2%', positive: false },
          { label: 'Repeat Rate', value: `${repeatRate}%`, delta: '↑ 1.5%', positive: true },
          { label: 'Add-to-Cart Rate', value: `${addToCartRate}%`, delta: 'Benchmark: >8%', positive: parseFloat(addToCartRate) >= 8 },
          { label: 'Checkout Conv.', value: `${checkoutConvRate}%`, delta: 'Benchmark: >60%', positive: parseFloat(checkoutConvRate) >= 60 },
          { label: 'Revenue / Session', value: `₹${revenuePerSession}`, delta: 'Benchmark: >₹150', positive: parseInt(revenuePerSession) >= 150 },
          { label: 'Customer LTV', value: `₹${ltv.toLocaleString()}`, delta: `AOV × ${purchaseFrequency}× ${avgLifespan}yr`, positive: true },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: m.positive ? '#22c55e' : '#f59e0b', fontWeight: '500' }}>{m.delta}</div>
          </div>
        ))}
      </div>

      {/* ── Conversion Funnel ── */}
      <ConversionFunnel stages={conversionFunnelData} title="Conversion Funnel — Last 7 Days" />

      {/* ── Revenue Chart ── */}
      <CROCharts revenueData={revenueData} customersData={{ new: 1200, returning: 800 }} />

      {/* ── Benchmark Table ── */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Industry Benchmarks</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>E-commerce D2C averages — how you compare</div>
        <Benchmark label="Conversion Rate" value={`${conversionRate}%`} benchmark=">2%" good={conversionRate >= 2} />
        <Benchmark label="Add-to-Cart Rate" value={`${addToCartRate}%`} benchmark=">8%" good={parseFloat(addToCartRate) >= 8} />
        <Benchmark label="Checkout Conversion" value={`${checkoutConvRate}%`} benchmark=">60%" good={parseFloat(checkoutConvRate) >= 60} />
        <Benchmark label="Cart Abandonment" value={`${cartAbandonmentRate}%`} benchmark="<70%" good={cartAbandonmentRate < 70} />
        <Benchmark label="Repeat Rate" value={`${repeatRate}%`} benchmark=">25%" good={repeatRate >= 25} />
        <Benchmark label="Revenue / Session" value={`₹${revenuePerSession}`} benchmark=">₹150" good={parseInt(revenuePerSession) >= 150} />
      </div>

      {/* ── Customer LTV Breakdown ── */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Customer Lifetime Value (LTV)</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>LTV = AOV × Purchase Frequency × Customer Lifespan</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Avg Order Value', value: `₹${aov.toLocaleString()}` },
            { label: 'Orders / Year', value: `${purchaseFrequency}×` },
            { label: 'Avg Lifespan', value: `${avgLifespan} yrs` },
            { label: 'Est. LTV', value: `₹${ltv.toLocaleString()}`, highlight: true },
          ].map(item => (
            <div key={item.label} style={{ background: item.highlight ? 'rgba(59,130,246,0.1)' : 'var(--bg-elevated)', borderRadius: '8px', padding: '14px', border: item.highlight ? '1px solid #3b82f6' : '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: item.highlight ? '#3b82f6' : 'var(--text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          💡 To improve LTV: increase AOV with bundles/upsells, improve repeat rate with email flows, extend customer lifespan with loyalty programs.
        </div>
      </div>

      {/* ── Cohort Repeat Rate Table ── */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Cohort Repeat Purchase Rate</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>% of customers who placed a 2nd order within 30/60/90 days of first purchase</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Cohort', 'Acquired', 'Day 30', 'Day 60', 'Day 90'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Cohort' ? 'left' : 'center', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.month} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '500' }}>{c.month}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{c.acquired}</td>
                  {([c.day30, c.day60, c.day90] as (number | null)[]).map((val, i) => (
                    <td key={i} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {val == null ? <span style={{ color: 'var(--text-dim)' }}>—</span> : (
                        <span style={{ background: val >= 30 ? 'rgba(34,197,94,0.15)' : val >= 20 ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: val >= 30 ? '#22c55e' : val >= 20 ? '#3b82f6' : '#f59e0b', padding: '2px 10px', borderRadius: '10px', fontWeight: '600', fontSize: '12px' }}>
                          {val}%
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RFM Segmentation ── */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>RFM Customer Segmentation</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Based on Recency, Frequency, and Monetary value of purchases</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {rfmSegments.map(seg => (
            <div key={seg.label} style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '14px', borderLeft: `3px solid ${seg.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{seg.label}</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: seg.color }}>{seg.count}</div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{seg.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CRO Tips ── */}
      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', marginBottom: '4px' }}>💡 Cart Abandonment Recovery</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>At {cartAbandonmentRate}% abandonment, recovering just 10% more = +{Math.round(checkoutInitiated * 0.1)} extra orders/week. Set up: exit-intent popups, 3-email abandonment sequence (1h, 24h, 72h), and SMS reminders.</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>📊 AOV Growth Strategy</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Increasing AOV by 20% (₹{aov.toLocaleString()} → ₹{Math.round(aov * 1.2).toLocaleString()}) would add ₹{Math.round(aov * 0.2 * checkoutCompleted).toLocaleString()}/week. Try: free shipping at ₹{Math.round(aov * 1.3).toLocaleString()}, "You're ₹X away" progress bar, product bundles, post-purchase upsells.</div>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e', marginBottom: '4px' }}>✓ LTV Improvement Plan</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current LTV ₹{ltv.toLocaleString()} can reach ₹{Math.round(ltv * 1.4).toLocaleString()} (+40%) with: post-purchase email flows, loyalty/points program, subscription offerings, and win-back campaigns for At Risk segment ({rfmSegments[2].count} customers).</div>
        </div>
      </div>
    </div>
  );
}
