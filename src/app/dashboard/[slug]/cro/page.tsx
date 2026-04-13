import { ConversionFunnel } from '@/components/ConversionFunnel';
import { AlertPanel } from '@/components/AlertPanel';
import { CROCharts } from '@/components/CROCharts';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getCROData(brandId: string) {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });
    return brand;
  } catch {
    return null;
  }
}

export default async function CROPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({
    where: { slug },
  });

  if (!brand) {
    return <div>Brand not found</div>;
  }

  // Sample CRO metrics
  const conversionRate = 2.5;
  const cartAbandonmentRate = 68;
  const aov = 4500;
  const repeatRate = 35;
  const refundRate = 2.5;

  const conversionFunnelData = [
    { name: 'Sessions', count: 10000 },
    { name: 'Add to Cart', count: 1800 },
    { name: 'Checkout', count: 500 },
    { name: 'Completed', count: 250 },
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

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div style={{ padding: '40px 32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>CRO Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Conversion rate optimization metrics for {brand.name}</p>

      {/* Key CRO Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Conversion Rate</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>{conversionRate.toFixed(2)}%</div>
          <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>↑ 0.3% vs last week</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Avg Order Value</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>₹{aov.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>↓ 2.1% vs last week</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Cart Abandonment</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>{cartAbandonmentRate.toFixed(1)}%</div>
          <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>↑ 3.2% vs last week</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Repeat Rate</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>{repeatRate.toFixed(1)}%</div>
          <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>↑ 1.5% vs last week</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnel stages={conversionFunnelData} title="7-Day Conversion Funnel" />

      {/* Charts (client component) */}
      <CROCharts revenueData={revenueData} customersData={{ new: 1200, returning: 800 }} />

      {/* CRO Tips */}
      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#3b82f6', marginBottom: '4px' }}>💡 Opportunity: Reduce Cart Abandonment</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Your cart abandonment rate (68%) is above industry average. Implement exit-intent popups or email recovery campaigns.</div>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#f59e0b', marginBottom: '4px' }}>📊 Focus Area: AOV Growth</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Upsell and cross-sell strategies could increase your AOV from ₹{aov.toLocaleString()} to ₹5000+.</div>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#22c55e', marginBottom: '4px' }}>✓ Strong Performance: Repeat Rate</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Your repeat customer rate of {repeatRate}% is solid. Focus on loyalty programs to push this to 40%+.</div>
        </div>
      </div>
    </div>
  );
}
