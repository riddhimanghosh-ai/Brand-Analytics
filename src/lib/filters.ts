export interface FilterState {
  dateRange: '7d' | '30d' | '90d' | '1y';
  segment?: 'all' | 'new' | 'returning';
  channel?: string;
  paymentStatus?: 'all' | 'paid' | 'unpaid' | 'refunded';
  fulfillmentStatus?: 'all' | 'fulfilled' | 'unfulfilled' | 'partial';
  product?: string;
  source?: string; // GA4 traffic source
  device?: string; // GA4 device
  country?: string; // GA4/Shopify country
  minAOV?: number;
  maxAOV?: number;
}

export const DEFAULT_FILTERS: FilterState = {
  dateRange: '30d',
};

export function filterStateToParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {
    range: filters.dateRange,
  };

  if (filters.segment && filters.segment !== 'all') params.segment = filters.segment;
  if (filters.channel) params.channel = filters.channel;
  if (filters.paymentStatus && filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
  if (filters.fulfillmentStatus && filters.fulfillmentStatus !== 'all') params.fulfillmentStatus = filters.fulfillmentStatus;
  if (filters.product) params.product = filters.product;
  if (filters.source) params.source = filters.source;
  if (filters.device) params.device = filters.device;
  if (filters.country) params.country = filters.country;
  if (filters.minAOV) params.minAOV = filters.minAOV.toString();
  if (filters.maxAOV) params.maxAOV = filters.maxAOV.toString();

  return params;
}

export function paramsToFilterState(params: Record<string, string>): FilterState {
  return {
    dateRange: (params.range as any) || '30d',
    segment: params.segment as any,
    channel: params.channel,
    paymentStatus: params.paymentStatus as any,
    fulfillmentStatus: params.fulfillmentStatus as any,
    product: params.product,
    source: params.source,
    device: params.device,
    country: params.country,
    minAOV: params.minAOV ? parseFloat(params.minAOV) : undefined,
    maxAOV: params.maxAOV ? parseFloat(params.maxAOV) : undefined,
  };
}
