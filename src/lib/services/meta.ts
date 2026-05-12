const BASE = 'https://graph.facebook.com/v21.0';

const DATE_PRESETS: Record<string, string> = {
  '7d': 'last_7d',
  '30d': 'last_30_days',
  '90d': 'last_90_days',
};

export interface MetaConfig {
  accessToken: string;
  adAccountId: string;
}

export interface MetaKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  addToCarts: number;
  viewContent: number;
  costPerPurchase: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
}

export interface MetaSpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
}

// ---- Helpers ----

function accountId(id: string): string {
  return id.startsWith('act_') ? id : `act_${id}`;
}

type ActionRow = { action_type: string; value: string };

function extractAction(actions: ActionRow[] | undefined, type: string): number {
  return parseFloat(actions?.find((a) => a.action_type === type)?.value ?? '0') || 0;
}

async function fetchMeta<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = (await res.json()) as T & { error?: { message: string } };

  if ((data as { error?: { message: string } }).error) {
    throw new Error(
      `Meta API: ${(data as { error: { message: string } }).error.message}`
    );
  }
  if (!res.ok) throw new Error(`Meta API HTTP ${res.status}`);

  return data;
}

// ---- Exports ----

export async function getKPIs(config: MetaConfig, dateRange: string): Promise<MetaKPIs> {
  const acct = accountId(config.adAccountId);
  const datePreset = DATE_PRESETS[dateRange] ?? 'last_30_days';

  const data = await fetchMeta<{
    data: Array<{
      spend: string;
      impressions: string;
      clicks: string;
      ctr: string;
      cpc: string;
      cpm: string;
      reach: string;
      actions?: ActionRow[];
      action_values?: ActionRow[];
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    date_preset: datePreset,
    fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
    level: 'account',
  });

  if (!data.data?.length) {
    return {
      spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, reach: 0,
      purchases: 0, purchaseValue: 0, roas: 0, addToCarts: 0, viewContent: 0,
      costPerPurchase: 0,
    };
  }

  const d = data.data[0];
  const spend = parseFloat(d.spend ?? '0');
  const purchaseValue = extractAction(d.action_values, 'purchase');
  const purchases = extractAction(d.actions, 'purchase');

  return {
    spend,
    impressions: parseInt(d.impressions ?? '0'),
    clicks: parseInt(d.clicks ?? '0'),
    ctr: parseFloat(d.ctr ?? '0'),
    cpc: parseFloat(d.cpc ?? '0'),
    cpm: parseFloat(d.cpm ?? '0'),
    reach: parseInt(d.reach ?? '0'),
    purchases,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    addToCarts: extractAction(d.actions, 'add_to_cart'),
    viewContent: extractAction(d.actions, 'view_content'),
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
  };
}

export async function getCampaigns(config: MetaConfig, dateRange: string): Promise<MetaCampaign[]> {
  const acct = accountId(config.adAccountId);
  const datePreset = DATE_PRESETS[dateRange] ?? 'last_30_days';

  const data = await fetchMeta<{
    data: Array<{
      campaign_id: string;
      campaign_name: string;
      spend: string;
      impressions: string;
      clicks: string;
      ctr: string;
      cpc: string;
      actions?: ActionRow[];
      action_values?: ActionRow[];
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    date_preset: datePreset,
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values',
    level: 'campaign',
    limit: '500',
  });

  if (!data.data) return [];

  return data.data
    .map((d) => {
      const spend = parseFloat(d.spend ?? '0');
      const purchaseValue = extractAction(d.action_values, 'purchase');
      return {
        id: d.campaign_id,
        name: d.campaign_name,
        spend,
        impressions: parseInt(d.impressions ?? '0'),
        clicks: parseInt(d.clicks ?? '0'),
        ctr: parseFloat(d.ctr ?? '0'),
        cpc: parseFloat(d.cpc ?? '0'),
        purchases: extractAction(d.actions, 'purchase'),
        purchaseValue,
        roas: spend > 0 ? purchaseValue / spend : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export async function getSpendOverTime(
  config: MetaConfig,
  dateRange: string
): Promise<MetaSpendPoint[]> {
  const acct = accountId(config.adAccountId);
  const datePreset = DATE_PRESETS[dateRange] ?? 'last_30_days';

  const data = await fetchMeta<{
    data: Array<{
      date_start: string;
      spend: string;
      impressions: string;
      clicks: string;
    }>;
  }>(`${acct}/insights`, {
    access_token: config.accessToken,
    date_preset: datePreset,
    fields: 'spend,impressions,clicks,date_start',
    time_increment: '1',
    level: 'account',
    limit: '100',
  });

  if (!data.data) return [];

  return data.data
    .map((d) => ({
      date: d.date_start,
      spend: parseFloat(d.spend ?? '0'),
      impressions: parseInt(d.impressions ?? '0'),
      clicks: parseInt(d.clicks ?? '0'),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
