import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { getRevenueOverTime } from '@/lib/services/shopify';
import type { BrandEvent } from '@/types';

export const maxDuration = 120;

export interface EventRoiRow {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'ended' | 'ongoing' | 'upcoming';
  days: number;
  revenueDuring: number;
  ordersDuring: number;
  dailyDuring: number;
  dailyBaseline: number;     // same-length window immediately before
  liftPct: number | null;    // vs baseline
  revenueTarget: number | null;
  targetAchievedPct: number | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const events = ((brand as Record<string, unknown>).events as BrandEvent[] | undefined) ?? [];
    if (events.length === 0) {
      return NextResponse.json({ events: [], byType: [], note: 'No events logged yet — add them in Events & Campaigns' });
    }

    const today = new Date().toISOString().split('T')[0];

    // One revenue series covering all events + their baselines (max 365d back)
    const earliestStart = events.reduce((min, e) => e.startDate < min ? e.startDate : min, today);
    const maxEventDays = Math.max(...events.map(e =>
      Math.max(1, Math.round((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86_400_000) + 1)
    ));
    const fromMs = Math.max(
      Date.now() - 365 * 86_400_000,
      new Date(earliestStart).getTime() - (maxEventDays + 2) * 86_400_000,
    );
    const from = new Date(fromMs).toISOString().split('T')[0];

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
    const series = await getRevenueOverTime(config, `${from}:${today}`);
    const byDate = new Map(series.map(p => [p.date, p]));

    const sumWindow = (start: string, end: string) => {
      let revenue = 0, orders = 0, daysCounted = 0;
      const cur = new Date(start);
      const last = new Date(end);
      while (cur <= last) {
        const key = cur.toISOString().split('T')[0];
        if (key > today) break;
        const p = byDate.get(key);
        if (p) { revenue += p.revenue; orders += p.orders; }
        daysCounted++;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return { revenue, orders, daysCounted };
    };

    const rows: EventRoiRow[] = events
      .filter(e => e.startDate <= today)
      .map(e => {
        const status: EventRoiRow['status'] = e.endDate < today ? 'ended' : 'ongoing';
        const during = sumWindow(e.startDate, e.endDate);
        const evDays = Math.max(1, Math.round((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86_400_000) + 1);

        // Baseline: same length immediately before the event
        const baseEnd = new Date(new Date(e.startDate).getTime() - 86_400_000).toISOString().split('T')[0];
        const baseStart = new Date(new Date(e.startDate).getTime() - evDays * 86_400_000).toISOString().split('T')[0];
        const baseline = sumWindow(baseStart, baseEnd);

        const dailyDuring = during.daysCounted > 0 ? during.revenue / during.daysCounted : 0;
        const dailyBaseline = baseline.daysCounted > 0 ? baseline.revenue / baseline.daysCounted : 0;
        const liftPct = dailyBaseline > 0 ? ((dailyDuring - dailyBaseline) / dailyBaseline) * 100 : null;

        return {
          id: e.id,
          title: e.title,
          type: e.type,
          startDate: e.startDate,
          endDate: e.endDate,
          status,
          days: evDays,
          revenueDuring: Math.round(during.revenue),
          ordersDuring: during.orders,
          dailyDuring: Math.round(dailyDuring),
          dailyBaseline: Math.round(dailyBaseline),
          liftPct: liftPct !== null ? +liftPct.toFixed(1) : null,
          revenueTarget: e.revenueTarget ?? null,
          targetAchievedPct: e.revenueTarget ? +((during.revenue / e.revenueTarget) * 100).toFixed(0) : null,
        };
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    // Aggregate by event type (ended events with a measurable baseline only)
    const typeMap = new Map<string, { lifts: number[]; revenue: number; count: number }>();
    for (const r of rows) {
      if (r.status !== 'ended' || r.liftPct === null) continue;
      const t = typeMap.get(r.type) ?? { lifts: [], revenue: 0, count: 0 };
      t.lifts.push(r.liftPct);
      t.revenue += r.revenueDuring;
      t.count++;
      typeMap.set(r.type, t);
    }
    const byType = [...typeMap.entries()]
      .map(([type, t]) => ({
        type,
        count: t.count,
        avgLiftPct: +(t.lifts.reduce((s, l) => s + l, 0) / t.lifts.length).toFixed(1),
        totalRevenue: Math.round(t.revenue),
      }))
      .sort((a, b) => b.avgLiftPct - a.avgLiftPct);

    return NextResponse.json({ events: rows, byType });
  } catch (error) {
    console.error('[event-roi] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
