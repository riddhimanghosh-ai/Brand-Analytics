import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import * as shopify from '@/lib/services/shopify';
import { getDemoForecast } from '@/lib/demo-data';
import { requireBrandAccess } from '@/lib/auth-server';

export const maxDuration = 60;

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function weekdayFactors(dates: string[], values: number[]): number[] {
  const byDay: number[][] = Array.from({ length: 7 }, () => []);
  dates.forEach((d, i) => { byDay[new Date(d).getDay()].push(values[i]); });
  const avgAll = values.reduce((a, b) => a + b, 0) / values.length;
  return byDay.map((vals) => {
    if (!vals.length) return 1;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avgAll > 0 ? avg / avgAll : 1;
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const horizon = parseInt(searchParams.get('horizon') || '30', 10);

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    // ── Demo mode ──────────────────────────────────────────────────────────
    if (slug === 'demo') {
      return NextResponse.json(getDemoForecast(horizon));
    }
    // ────────────────────────────────────────────────────────────────────────

    const brand = await getBrand(slug);
    if (!brand?.shopifyStoreUrl || !brand?.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const config = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken };

    // Fetch last 90 days of daily sales using existing service function
    const timeseries = await shopify.getRevenueOverTime(config, '90d');

    if (!timeseries || timeseries.length < 7) {
      return NextResponse.json({ error: 'Not enough historical data (need at least 7 days)' }, { status: 400 });
    }

    const dates = timeseries.map((d: { date: string }) => d.date);
    const revenues = timeseries.map((d: { revenue: number }) => d.revenue);
    const orders = timeseries.map((d: { orders: number }) => d.orders ?? 0);

    // Compute regression + weekday factors
    const { slope: rSlope, intercept: rIntercept } = linearRegression(revenues);
    const { slope: oSlope, intercept: oIntercept } = linearRegression(orders);
    const rFactors = weekdayFactors(dates, revenues);
    const oFactors = weekdayFactors(dates, orders);
    const maRevenue = movingAverage(revenues, 7);
    const maOrders  = movingAverage(orders, 7);

    // Std deviation for confidence interval
    const rStd = Math.sqrt(revenues.reduce((acc, v, i) => {
      const pred = rIntercept + rSlope * i;
      return acc + (v - pred) ** 2;
    }, 0) / revenues.length);

    // Build forecast
    const now = new Date();
    const n = revenues.length;
    const forecast: { date: string; revenue: number; revenueHigh: number; revenueLow: number; orders: number }[] = [];

    for (let i = 1; i <= horizon; i++) {
      const futureDate = new Date(now.getTime() + i * 86_400_000);
      const dateStr = futureDate.toISOString().split('T')[0];
      const dow = futureDate.getDay();

      // Blend: 60% trend, 40% last moving-average
      const trendRevenue  = rIntercept + rSlope * (n + i);
      const blendRevenue  = 0.6 * trendRevenue + 0.4 * (maRevenue[maRevenue.length - 1] ?? trendRevenue);
      const seasonal      = rFactors[dow] ?? 1;
      const predicted     = Math.max(0, blendRevenue * seasonal);

      const trendOrders   = oIntercept + oSlope * (n + i);
      const blendOrders   = 0.6 * trendOrders + 0.4 * (maOrders[maOrders.length - 1] ?? trendOrders);
      const predOrders    = Math.max(0, Math.round(blendOrders * (oFactors[dow] ?? 1)));

      forecast.push({
        date:        dateStr,
        revenue:     Math.round(predicted),
        revenueHigh: Math.round(predicted + rStd * 1.5),
        revenueLow:  Math.round(Math.max(0, predicted - rStd * 1.5)),
        orders:      predOrders,
      });
    }

    // Summary stats
    const forecastTotal = forecast.reduce((a, b) => a + b.revenue, 0);
    const historicalAvg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const forecastAvg   = forecast.reduce((a, b) => a + b.revenue, 0) / forecast.length;
    const growthPct     = historicalAvg > 0 ? ((forecastAvg - historicalAvg) / historicalAvg) * 100 : 0;

    return NextResponse.json({
      historical: timeseries,
      forecast,
      summary: {
        forecastTotal,
        forecastAvg: Math.round(forecastAvg),
        historicalAvg: Math.round(historicalAvg),
        growthPct: parseFloat(growthPct.toFixed(1)),
        horizon,
        trendSlope: parseFloat(rSlope.toFixed(2)),
      },
    });
  } catch (err) {
    console.error('Forecast error:', err);
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
  }
}
