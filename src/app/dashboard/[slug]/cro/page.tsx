import { getBrand } from '@/lib/mongodb-store';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';
import * as shopify from '@/lib/services/shopify';
import { AlertRules, type AlertRule } from '@/components/AlertRules';
import { AnomalyWatchdog } from '@/components/AnomalyWatchdog';

export const dynamic = 'force-dynamic';

// ── Smart insight generator (data-driven, server-side) ─────────────────────
interface Insight {
  icon: string;
  title: string;
  body: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

function generateInsights(params: {
  aov: number; prevAov: number; repeatRate: number; totalOrders: number;
  prevOrders: number; totalRevenue: number; newRevenue: number;
  returnRevenue: number; totalCustomers: number; refundRate: number;
  purchaseFrequency: number; revenuePerOrder: number; brandName: string;
}): Insight[] {
  const { aov, prevAov, repeatRate, totalOrders, prevOrders, totalRevenue,
    newRevenue, returnRevenue, totalCustomers, refundRate, purchaseFrequency } = params;

  const fmtNum = (n: number) => Math.round(n).toLocaleString('en-IN');
  const fmtRs  = (n: number) => n >= 100000
    ? `₹${(n / 100000).toFixed(2)}L` : `₹${fmtNum(n)}`;

  const insights: Insight[] = [];

  if (repeatRate < 20 && totalCustomers > 10) {
    const uplift = Math.round(totalCustomers * 0.05 * aov);
    insights.push({
      icon: '🔄', priority: 'high',
      title: `Repeat rate is low — only ${repeatRate.toFixed(1)}%`,
      body: `D2C benchmark is >25%. Getting just 5% more of your ${fmtNum(totalCustomers)} customers to reorder would add ${fmtRs(uplift)} in revenue without spending on acquisition.`,
      action: 'Launch a post-purchase email sequence (Day 7, 14, 30 after first order). Offer a loyalty discount on the second purchase. Set up win-back campaigns for customers silent for 60+ days.',
    });
  } else if (repeatRate >= 25) {
    insights.push({
      icon: '🏆', priority: 'low',
      title: `Strong repeat rate at ${repeatRate.toFixed(1)}% — above benchmark`,
      body: `Returning customers drove ${fmtRs(returnRevenue)} (${totalRevenue > 0 ? ((returnRevenue / totalRevenue) * 100).toFixed(0) : 0}% of revenue). The next lever is increasing their basket size on each visit.`,
      action: 'Upsell to existing customers via email — they convert 3–5× better than new traffic. Test bundles specifically for repeat buyers.',
    });
  }

  if (prevAov > 0 && aov < prevAov) {
    const drop = prevAov - aov;
    const lostRevenue = Math.round(drop * totalOrders);
    insights.push({
      icon: '📉', priority: 'high',
      title: `AOV dropped ₹${fmtNum(drop)} vs previous period`,
      body: `Current AOV is ${fmtRs(aov)} vs ${fmtRs(prevAov)} last period. On ${fmtNum(totalOrders)} orders that is a ${fmtRs(lostRevenue)} gap vs where you were.`,
      action: `Add a cart bar "You're ₹X away from free shipping". Create product bundles. Set free shipping threshold at ${fmtRs(aov * 1.3)} (30% above current AOV).`,
    });
  } else if (aov > 0) {
    const potentialWith20pct = Math.round(aov * 0.2 * totalOrders);
    insights.push({
      icon: '💰', priority: 'medium',
      title: `AOV at ${fmtRs(aov)} — a 20% lift adds ${fmtRs(potentialWith20pct)}`,
      body: `Increasing average basket by 20% on your ${fmtNum(totalOrders)} monthly orders adds ${fmtRs(potentialWith20pct)} without acquiring a single new customer.`,
      action: `Set free shipping at ${fmtRs(aov * 1.3)}. Add "complete the look" upsell at checkout. Test 2+1 bundle pricing on top SKUs.`,
    });
  }

  if (prevOrders > 0 && totalOrders < prevOrders * 0.9) {
    const pctDrop = (((prevOrders - totalOrders) / prevOrders) * 100).toFixed(0);
    insights.push({
      icon: '⚠️', priority: 'high',
      title: `Orders down ${pctDrop}% vs previous period`,
      body: `${fmtNum(totalOrders)} orders vs ${fmtNum(prevOrders)} last period. This usually signals reduced ad spend, creative fatigue, or a traffic dip.`,
      action: 'Check Meta/Google Ads for creative fatigue. Review traffic in GA4. Refresh creatives and launch a flash sale to recover momentum.',
    });
  }

  const newPct = totalRevenue > 0 ? (newRevenue / totalRevenue) * 100 : 0;
  if (newPct > 80 && totalRevenue > 0) {
    insights.push({
      icon: '🆕', priority: 'medium',
      title: `${newPct.toFixed(0)}% of revenue from new customers — retention is the gap`,
      body: `${fmtRs(newRevenue)} from new customers vs only ${fmtRs(returnRevenue)} from returning. Every new customer costs 5–7× more to acquire than to retain — high new-customer dependency inflates CAC.`,
      action: 'Build a post-purchase journey: onboarding email → product education → repeat purchase offer → loyalty enrolment.',
    });
  } else if (newPct < 40 && totalRevenue > 0 && totalRevenue > 500000) {
    insights.push({
      icon: '📣', priority: 'medium',
      title: `Only ${newPct.toFixed(0)}% from new customers — top of funnel needs a push`,
      body: `${fmtRs(returnRevenue)} from returning vs ${fmtRs(newRevenue)} from new. Strong retention is great, but growth plateaus when churn catches up. Fill the top of funnel.`,
      action: 'Scale winning ad creatives. Invest in Meta/Google awareness. Test influencer seeding for new audience reach.',
    });
  }

  if (refundRate > 5) {
    insights.push({
      icon: '↩️', priority: 'high',
      title: `Refund rate ${refundRate.toFixed(1)}% — above 5% benchmark`,
      body: `At ${fmtNum(totalOrders)} orders, cutting refunds by 2pp saves ${fmtRs(totalRevenue * 0.02)} in recovered revenue.`,
      action: 'Audit top returned products — are descriptions accurate? Add size guides, detailed photos, and FAQ for top SKUs. Survey refund customers to find the pattern.',
    });
  }

  if (purchaseFrequency < 1.2 && totalCustomers > 20) {
    insights.push({
      icon: '📅', priority: 'medium',
      title: `Purchase frequency ${purchaseFrequency.toFixed(2)}× — most customers only buy once`,
      body: `Increasing to 1.5× without growing your customer base would add ~${fmtRs(totalRevenue * 0.25)} in revenue.`,
      action: 'Introduce a subscription/replenishment model for consumables. Launch a loyalty programme. Send "time to reorder" reminders based on average consumption cycle.',
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function CROPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const brand = slug === 'demo'
    ? { name: 'Demo Brand', shopifyStoreUrl: 'demo', shopifyAccessToken: 'demo', alertRules: [] }
    : await getBrand(slug);
  if (!brand) return <div>Brand not found</div>;

  const noShopify = !brand.shopifyStoreUrl || !brand.shopifyAccessToken;

  type CombinedData = Awaited<ReturnType<typeof shopify.getAllAnalytics>>;
  let combined: CombinedData | null = null;

  if (slug === 'demo') {
    const { demoCROCombined } = await import('@/lib/demo-data');
    combined = demoCROCombined as unknown as CombinedData;
  } else if (!noShopify) {
    const config = { storeUrl: brand.shopifyStoreUrl!, accessToken: brand.shopifyAccessToken! };
    try {
      const cached = await cacheGet(slug, 'combined', '30d');
      combined = cached
        ? (cached as CombinedData)
        : await (async () => {
            const d = await shopify.getAllAnalytics(config, '30d');
            await cacheSet(slug, 'combined', '30d', d);
            return d;
          })();
    } catch (e) {
      console.error('CRO page Shopify fetch failed:', e);
    }
  }

  const kpis = combined?.kpis;
  const aov               = kpis?.averageOrderValue        ?? 0;
  const prevAov           = kpis?.prevAverageOrderValue    ?? 0;
  const repeatRate        = kpis?.repeatCustomerRate       ?? 0;
  const totalOrders       = kpis?.totalOrders              ?? 0;
  const prevOrders        = kpis?.prevTotalOrders          ?? 0;
  const totalRevenue      = kpis?.totalRevenue             ?? 0;
  const newRevenue        = kpis?.newCustomerRevenue       ?? 0;
  const returnRevenue     = kpis?.returningCustomerRevenue ?? 0;
  const totalCustomers    = kpis?.totalCustomers           ?? 0;
  const refundRate        = kpis?.refundRate               ?? 0;
  const purchaseFrequency = totalCustomers > 0 ? parseFloat((totalOrders / totalCustomers).toFixed(2)) : 0;
  const revenuePerOrder   = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const insights = combined ? generateInsights({
    aov, prevAov, repeatRate, totalOrders, prevOrders,
    totalRevenue, newRevenue, returnRevenue, totalCustomers,
    refundRate, purchaseFrequency, revenuePerOrder, brandName: brand.name,
  }) : [];

  const alertRules: AlertRule[] = (brand as Record<string, unknown> & { alertRules?: AlertRule[] }).alertRules ?? [];

  const currentValues: Record<string, number> = {
    aov, repeatRate, refundRate, totalOrders, totalRevenue, purchaseFrequency, revenuePerOrder,
  };

  const prevValues: Record<string, number> = {
    aov: prevAov,
    totalOrders: prevOrders,
    totalRevenue: kpis?.prevTotalRevenue ?? 0,
    totalCustomers: kpis?.prevTotalCustomers ?? 0,
  };

  const fmt  = (n: number) => Math.round(n).toLocaleString('en-IN');
  const fmtL = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${fmt(n)}`;

  const priorityColors = {
    high:   { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.25)',  dot: '#ef4444', label: 'HIGH IMPACT' },
    medium: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'MEDIUM'      },
    low:    { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.25)',  dot: '#22c55e', label: 'POSITIVE'    },
  };

  if (noShopify) {
    return (
      <div className="page-body">
        <div className="page-header">
          <div className="page-header-row">
            <div><h2>Growth Intelligence</h2><p>Smart insights and alerts for {brand.name}</p></div>
          </div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#f59e0b', marginBottom: '8px' }}>⚠️ Shopify not connected</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Connect your Shopify store in Settings to unlock smart insights and alerts.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>📈 Growth Intelligence</h2>
            <p>Smart insights and custom alerts for {brand.name} — Last 30 days</p>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* ── Anomaly Watchdog ── */}
        <AnomalyWatchdog slug={slug} />

        {/* ── KPI Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'Avg Order Value',       value: aov > 0 ? `₹${fmt(Math.round(aov))}` : '—',        delta: prevAov > 0 ? `${aov >= prevAov ? '▲' : '▼'} ${Math.abs(((aov - prevAov) / prevAov) * 100).toFixed(1)}% vs prev` : 'Last 30 days', good: aov >= prevAov || prevAov === 0 },
            { label: 'Repeat Customer Rate',  value: repeatRate > 0 ? `${repeatRate.toFixed(1)}%` : '—', delta: 'Benchmark: >25%',         good: repeatRate >= 25 },
            { label: 'Total Orders',          value: totalOrders > 0 ? fmt(totalOrders) : '—',           delta: prevOrders > 0 ? `${totalOrders >= prevOrders ? '▲' : '▼'} ${Math.abs(((totalOrders - prevOrders) / prevOrders) * 100).toFixed(1)}% vs prev` : 'Last 30 days', good: totalOrders >= prevOrders || prevOrders === 0 },
            { label: 'Revenue / Order',       value: revenuePerOrder > 0 ? `₹${fmt(revenuePerOrder)}` : '—', delta: 'Avg per completed order', good: revenuePerOrder >= 500 },
            { label: 'Refund Rate',           value: `${refundRate.toFixed(1)}%`,                       delta: 'Benchmark: <5%',            good: refundRate < 5 },
            { label: 'Purchase Frequency',    value: purchaseFrequency > 0 ? `${purchaseFrequency.toFixed(2)}×` : '—', delta: 'Orders per customer', good: purchaseFrequency >= 1.5 },
          ].map(m => (
            <div key={m.label} className="chart-card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{m.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: m.good ? '#22c55e' : '#f59e0b', fontWeight: '500' }}>{m.delta}</div>
            </div>
          ))}
        </div>

        {/* ── Revenue Split ── */}
        {(newRevenue > 0 || returnRevenue > 0) && (
          <div className="chart-card" style={{ marginBottom: '28px' }}>
            <div className="chart-card-title" style={{ marginBottom: '16px' }}>Revenue Split — New vs Returning Customers</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'New Customer Revenue', value: fmtL(newRevenue),    pct: totalRevenue > 0 ? ((newRevenue / totalRevenue) * 100).toFixed(0) : '0', color: '#3b82f6' },
                { label: 'Returning Revenue',    value: fmtL(returnRevenue), pct: totalRevenue > 0 ? ((returnRevenue / totalRevenue) * 100).toFixed(0) : '0', color: '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '14px 16px', borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>{s.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: s.color, marginTop: '4px' }}>{s.pct}% of total revenue</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Smart Insights ── */}
        <div className="chart-card" style={{ marginBottom: '28px' }}>
          <div className="chart-card-title">🧠 Smart Insights</div>
          <div className="chart-card-subtitle" style={{ marginBottom: '20px' }}>Data-driven actions ranked by revenue impact</div>
          {insights.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>Insights appear once order data is loaded.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {insights.map((insight, i) => {
                const c = priorityColors[insight.priority];
                return (
                  <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{insight.icon}</span>
                      <div style={{ flex: 1, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{insight.title}</div>
                      <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.07em', color: c.dot, background: `${c.dot}20`, padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>{c.label}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.6' }}>{insight.body}</p>
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '6px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Action</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{insight.action}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Benchmark Comparison ── */}
        <div className="chart-card" style={{ marginBottom: '28px' }}>
          <div className="chart-card-title">📊 Industry Benchmarks</div>
          <div className="chart-card-subtitle" style={{ marginBottom: '16px' }}>D2C e-commerce averages — where you stand</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { label: 'Repeat Customer Rate', value: `${repeatRate.toFixed(1)}%`,          benchmark: '>25%',   good: repeatRate >= 25 },
              { label: 'Refund Rate',          value: `${refundRate.toFixed(1)}%`,           benchmark: '<5%',    good: refundRate < 5 },
              { label: 'Purchase Frequency',   value: `${purchaseFrequency.toFixed(2)}×`,   benchmark: '>1.5×',  good: purchaseFrequency >= 1.5 },
              { label: 'Avg Order Value',       value: `₹${fmt(Math.round(aov))}`,          benchmark: '>₹800',  good: aov >= 800 },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{row.value}</span>
                  <span style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '10px', fontWeight: '600', color: row.good ? '#22c55e' : '#f59e0b', background: row.good ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)' }}>
                    {row.good ? '✓' : '!'} {row.benchmark}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Alert Rules ── */}
        <div className="chart-card">
          <div className="chart-card-title">🔔 Alert Rules</div>
          <div className="chart-card-subtitle" style={{ marginBottom: '20px' }}>
            Get notified on this page when a metric crosses your threshold. Alerts are evaluated live against your current 30-day data.
          </div>
          <AlertRules slug={slug} initialRules={alertRules} currentValues={currentValues} prevValues={prevValues} />
          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>💡 Alert ideas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['AOV drops below ₹900','Repeat rate drops below 15%','Refund rate rises above 5%','Orders drop below 100/month','Revenue drops below ₹10L','Purchase frequency drops below 1.2×','CVR drops >20% vs last period','Revenue drops >15% vs last period'].map(idea => (
                <span key={idea} style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '3px 8px' }}>{idea}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
