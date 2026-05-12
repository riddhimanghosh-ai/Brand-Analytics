/**
 * Klaviyo Email Marketing API Service
 */

export interface KlaviyoConfig {
  apiKey: string;
}

export interface KlaviyoKPIs {
  totalRevenue: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  campaignsSent: number;
  activeFlows: number;
  totalProfiles: number;
  newProfiles30d: number;
}

export interface KlaviyoCampaign {
  id: string;
  name: string;
  status: string;
  sentAt: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  revenue: number;
  unsubscribeRate: number;
}

export interface KlaviyoFlow {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  revenue30d: number;
  emails30d: number;
}

async function klaviyoGet(path: string, apiKey: string, params: Record<string, string> = {}) {
  const url = new URL(`https://a.klaviyo.com/api/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: '2024-02-15',
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { errors?: { detail?: string }[] })?.errors?.[0]?.detail || `Klaviyo API error ${res.status}`);
  }

  return res.json();
}

async function klaviyoPost(path: string, apiKey: string, body: unknown) {
  const res = await fetch(`https://a.klaviyo.com/api/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: '2024-02-15',
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { errors?: { detail?: string }[] })?.errors?.[0]?.detail || `Klaviyo API error ${res.status}`);
  }

  return res.json();
}

export async function getKPIs(config: KlaviyoConfig): Promise<KlaviyoKPIs> {
  const [profilesData, campaignsData, reportData, flowsData] = await Promise.allSettled([
    klaviyoGet('profiles', config.apiKey, { 'page[size]': '1' }),
    klaviyoGet('campaigns', config.apiKey, {
      'filter': 'equals(messages.channel,"email"),equals(status,"Sent")',
      'sort': '-send_time',
      'page[size]': '100',
    }),
    klaviyoPost('reporting/campaigns/campaign-values-reports/', config.apiKey, {
      data: {
        type: 'campaign-values-report',
        attributes: {
          timeframe: { key: 'last_30_days' },
          statistics: ['opens', 'open_rate', 'clicks', 'click_rate', 'revenue', 'sends'],
          conversion_metric_id: null,
          by: null,
          filter: null,
        },
      },
    }),
    klaviyoGet('flows', config.apiKey, {
      'filter': 'equals(status,"live")',
      'page[size]': '1',
    }),
  ]);

  const totalProfiles = profilesData.status === 'fulfilled'
    ? (profilesData.value?.meta?.total ?? 0) : 0;

  const campaignsSent = campaignsData.status === 'fulfilled'
    ? (campaignsData.value?.data?.length ?? 0) : 0;

  const activeFlows = flowsData.status === 'fulfilled'
    ? (flowsData.value?.meta?.total ?? 0) : 0;

  let totalRevenue = 0;
  let totalOpenRate = 0;
  let totalClickRate = 0;
  let statsCount = 0;

  if (reportData.status === 'fulfilled') {
    const results = reportData.value?.data?.attributes?.results ?? [];
    for (const r of results) {
      const stats = r.statistics ?? {};
      totalRevenue += typeof stats.revenue === 'number' ? stats.revenue : 0;
      totalOpenRate += typeof stats.open_rate === 'number' ? stats.open_rate : 0;
      totalClickRate += typeof stats.click_rate === 'number' ? stats.click_rate : 0;
      statsCount++;
    }
  }

  return {
    totalRevenue,
    openRate: statsCount > 0 ? (totalOpenRate / statsCount) * 100 : 0,
    clickRate: statsCount > 0 ? (totalClickRate / statsCount) * 100 : 0,
    bounceRate: 0,
    unsubscribeRate: 0,
    campaignsSent,
    activeFlows,
    totalProfiles,
    newProfiles30d: 0,
  };
}

export async function getCampaigns(config: KlaviyoConfig): Promise<KlaviyoCampaign[]> {
  const [campaignsData, reportData] = await Promise.allSettled([
    klaviyoGet('campaigns', config.apiKey, {
      'filter': 'equals(messages.channel,"email"),equals(status,"Sent")',
      'sort': '-send_time',
      'page[size]': '50',
    }),
    klaviyoPost('reporting/campaigns/campaign-values-reports/', config.apiKey, {
      data: {
        type: 'campaign-values-report',
        attributes: {
          timeframe: { key: 'last_90_days' },
          statistics: ['opens', 'open_rate', 'clicks', 'click_rate', 'revenue', 'sends', 'unsubscribes', 'unsubscribe_rate'],
          conversion_metric_id: null,
          by: null,
          filter: null,
        },
      },
    }),
  ]);

  if (campaignsData.status !== 'fulfilled') return [];

  // Build stats lookup by campaign_id
  const statsMap: Record<string, {
    openRate: number; clickRate: number; revenue: number;
    recipients: number; unsubscribeRate: number;
  }> = {};

  if (reportData.status === 'fulfilled') {
    const results = reportData.value?.data?.attributes?.results ?? [];
    for (const r of results) {
      if (r.campaign_id) {
        const s = r.statistics ?? {};
        statsMap[r.campaign_id] = {
          openRate: (typeof s.open_rate === 'number' ? s.open_rate : 0) * 100,
          clickRate: (typeof s.click_rate === 'number' ? s.click_rate : 0) * 100,
          revenue: typeof s.revenue === 'number' ? s.revenue : 0,
          recipients: typeof s.sends === 'number' ? s.sends : 0,
          unsubscribeRate: (typeof s.unsubscribe_rate === 'number' ? s.unsubscribe_rate : 0) * 100,
        };
      }
    }
  }

  return (campaignsData.value?.data ?? []).map((c: { id: string; attributes: Record<string, unknown> }) => {
    const stats = statsMap[c.id] ?? { openRate: 0, clickRate: 0, revenue: 0, recipients: 0, unsubscribeRate: 0 };
    return {
      id: c.id,
      name: (c.attributes?.name as string) || 'Unknown',
      status: (c.attributes?.status as string) || 'Sent',
      sentAt: (c.attributes?.send_time as string) || '',
      recipients: stats.recipients,
      openRate: stats.openRate,
      clickRate: stats.clickRate,
      revenue: stats.revenue,
      unsubscribeRate: stats.unsubscribeRate,
    };
  });
}

export async function getFlows(config: KlaviyoConfig): Promise<KlaviyoFlow[]> {
  const data = await klaviyoGet('flows', config.apiKey, { 'page[size]': '20' });

  return (data?.data || []).map((f: { id: string; attributes: Record<string, string | number> }) => ({
    id: f.id,
    name: f.attributes?.name || 'Unknown',
    status: f.attributes?.status || 'live',
    triggerType: f.attributes?.trigger_type || 'unknown',
    revenue30d: 0,
    emails30d: 0,
  }));
}
