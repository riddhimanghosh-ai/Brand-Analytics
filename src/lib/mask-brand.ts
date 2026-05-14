/**
 * maskBrand — strips every credential field from a brand before sending it to the client.
 *
 * Rule: the client NEVER receives raw secrets. It only gets:
 *  - non-sensitive fields (id, name, slug, logoUrl, timestamps, savedMetrics)
 *  - non-secret platform identifiers (storeUrl, propertyId, adAccountId, customerId)
 *  - a boolean "connected" indicator replacing each secret token
 *
 * Any new credential field added to BrandData MUST be listed here.
 */

import type { BrandData } from './mongodb-store';

export type MaskedBrand = Omit<
  BrandData,
  | 'shopifyAccessToken'
  | 'ga4ServiceAccountJson'
  | 'ga4RefreshToken'
  | 'metaAppSecret'
  | 'metaAccessToken'
  | 'googleAdsDevToken'
  | 'googleAdsClientSecret'
  | 'googleAdsRefreshToken'
  | 'geminiApiKey'
  | 'tiktokAccessToken'
  | 'klaviyoApiKey'
  | 'pinterestAccessToken'
> & {
  shopifyConnected: boolean;
  ga4Connected: boolean;
  metaConnected: boolean;
  googleAdsConnected: boolean;
  geminiConnected: boolean;
  tiktokConnected: boolean;
  klaviyoConnected: boolean;
  pinterestConnected: boolean;
};

export function maskBrand(brand: BrandData): MaskedBrand {
  const {
    // ── strip every secret ──────────────────────────────
    shopifyAccessToken,
    ga4ServiceAccountJson,
    ga4RefreshToken,
    metaAppSecret,
    metaAccessToken,
    googleAdsDevToken,
    googleAdsClientSecret,
    googleAdsRefreshToken,
    geminiApiKey,
    tiktokAccessToken,
    klaviyoApiKey,
    pinterestAccessToken,
    // ── keep everything else ────────────────────────────
    ...safe
  } = brand;

  return {
    ...safe,
    shopifyConnected: !!(brand.shopifyStoreUrl && shopifyAccessToken),
    ga4Connected: !!(brand.ga4PropertyId && (ga4ServiceAccountJson || ga4RefreshToken)),
    metaConnected: !!(brand.metaAdAccountId && metaAccessToken),
    googleAdsConnected: !!googleAdsRefreshToken, // token = OAuth done; customer ID can be added after
    geminiConnected: !!geminiApiKey,
    tiktokConnected: !!(brand.tiktokAdvertiserId && tiktokAccessToken),
    klaviyoConnected: !!klaviyoApiKey,
    pinterestConnected: !!(brand.pinterestAdAccountId && pinterestAccessToken),
  };
}

export function maskBrands(brands: BrandData[]): MaskedBrand[] {
  return brands.map(maskBrand);
}
