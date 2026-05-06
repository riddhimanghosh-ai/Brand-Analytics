/**
 * TikTok Ads API Service
 */

export interface TikTokConfig {
  accessToken: string;
  advertiserId: string;
}

export interface TikTokKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  videoViews: number;
  reach: number;
}

export interface TikTokCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  videoViews: number;
}

const BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3';

async function tiktokGet(path: string, config: TikTokConfig, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      'Access-Token': config.accessToken,
      'Content-Type': 'application/json',
    },
  });

  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || `TikTok API error ${json.code}`);
  return json.data;
}

function dateRange(days: number) {
  const now = new Date();
  const start = new Date(now.getTime() - days * 86_400_000);
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: now.toISOString().split('T')[0],
  };
}

export async function getKPIs(config: TikTokConfig, range = '30d'): Promise<TikTokKPIs> {
  const days = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[range] ?? 30;
  const { start_date, end_date } = dateRange(days);

  const data = await tiktokGet('/report/integrated/get/', config, {
    advertiser_id: config.advertiserId,
    report_type: 'BASIC',
    dimensions: JSON.stringify(['advertiser_id']),
    metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversion', 'value', 'real_time_app_install', 'video_play_actions', 'reach']),
    start_date,
    end_date,
  });

  const row = data?.list?.[0]?.metrics || {};
  const spend = parseFloat(row.spend || '0');
  const conversionValue = parseFloat(row.value || '0');

  return {
    spend,
    impressions: parseInt(row.impressions || '0', 10),
    clicks: parseInt(row.clicks || '0', 10),
    ctr: parseFloat(row.ctr || '0'),
    cpc: parseFloat(row.cpc || '0'),
    conversions: parseInt(row.conversion || '0', 10),
    conversionValue,
    roas: spend > 0 ? conversionValue / spend : 0,
    videoViews: parseInt(row.video_play_actions || '0', 10),
    reach: parseInt(row.reach || '0', 10),
  };
}

export async function getCampaigns(config: TikTokConfig, range = '30d'): Promise<TikTokCampaign[]> {
  const days = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[range] ?? 30;
  const { start_date, end_date } = dateRange(days);

  try {
    const data = await tiktokGet('/report/integrated/get/', config, {
      advertiser_id: config.advertiserId,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['campaign_id', 'campaign_name']),
      metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion', 'value', 'video_play_actions', 'campaign_name', 'status']),
      start_date,
      end_date,
      page_size: '20',
    });

    return (data?.list || []).map((item: Record<string, Record<string, string>>) => {
      const m = item.metrics || {};
      const spend = parseFloat(m.spend || '0');
      const value = parseFloat(m.value || '0');
      return {
        id: item.dimensions?.campaign_id || '',
        name: m.campaign_name || item.dimensions?.campaign_name || 'Unknown',
        status: m.status || 'ACTIVE',
        spend,
        impressions: parseInt(m.impressions || '0', 10),
        clicks: parseInt(m.clicks || '0', 10),
        conversions: parseInt(m.conversion || '0', 10),
        roas: spend > 0 ? value / spend : 0,
        videoViews: parseInt(m.video_play_actions || '0', 10),
      };
    });
  } catch {
    return [];
  }
}
