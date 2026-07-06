import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { requireBrandAccess } from '@/lib/auth-server';
import { demoActions } from '@/lib/demo-data';
import * as shopify from '@/lib/services/shopify';
import * as meta from '@/lib/services/meta';
import * as synter from '@/lib/services/synter';
import { cacheGet, cacheSet } from '@/lib/analytics-cache';

export const maxDuration = 300;

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'opportunity';

export interface ActionItem {
  id: string;
  severity: ActionSeverity;
  title: string;
  detail: string;
  impact: string | null;   // human-readable ₹ / % estimate
  href: string;            // deep link to the page where you act
  source: string;          // which dataset produced it
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

    if (slug === 'demo') return NextResponse.json(demoActions);

    const brand = await getBrand(slug!);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 });
    }

    const base = `/dashboard/${slug}`;
    const shopifyConfig = { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken, slug: slug! };
    const metaConfig: meta.MetaConfig | null = brand.metaAccessToken && brand.metaAdAccountId
      ? { accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId }
      : null;
    const synterKey = brand.synterApiKey || process.env.SYNTER_API_KEY || null;

    // Customer insights: use whatever window is already cached; compute 90d if cold
    const insightsRangeFor = (days: number) => {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
      return `${from}:${to}`;
    };
    const loadInsights = async () => {
      for (const days of [180, 365, 90]) {
        const hit = await cacheGet(slug!, 'customer-insights-v2', insightsRangeFor(days));
        if (hit) return hit as Awaited<ReturnType<typeof shopify.getCustomerInsights>>;
      }
      const range = insightsRangeFor(90);
      const fresh = await shopify.getCustomerInsights(shopifyConfig, range);
      await cacheSet(slug!, 'customer-insights-v2', range, fresh);
      return fresh;
    };

    // ── Gather all sources in parallel; each may fail independently ───────────
    const [kpisR, metaKpisR, synterKpisR, fatigueR, insightsR, inventoryR, goalsRevR, campaignsR] = await Promise.allSettled([
      shopify.getKPIs(shopifyConfig, '30d'),
      metaConfig ? meta.getKPIs(metaConfig, '30d') : Promise.reject(new Error('not connected')),
      synterKey ? synter.getKPIs(synterKey, '30d') : Promise.reject(new Error('not connected')),
      metaConfig ? meta.getCreativeFatigue(metaConfig, '30d') : Promise.reject(new Error('not connected')),
      loadInsights(),
      shopify.getInventoryStatus(shopifyConfig),
      (async () => {
        const now = new Date();
        const monthStart = `${now.toISOString().slice(0, 8)}01`;
        const today = now.toISOString().split('T')[0];
        return shopify.getRevenueOverTime(shopifyConfig, `${monthStart}:${today}`);
      })(),
      metaConfig ? meta.getCampaigns(metaConfig, '30d') : Promise.reject(new Error('not connected')),
    ]);

    const val = <T,>(r: PromiseSettledResult<T>): T | null => r.status === 'fulfilled' ? r.value : null;
    const kpis = val(kpisR);
    const metaKpis = val(metaKpisR);
    const synterKpis = val(synterKpisR);
    const fatigue = val(fatigueR);
    const insights = val(insightsR);
    const inventory = val(inventoryR);
    const goalsRev = val(goalsRevR);
    const campaigns = val(campaignsR);

    const actions: ActionItem[] = [];

    // ── Rule: ads vs break-even ────────────────────────────────────────────────
    const totalSpend = (metaKpis?.spend ?? 0) + (synterKpis?.spend ?? 0);
    const revenue30 = kpis?.totalRevenue ?? 0;
    const cogsPercent = brand.cogsPercent ?? 0;
    const breakEvenRoas = cogsPercent > 0 ? 1 / (1 - cogsPercent / 100) : 1.5;
    if (totalSpend > 0 && revenue30 > 0) {
      const mer = revenue30 / totalSpend;
      if (mer < breakEvenRoas) {
        actions.push({
          id: 'mer-below-breakeven', severity: 'critical', source: 'MER',
          title: 'Ad spend is below break-even',
          detail: `Blended MER is ${mer.toFixed(2)}x against a ~${breakEvenRoas.toFixed(2)}x break-even — every rupee of ads is losing money after product costs. Cut weakest campaigns or fix offer economics.`,
          impact: `${fmtINR(totalSpend)} spent in 30d`,
          href: `${base}/mer`,
        });
      } else if (mer < breakEvenRoas * 1.3) {
        actions.push({
          id: 'mer-thin', severity: 'high', source: 'MER',
          title: 'Ad efficiency is thin',
          detail: `MER ${mer.toFixed(2)}x is barely above your ${breakEvenRoas.toFixed(2)}x break-even. Small CPM inflation or discount creep flips you negative.`,
          impact: null,
          href: `${base}/mer`,
        });
      }
    }

    // ── Rule: budget reallocation ──────────────────────────────────────────────
    if (campaigns && campaigns.length > 1) {
      const spendTotal = campaigns.reduce((s, c) => s + c.spend, 0);
      const losers = campaigns.filter(c => c.spend > spendTotal * 0.02 && c.roas < Math.max(breakEvenRoas * 0.8, 1));
      const winners = campaigns.filter(c => c.roas >= Math.max(breakEvenRoas * 1.2, 2) && c.purchases >= 3);
      if (losers.length > 0 && winners.length > 0) {
        const loserSpend = losers.reduce((s, c) => s + c.spend, 0);
        actions.push({
          id: 'budget-moves', severity: 'high', source: 'Campaigns',
          title: `${losers.length} campaign${losers.length > 1 ? 's' : ''} burning budget below break-even`,
          detail: `${losers.slice(0, 2).map(c => c.name).join(', ')}${losers.length > 2 ? '…' : ''} running under ${Math.max(breakEvenRoas * 0.8, 1).toFixed(1)}x ROAS while you have ${winners.length} campaign${winners.length > 1 ? 's' : ''} worth scaling.`,
          impact: `${fmtINR(loserSpend)} of 30d spend to reallocate`,
          href: `${base}/budget`,
        });
      }
    }

    // ── Rule: creative fatigue ─────────────────────────────────────────────────
    if (fatigue && fatigue.summary.fatigued > 0) {
      actions.push({
        id: 'fatigue', severity: fatigue.summary.fatiguedSpend > totalSpend * 0.15 ? 'high' : 'medium', source: 'Creative Fatigue',
        title: `${fatigue.summary.fatigued} ad creative${fatigue.summary.fatigued > 1 ? 's are' : ' is'} fatigued`,
        detail: `Frequency is climbing while CTR drops — the audience is tuning these out. Swap creatives or rotate audiences before CPMs inflate further.`,
        impact: `${fmtINR(fatigue.summary.fatiguedSpend)} period spend on tired ads`,
        href: `${base}/fatigue`,
      });
    }

    // ── Rule: monthly goal pace ────────────────────────────────────────────────
    const target = (brand as Record<string, unknown>).monthlyRevenueTarget as number | null ?? null;
    if (goalsRev) {
      const mtd = goalsRev.reduce((s, p) => s + p.revenue, 0);
      const now = new Date();
      const dayOfMonth = now.getUTCDate();
      const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
      const projected = dayOfMonth > 0 ? (mtd / dayOfMonth) * daysInMonth : 0;
      if (target && projected < target) {
        const needed = (target - mtd) / Math.max(1, daysInMonth - dayOfMonth);
        actions.push({
          id: 'goal-behind', severity: projected < target * 0.8 ? 'high' : 'medium', source: 'Revenue Goal',
          title: 'Behind pace on the monthly revenue goal',
          detail: `Projected ${fmtINR(projected)} vs ${fmtINR(target)} target. You need ${fmtINR(needed)}/day for the rest of the month (current run rate ${fmtINR(mtd / Math.max(1, dayOfMonth))}/day).`,
          impact: `${fmtINR(target - projected)} projected shortfall`,
          href: `${base}/goals`,
        });
      } else if (!target) {
        actions.push({
          id: 'goal-unset', severity: 'opportunity', source: 'Revenue Goal',
          title: 'No monthly revenue target set',
          detail: 'Set a target so pace tracking can warn you mid-month instead of after it.',
          impact: null,
          href: `${base}/goals`,
        });
      }
    }

    // ── Rule: stock-outs & dead stock ─────────────────────────────────────────
    if (insights && inventory) {
      const rate = new Map(insights.velocity.map(v => [v.title, v.dailyAvgLast7 * 0.6 + v.dailyAvgPrior28 * 0.4]));
      const critical = inventory
        .filter(p => p.tracksInventory)
        .map(p => ({ title: p.title, cover: (rate.get(p.title) ?? 0) > 0 ? p.totalInventory / rate.get(p.title)! : Infinity }))
        .filter(p => p.cover < 7)
        .sort((a, b) => a.cover - b.cover);
      if (critical.length > 0) {
        actions.push({
          id: 'stockout', severity: 'critical', source: 'Inventory',
          title: `${critical.length} product${critical.length > 1 ? 's' : ''} about to stock out`,
          detail: `${critical.slice(0, 3).map(p => `${p.title} (${p.cover.toFixed(0)}d left)`).join(', ')}${critical.length > 3 ? '…' : ''}. At current sales rates these go to zero within a week — reorder now.`,
          impact: null,
          href: `${base}/restock`,
        });
      }

      const surging = insights.velocity.filter(v => v.status === 'surging');
      if (surging.length > 0) {
        actions.push({
          id: 'surging', severity: 'opportunity', source: 'Velocity',
          title: `${surging.length} product${surging.length > 1 ? 's' : ''} surging — ride the wave`,
          detail: `${surging.slice(0, 3).map(v => v.title).join(', ')}${surging.length > 3 ? '…' : ''} selling 1.5×+ the usual rate. Verify stock cover and consider shifting ad spend to these SKUs.`,
          impact: null,
          href: `${base}/velocity`,
        });
      }

      const stalled = insights.velocity.filter(v => v.status === 'stalled').length;
      if (stalled >= 3) {
        actions.push({
          id: 'dead-stock', severity: 'medium', source: 'Velocity',
          title: `${stalled} products have stopped selling`,
          detail: 'No sales in 14+ days. Bundle them with bestsellers, run a clearance, or cut them — dead stock ties up working capital.',
          impact: null,
          href: `${base}/velocity`,
        });
      }
    }

    // ── Rule: winback opportunities ────────────────────────────────────────────
    if (insights) {
      const atRisk = insights.segments.find(s => s.key === 'at_risk');
      const promising = insights.segments.find(s => s.key === 'promising');
      if (atRisk && atRisk.customers >= 50) {
        const estRecovery = atRisk.customers * 0.05 * (atRisk.avgSpent / Math.max(1, atRisk.avgOrders));
        actions.push({
          id: 'winback-atrisk', severity: 'opportunity', source: 'Segments',
          title: `${atRisk.customers.toLocaleString('en-IN')} repeat buyers going quiet`,
          detail: 'These customers bought 2+ times but haven\'t purchased in 3–6 months. Export the list and run a winback flow (email/WhatsApp) before they\'re gone for good.',
          impact: `~${fmtINR(estRecovery)} at a 5% recovery rate`,
          href: `${base}/segments`,
        });
      }
      if (promising && promising.customers >= 500) {
        actions.push({
          id: 'second-purchase', severity: 'opportunity', source: 'Segments',
          title: `${promising.customers.toLocaleString('en-IN')} one-time buyers waiting for a nudge`,
          detail: 'First order 1–3 months ago, no second purchase yet. A replenishment reminder or cross-sell offer converts these cheapest.',
          impact: `${fmtINR(promising.revenue)} segment value`,
          href: `${base}/segments`,
        });
      }
    }

    // ── Rule: discount burden ──────────────────────────────────────────────────
    if (kpis && revenue30 > 0 && kpis.totalDiscountsGiven > 0) {
      const burden = (kpis.totalDiscountsGiven / (revenue30 + kpis.totalDiscountsGiven)) * 100;
      if (burden >= 30) {
        actions.push({
          id: 'discount-burden', severity: 'high', source: 'Discounts',
          title: `Discounts are eating ${burden.toFixed(0)}% of gross value`,
          detail: `${fmtINR(kpis.totalDiscountsGiven)} given away in 30 days. Check the leaderboard for codes with deep discounts going to repeat customers who would buy anyway.`,
          impact: `${fmtINR(kpis.totalDiscountsGiven)} in 30d`,
          href: `${base}/discounts`,
        });
      }
    }

    // ── Sort by severity then keep stable ─────────────────────────────────────
    const order: Record<ActionSeverity, number> = { critical: 0, high: 1, medium: 2, opportunity: 3 };
    actions.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json({
      actions,
      generatedAt: new Date().toISOString(),
      sources: {
        shopify: !!kpis,
        meta: !!metaKpis,
        google: !!synterKpis,
        fatigue: !!fatigue,
        insights: !!insights,
        inventory: !!inventory,
        campaigns: !!campaigns,
      },
    });
  } catch (error) {
    console.error('[actions] API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
