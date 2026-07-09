import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getRevenueOverTime, getKPIs } from '@/lib/services/shopify';
import * as meta from '@/lib/services/meta';
import { demoAnomalies } from '@/lib/demo-data';

export const maxDuration = 120;

export interface Anomaly {
  metric: string;
  severity: 'critical' | 'warning' | 'good';
  title: string;
  detail: string;
  changePct: number | null;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(demoAnomalies);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
    const metaConfig: meta.MetaConfig | null = brand.metaAccessToken && brand.metaAdAccountId
      ? { accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }
      : null;

    const [seriesR, kpisR, spendR] = await Promise.allSettled([
      getRevenueOverTime(config, '30d'),
      getKPIs(config, '7d'),
      metaConfig ? meta.getSpendOverTime(metaConfig, '30d') : Promise.reject(new Error('no meta')),
    ]);

    const series = seriesR.status === 'fulfilled' ? seriesR.value : [];
    const kpis = kpisR.status === 'fulfilled' ? kpisR.value : null;
    const spendSeries = spendR.status === 'fulfilled' ? spendR.value : [];

    const anomalies: Anomaly[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Use full days only — today is partial
    const fullDays = series.filter(p => p.date < today).sort((a, b) => a.date.localeCompare(b.date));

    if (fullDays.length >= 9) {
      const yesterday = fullDays[fullDays.length - 1];
      const prior7 = fullDays.slice(-8, -1);
      const avgRev = prior7.reduce((s, p) => s + p.revenue, 0) / prior7.length;
      const avgOrders = prior7.reduce((s, p) => s + p.orders, 0) / prior7.length;

      if (avgRev > 0) {
        const change = ((yesterday.revenue - avgRev) / avgRev) * 100;
        if (change <= -35) {
          anomalies.push({
            metric: 'revenue', severity: change <= -50 ? 'critical' : 'warning',
            title: `Yesterday's revenue ${Math.abs(change).toFixed(0)}% below normal`,
            detail: `${fmtINR(yesterday.revenue)} vs a ${fmtINR(avgRev)}/day average over the prior week. Check site uptime, checkout, payment gateway, and ad delivery.`,
            changePct: +change.toFixed(1),
          });
        } else if (change >= 50) {
          anomalies.push({
            metric: 'revenue', severity: 'good',
            title: `Yesterday spiked +${change.toFixed(0)}% above normal`,
            detail: `${fmtINR(yesterday.revenue)} vs ${fmtINR(avgRev)}/day average. Find what caused it (creator post? press? a winning ad?) and double down while it lasts.`,
            changePct: +change.toFixed(1),
          });
        }
      }

      if (avgOrders > 0) {
        const change = ((yesterday.orders - avgOrders) / avgOrders) * 100;
        if (change <= -35) {
          anomalies.push({
            metric: 'orders', severity: change <= -50 ? 'critical' : 'warning',
            title: `Order volume dropped ${Math.abs(change).toFixed(0)}% yesterday`,
            detail: `${yesterday.orders} orders vs ~${avgOrders.toFixed(0)}/day normal.`,
            changePct: +change.toFixed(1),
          });
        }
      }

      // AOV shift (yesterday vs prior week)
      const yAov = yesterday.orders > 0 ? yesterday.revenue / yesterday.orders : 0;
      const pAov = avgOrders > 0 ? avgRev / avgOrders : 0;
      if (pAov > 0 && yAov > 0) {
        const change = ((yAov - pAov) / pAov) * 100;
        if (Math.abs(change) >= 25) {
          anomalies.push({
            metric: 'aov', severity: 'warning',
            title: `AOV ${change > 0 ? 'jumped' : 'fell'} ${Math.abs(change).toFixed(0)}% yesterday`,
            detail: `${fmtINR(yAov)} vs ${fmtINR(pAov)} normal — a broken discount code, a price change, or a bundle going live usually explains this.`,
            changePct: +change.toFixed(1),
          });
        }
      }

      // Week-over-week trend
      if (fullDays.length >= 14) {
        const last7 = fullDays.slice(-7);
        const prev7 = fullDays.slice(-14, -7);
        const last7Rev = last7.reduce((s, p) => s + p.revenue, 0);
        const prev7Rev = prev7.reduce((s, p) => s + p.revenue, 0);
        if (prev7Rev > 0) {
          const change = ((last7Rev - prev7Rev) / prev7Rev) * 100;
          if (change <= -25) {
            anomalies.push({
              metric: 'trend', severity: 'warning',
              title: `Revenue trending down ${Math.abs(change).toFixed(0)}% week-over-week`,
              detail: `${fmtINR(last7Rev)} this week vs ${fmtINR(prev7Rev)} last week.`,
              changePct: +change.toFixed(1),
            });
          }
        }

        // MER trend (if spend data available)
        if (spendSeries.length > 0) {
          const spendByDate = new Map(spendSeries.map(p => [p.date, p.spend]));
          const spendOf = (daysArr: typeof last7) => daysArr.reduce((s, p) => s + (spendByDate.get(p.date) ?? 0), 0);
          const last7Spend = spendOf(last7);
          const prev7Spend = spendOf(prev7);
          if (last7Spend > 0 && prev7Spend > 0) {
            const merNow = last7Rev / last7Spend;
            const merPrev = prev7Rev / prev7Spend;
            const change = ((merNow - merPrev) / merPrev) * 100;
            if (change <= -25) {
              anomalies.push({
                metric: 'mer', severity: merNow < 1 ? 'critical' : 'warning',
                title: `MER crashed ${Math.abs(change).toFixed(0)}% week-over-week`,
                detail: `${merNow.toFixed(2)}x this week vs ${merPrev.toFixed(2)}x last week — ad efficiency is deteriorating fast. Check CPMs, creative fatigue, and tracking.`,
                changePct: +change.toFixed(1),
              });
            }
          }
        }
      }
    }

    // Refund spike (7d vs previous period from KPIs)
    if (kpis && kpis.refundRate > 2) {
      anomalies.push({
        metric: 'refunds', severity: kpis.refundRate > 5 ? 'critical' : 'warning',
        title: `Refund rate at ${kpis.refundRate.toFixed(1)}% this week`,
        detail: 'Above the comfort zone — check for a defective batch, courier issues, or a misleading offer.',
        changePct: null,
      });
    }

    const order = { critical: 0, warning: 1, good: 2 };
    anomalies.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json({
      anomalies,
      checkedAt: new Date().toISOString(),
      allClear: anomalies.filter(a => a.severity !== 'good').length === 0,
    });
  } catch (error) {
    console.error('[anomalies] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
