import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getRevenueOverTime } from '@/lib/services/shopify';
import { getDemoGoals } from '@/lib/demo-data';

export const maxDuration = 120;

function ymd(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(getDemoGoals());

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const dayOfMonth = now.getUTCDate();

    const prevMonthStart = new Date(Date.UTC(year, month - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(year, month, 0));

    // Month-to-date + previous month in parallel
    const [mtdSeries, prevSeries] = await Promise.all([
      getRevenueOverTime(config, `${ymd(monthStart)}:${ymd(now)}`),
      getRevenueOverTime(config, `${ymd(prevMonthStart)}:${ymd(prevMonthEnd)}`),
    ]);

    const mtdRevenue = mtdSeries.reduce((s, p) => s + p.revenue, 0);
    const mtdOrders = mtdSeries.reduce((s, p) => s + p.orders, 0);
    const prevMonthRevenue = prevSeries.reduce((s, p) => s + p.revenue, 0);

    // Cumulative series for the chart
    let running = 0;
    const cumulativeSeries = mtdSeries.map(p => {
      running += p.revenue;
      return { date: p.date, revenue: p.revenue, cumulative: running };
    });

    const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
    const dailyRunRate = dayOfMonth > 0 ? mtdRevenue / dayOfMonth : 0;
    const projectedRevenue = dailyRunRate * daysInMonth;

    const target = (brand as Record<string, unknown>).monthlyRevenueTarget as number | null ?? null;
    const neededPerDay = target && daysRemaining > 0 ? Math.max(0, (target - mtdRevenue) / daysRemaining) : 0;

    return NextResponse.json({
      target,
      monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      daysInMonth,
      dayOfMonth,
      daysRemaining,
      mtdRevenue,
      mtdOrders,
      dailyRunRate,
      projectedRevenue,
      neededPerDay,
      prevMonthRevenue,
      cumulativeSeries,
    });
  } catch (error) {
    console.error('[goals] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
