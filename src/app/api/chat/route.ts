import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { streamChat } from '@/lib/services/chat';
import * as shopify from '@/lib/services/shopify';
import * as ga4 from '@/lib/services/ga4';
import * as meta from '@/lib/services/meta';
import * as googleAds from '@/lib/services/google-ads';
import { getDemoChatResponse } from '@/lib/demo-data';
import { requireBrandAccess } from '@/lib/auth-server';

// Detect which platforms are relevant to the user's question.
// Returns a set of platform keys. Falls back to all connected platforms if unclear.
function detectIntent(messages: { role: string; content: string }[]): Set<string> {
  // Look at last 2 user messages for context
  const recentText = messages
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const platforms = new Set<string>();

  // Shopify signals
  if (/shopify|order|revenue|sale|product|customer|aov|average order|refund|cart|checkout|inventory|fulfil|ltv|repeat|returning|new customer|top product|item/.test(recentText)) {
    platforms.add('shopify');
  }

  // GA4 / traffic signals
  if (/google analytics|ga4|traffic|session|bounce|visitor|pageview|landing page|source|channel|organic|referral|direct|duration|engagement/.test(recentText)) {
    platforms.add('ga4');
  }

  // Meta / Facebook / Instagram signals
  if (/meta|facebook|instagram|fb|ig|roas|cpm|ctr|cpc|ad spend|campaign|impression|reach|purchase value|cost per/.test(recentText)) {
    platforms.add('meta');
  }

  // Google Ads signals
  if (/google ads|adwords|search ad|ppc|keyword|google campaign|cost per conversion|conversion value/.test(recentText)) {
    platforms.add('googleAds');
  }

  // Multi-platform questions — fetch all
  if (/all platform|every platform|overall|blended|total spend|compare|which channel|best channel|where should i/.test(recentText)) {
    platforms.add('shopify');
    platforms.add('ga4');
    platforms.add('meta');
    platforms.add('googleAds');
  }

  // If still nothing matched, fall back to all (generic question)
  if (platforms.size === 0) {
    platforms.add('shopify');
    platforms.add('ga4');
    platforms.add('meta');
    platforms.add('googleAds');
  }

  return platforms;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, messages } = body;

    if (!slug || !messages?.length) {
      return NextResponse.json({ error: 'Missing slug or messages' }, { status: 400 });
    }

    // ── Auth: ensure the logged-in user can access this brand ────────────────
    const { denied } = await requireBrandAccess(slug);
    if (denied) return denied;

    const brand = await getBrand(slug);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // ── Demo mode — return a scripted SSE response without calling Gemini ──
    if (slug === 'demo') {
      const lastMsg = messages[messages.length - 1]?.content ?? '';
      const responseText = getDemoChatResponse(lastMsg);
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          // Simulate streaming by chunking the response word by word
          const words = responseText.split(' ');
          let i = 0;
          const tick = () => {
            if (i < words.length) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`)
              );
              i++;
              // Use setImmediate-like approach
              Promise.resolve().then(tick);
            } else {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          };
          tick();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to environment variables.' }, { status: 400 });
    }

    // Detect intent — only fetch what's relevant
    const intent = detectIntent(messages);

    const shouldFetch = {
      shopify: intent.has('shopify') && !!(brand.shopifyStoreUrl && brand.shopifyAccessToken),
      ga4: intent.has('ga4') && !!(brand.ga4PropertyId && brand.ga4ServiceAccountJson),
      meta: intent.has('meta') && !!(brand.metaAccessToken && brand.metaAdAccountId),
      googleAds:
        intent.has('googleAds') &&
        !!(
          brand.googleAdsDevToken &&
          brand.googleAdsCustomerId &&
          brand.googleAdsRefreshToken &&
          brand.googleAdsClientId &&
          brand.googleAdsClientSecret
        ),
    };

    const shopifyConfig = shouldFetch.shopify
      ? { storeUrl: brand.shopifyStoreUrl!, accessToken: brand.shopifyAccessToken! }
      : null;

    // Detect if question is product-focused (fetch top products list too)
    const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').slice(-1)[0]?.content?.toLowerCase() ?? '';
    const wantsProducts = /product|best.sell|top.sell|item|sku|variant|collection|inventory/.test(lastUserMsg);

    // Fetch shop currency so we can label ad spend correctly (INR, USD, etc.)
    let shopCurrency = 'INR'; // safe default for Hira
    if (shopifyConfig) {
      try {
        const shopInfo = await shopify.getShopInfo(shopifyConfig) as { currencyCode?: string } | null;
        if (shopInfo?.currencyCode) shopCurrency = shopInfo.currencyCode;
      } catch { /* non-fatal */ }
    }
    // Map ISO currency code → symbol
    const currencySymbol: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€', AUD: 'A$', CAD: 'C$' };
    const sym = currencySymbol[shopCurrency] ?? shopCurrency + ' ';

    // Fetch only the platforms we need, in parallel
    const [shopifyResult, ga4Result, metaResult, googleAdsResult, productsResult] = await Promise.allSettled([
      shopifyConfig
        ? shopify.getKPIs(shopifyConfig, '30d')
        : Promise.reject('not requested'),

      shouldFetch.ga4
        ? ga4.getKPIs({ propertyId: brand.ga4PropertyId!, serviceAccountJson: brand.ga4ServiceAccountJson! }, '30d')
        : Promise.reject('not requested'),

      shouldFetch.meta
        ? meta.getKPIs({ accessToken: brand.metaAccessToken!, adAccountId: brand.metaAdAccountId! }, '30d')
        : Promise.reject('not requested'),

      shouldFetch.googleAds
        ? googleAds.getKPIs(
            {
              devToken: brand.googleAdsDevToken!,
              clientId: brand.googleAdsClientId!,
              clientSecret: brand.googleAdsClientSecret!,
              refreshToken: brand.googleAdsRefreshToken!,
              customerId: brand.googleAdsCustomerId!,
            },
            '30d'
          )
        : Promise.reject('not requested'),

      // Always fetch top products when Shopify is connected — lightweight ShopifyQL query
      shopifyConfig
        ? shopify.getTopProductsSummary(shopifyConfig, '30d', 15)
        : Promise.reject('not requested'),
    ]);

    // Build compact brand context — only what's available and relevant
    const sections: string[] = [`Brand: ${brand.name}`];

    if (shopifyResult.status === 'fulfilled') {
      const k = shopifyResult.value;
      const revChg = (((k.totalRevenue - k.prevTotalRevenue) / (k.prevTotalRevenue || 1)) * 100).toFixed(1);
      sections.push(
        `Shopify (last 30d): revenue ₹${k.totalRevenue.toLocaleString()} (${revChg}% vs prev), orders ${k.totalOrders}, AOV ₹${k.averageOrderValue.toFixed(0)}, customers ${k.totalCustomers}, repeat rate ${k.repeatCustomerRate.toFixed(1)}%, refund rate ${k.refundRate.toFixed(1)}%, avg items/order ${k.averageItemsPerOrder.toFixed(1)}, new customer rev ₹${(k.newCustomerRevenue ?? 0).toLocaleString()}, returning rev ₹${(k.returningCustomerRevenue ?? 0).toLocaleString()}, conversion rate ${(k.conversionRate ?? 0).toFixed(2)}%, cart abandonment ${(k.cartAbandonmentRate ?? 0).toFixed(1)}%`
      );
    } else if (shouldFetch.shopify === false && intent.has('shopify')) {
      sections.push('Shopify: not connected');
    }

    // Top products — always include if available (AI needs this for product questions)
    if (productsResult.status === 'fulfilled' && productsResult.value.length > 0) {
      const products = productsResult.value;
      const productLines = products.map((p, i) =>
        `  ${i + 1}. ${p.title}: ₹${p.revenue.toLocaleString()} revenue, ${p.orders} orders, AOV ₹${p.aov.toFixed(0)}`
      ).join('\n');
      sections.push(`Top ${products.length} products by revenue (last 30d):\n${productLines}`);
    }

    if (ga4Result.status === 'fulfilled') {
      const k = ga4Result.value;
      const crPart = k.transactions > 0 ? `, conversion rate ${k.conversionRate.toFixed(2)}%, add to carts ${k.addToCarts}, checkouts ${k.checkouts}` : '';
      sections.push(
        `GA4 (last 30d): sessions ${k.sessions.toLocaleString()}, users ${k.users.toLocaleString()}, new users ${k.newUsers.toLocaleString()}, bounce rate ${k.bounceRate.toFixed(1)}%, avg session ${Math.floor(k.avgSessionDuration / 60)}m${Math.round(k.avgSessionDuration % 60)}s, pages/session ${k.pagesPerSession.toFixed(1)}${crPart}`
      );
    } else if (shouldFetch.ga4 === false && intent.has('ga4')) {
      sections.push('Google Analytics: not connected');
    }

    if (metaResult.status === 'fulfilled') {
      const k = metaResult.value;
      sections.push(
        `Meta Ads (last 30d, currency: ${shopCurrency}): spend ${sym}${k.spend.toFixed(2)}, ROAS ${k.roas.toFixed(2)}x, purchases ${k.purchases}, purchase value ${sym}${k.purchaseValue.toFixed(2)}, CTR ${k.ctr.toFixed(2)}%, CPC ${sym}${k.cpc.toFixed(2)}, CPM ${sym}${k.cpm.toFixed(2)}, reach ${k.reach.toLocaleString()}, add to carts ${k.addToCarts}, cost/purchase ${sym}${k.costPerPurchase.toFixed(2)}`
      );
    } else if (shouldFetch.meta === false && intent.has('meta')) {
      sections.push('Meta Ads: not connected');
    }

    if (googleAdsResult.status === 'fulfilled') {
      const k = googleAdsResult.value;
      sections.push(
        `Google Ads (last 30d, currency: ${shopCurrency}): spend ${sym}${k.spend.toFixed(2)}, ROAS ${k.roas.toFixed(2)}x, conversions ${k.conversions.toFixed(1)}, conversion value ${sym}${k.conversionValue.toFixed(2)}, CTR ${k.ctr.toFixed(2)}%, CPC ${sym}${k.avgCpc.toFixed(2)}, cost/conversion ${sym}${k.costPerConversion.toFixed(2)}`
      );
    } else if (shouldFetch.googleAds === false && intent.has('googleAds')) {
      sections.push('Google Ads: not connected');
    }

    // Always append connected platforms list so AI knows what's available
    const connectedList = [
      brand.shopifyStoreUrl && brand.shopifyAccessToken ? 'Shopify' : null,
      brand.ga4PropertyId && brand.ga4ServiceAccountJson ? 'GA4' : null,
      brand.metaAccessToken && brand.metaAdAccountId ? 'Meta Ads' : null,
      brand.googleAdsCustomerId ? 'Google Ads' : null,
      brand.tiktokAccessToken && brand.tiktokAdvertiserId ? 'TikTok Ads' : null,
      brand.klaviyoApiKey ? 'Klaviyo' : null,
    ]
      .filter(Boolean)
      .join(', ');

    sections.push(`Connected platforms: ${connectedList || 'none'}`);

    const brandContext = sections.join('\n');

    const stream = await streamChat(apiKey, messages, brandContext);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Chat error' },
      { status: 500 }
    );
  }
}
