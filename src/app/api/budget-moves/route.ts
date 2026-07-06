import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import * as meta from '@/lib/services/meta';
import { demoBudgetMoves } from '@/lib/demo-data';

export const maxDuration = 120;

// Marginal-return discount: money moved to a winning campaign rarely performs
// at the campaign's average ROAS — assume 70% of it.
const MARGINAL_FACTOR = 0.7;

export interface BudgetMove {
  fromCampaign: string;
  fromRoas: number;
  fromSpend: number;
  toCampaign: string;
  toRoas: number;
  amount: number;            // spend to shift (per period)
  estMonthlyGain: number;    // estimated extra revenue per 30 days
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const dateRange = fromParam && toParam ? `${fromParam}:${toParam}` : (searchParams.get('range') ?? '30d');

    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    if (slug === 'demo') return NextResponse.json(demoBudgetMoves);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.metaAccessToken || !brand.metaAdAccountId) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }

    const config: meta.MetaConfig = {
      accessToken: brand.metaAccessToken,
      adAccountId: brand.metaAdAccountId,
    };

    const campaigns = (await meta.getCampaigns(config, dateRange)).filter(c => c.spend > 0);
    if (campaigns.length === 0) {
      return NextResponse.json({ error: 'No campaigns with spend in this period' }, { status: 422 });
    }

    // Break-even ROAS from cost settings (same formula as profit page);
    // fall back to 1.5x if COGS isn't configured.
    const cogsPercent = brand.cogsPercent ?? 0;
    const breakEvenRoas = cogsPercent > 0 ? 1 / (1 - cogsPercent / 100) : 1.5;

    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.purchaseValue, 0);
    const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const winnerThreshold = Math.max(breakEvenRoas * 1.2, 2);
    const loserThreshold = Math.max(breakEvenRoas * 0.8, 1);

    const winners = campaigns
      .filter(c => c.roas >= winnerThreshold && c.purchases >= 3)
      .sort((a, b) => b.roas - a.roas);
    const losers = campaigns
      .filter(c => c.roas < loserThreshold && c.spend >= totalSpend * 0.02)
      .sort((a, b) => a.roas - b.roas);

    // Pair each loser with the best winner (round-robin over top 3 winners
    // so one campaign doesn't absorb everything)
    const moves: BudgetMove[] = [];
    const topWinners = winners.slice(0, 3);
    losers.forEach((l, i) => {
      if (topWinners.length === 0) return;
      const w = topWinners[i % topWinners.length];
      const periodDays = dateRange.includes(':')
        ? Math.max(1, Math.round((new Date(dateRange.split(':')[1]).getTime() - new Date(dateRange.split(':')[0]).getTime()) / 86_400_000))
        : Number((dateRange.match(/^(\d+)d$/) ?? [])[1] ?? 30);
      const monthlySpend = (l.spend / periodDays) * 30;
      // Cap the target ROAS at 3× blended — tiny retargeting campaigns post
      // outlier ROAS that money moved at scale will never reproduce
      const effectiveToRoas = Math.min(w.roas, blendedRoas * 3);
      const gain = monthlySpend * (effectiveToRoas * MARGINAL_FACTOR - l.roas);
      if (gain <= 0) return;
      moves.push({
        fromCampaign: l.name,
        fromRoas: +l.roas.toFixed(2),
        fromSpend: Math.round(monthlySpend),
        toCampaign: w.name,
        toRoas: +w.roas.toFixed(2),
        amount: Math.round(monthlySpend),
        estMonthlyGain: Math.round(gain),
      });
    });

    return NextResponse.json({
      breakEvenRoas: +breakEvenRoas.toFixed(2),
      breakEvenSource: cogsPercent > 0 ? 'cogs' : 'default',
      blendedRoas: +blendedRoas.toFixed(2),
      totalSpend,
      totalRevenue,
      winnerThreshold: +winnerThreshold.toFixed(2),
      loserThreshold: +loserThreshold.toFixed(2),
      marginalFactor: MARGINAL_FACTOR,
      campaigns: campaigns
        .map(c => ({
          name: c.name,
          status: c.status,
          spend: Math.round(c.spend),
          revenue: Math.round(c.purchaseValue),
          roas: +c.roas.toFixed(2),
          purchases: c.purchases,
          bucket: c.roas >= winnerThreshold && c.purchases >= 3 ? 'winner'
                : c.roas < loserThreshold ? 'loser' : 'middle',
        }))
        .sort((a, b) => b.spend - a.spend),
      moves,
      totalEstMonthlyGain: moves.reduce((s, m) => s + m.estMonthlyGain, 0),
    });
  } catch (error) {
    console.error('[budget-moves] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
