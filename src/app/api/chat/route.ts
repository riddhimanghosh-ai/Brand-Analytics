import { getBrand } from '@/lib/mongodb-store';
import { NextResponse } from 'next/server';
import { streamChat } from '@/lib/services/chat';
import * as shopify from '@/lib/services/shopify';
import * as ga4 from '@/lib/services/ga4';
import * as meta from '@/lib/services/meta';
import * as googleAds from '@/lib/services/google-ads';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, messages } = body;

    if (!slug || !messages?.length) {
      return NextResponse.json({ error: 'Missing slug or messages' }, { status: 400 });
    }

    const brand = await getBrand(slug);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const apiKey = brand.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'No AI API key configured' }, { status: 400 });
    }

    // Fetch all available platform data in parallel
    const [shopifyKPIs, ga4KPIs, metaKPIs, googleKPIs] = await Promise.allSettled([
      brand.shopifyStoreUrl && brand.shopifyAccessToken
        ? shopify.getKPIs(
            { storeUrl: brand.shopifyStoreUrl, accessToken: brand.shopifyAccessToken },
            '30d'
          )
        : Promise.reject('not connected'),

      brand.ga4PropertyId && brand.ga4ServiceAccountJson
        ? ga4.getKPIs(
            { propertyId: brand.ga4PropertyId, serviceAccountJson: brand.ga4ServiceAccountJson },
            '30d'
          )
        : Promise.reject('not connected'),

      brand.metaAccessToken && brand.metaAdAccountId
        ? meta.getKPIs(
            { accessToken: brand.metaAccessToken, adAccountId: brand.metaAdAccountId },
            '30d'
          )
        : Promise.reject('not connected'),

      brand.googleAdsDevToken &&
      brand.googleAdsCustomerId &&
      brand.googleAdsRefreshToken &&
      brand.googleAdsClientId &&
      brand.googleAdsClientSecret
        ? googleAds.getKPIs(
            {
              devToken: brand.googleAdsDevToken,
              clientId: brand.googleAdsClientId,
              clientSecret: brand.googleAdsClientSecret,
              refreshToken: brand.googleAdsRefreshToken,
              customerId: brand.googleAdsCustomerId,
            },
            '30d'
          )
        : Promise.reject('not connected'),
    ]);

    // Build brand context with available metrics
    let brandContext = `**Brand:** ${brand.name}\n`;

    // Shopify context
    if (shopifyKPIs.status === 'fulfilled') {
      const k = shopifyKPIs.value;
      const revChange = (((k.totalRevenue - k.prevTotalRevenue) / (k.prevTotalRevenue || 1)) * 100).toFixed(1);
      const ordChange = (((k.totalOrders - k.prevTotalOrders) / (k.prevTotalOrders || 1)) * 100).toFixed(1);
      brandContext += `
**Shopify Data (Last 30 Days):**
- Total Revenue: ₹${k.totalRevenue.toLocaleString()}
- Total Orders: ${k.totalOrders}
- Average Order Value: ₹${k.averageOrderValue.toFixed(0)}
- Unique Customers: ${k.totalCustomers}
- Repeat Customer Rate: ${k.repeatCustomerRate.toFixed(1)}%
- Refund Rate: ${k.refundRate.toFixed(1)}%
- Avg Items per Order: ${k.averageItemsPerOrder.toFixed(1)}
- New Customer Revenue: ₹${k.newCustomerRevenue.toLocaleString()}
- Returning Customer Revenue: ₹${k.returningCustomerRevenue.toLocaleString()}
- Top Product: ${k.topSellingProduct}
- Revenue Change vs Previous Period: ${revChange}%
- Orders Change vs Previous Period: ${ordChange}%
`;
    }

    // GA4 context
    if (ga4KPIs.status === 'fulfilled') {
      const k = ga4KPIs.value;
      brandContext += `
**Google Analytics Data (Last 30 Days):**
- Sessions: ${k.sessions.toLocaleString()}
- Users: ${k.users.toLocaleString()}
- New Users: ${k.newUsers.toLocaleString()}
- Bounce Rate: ${k.bounceRate.toFixed(1)}%
- Avg Session Duration: ${Math.floor(k.avgSessionDuration / 60)}m ${Math.round(k.avgSessionDuration % 60)}s
- Pageviews: ${k.pageviews.toLocaleString()}
- Pages per Session: ${k.pagesPerSession.toFixed(1)}
${k.transactions > 0 ? `- Transactions: ${k.transactions}
- E-commerce Revenue: ₹${k.revenue.toLocaleString()}
- Conversion Rate: ${k.conversionRate.toFixed(2)}%
- Add to Carts: ${k.addToCarts}
- Checkouts Initiated: ${k.checkouts}` : ''}
`;
    }

    // Meta Ads context
    if (metaKPIs.status === 'fulfilled') {
      const k = metaKPIs.value;
      brandContext += `
**Meta Ads Data (Last 30 Days):**
- Ad Spend: $${k.spend.toFixed(2)}
- Impressions: ${k.impressions.toLocaleString()}
- Clicks: ${k.clicks.toLocaleString()}
- CTR: ${k.ctr.toFixed(2)}%
- CPC: $${k.cpc.toFixed(2)}
- CPM: $${k.cpm.toFixed(2)}
- Reach: ${k.reach.toLocaleString()}
- Purchases: ${k.purchases}
- Purchase Value: $${k.purchaseValue.toFixed(2)}
- ROAS: ${k.roas.toFixed(2)}x
- Add to Carts: ${k.addToCarts}
- Cost per Purchase: $${k.costPerPurchase.toFixed(2)}
`;
    }

    // Google Ads context
    if (googleKPIs.status === 'fulfilled') {
      const k = googleKPIs.value;
      brandContext += `
**Google Ads Data (Last 30 Days):**
- Ad Spend: $${k.spend.toFixed(2)}
- Impressions: ${k.impressions.toLocaleString()}
- Clicks: ${k.clicks.toLocaleString()}
- CTR: ${k.ctr.toFixed(2)}%
- Avg CPC: $${k.avgCpc.toFixed(2)}
- Conversions: ${k.conversions.toFixed(1)}
- Conversion Value: $${k.conversionValue.toFixed(2)}
- ROAS: ${k.roas.toFixed(2)}x
- Cost per Conversion: $${k.costPerConversion.toFixed(2)}
`;
    }

    // Connected platforms summary
    brandContext += `
**Connected Platforms:** ${[
      brand.shopifyStoreUrl ? 'Shopify' : null,
      brand.ga4PropertyId ? 'Google Analytics' : null,
      brand.metaAccessToken ? 'Meta Ads' : null,
      brand.googleAdsCustomerId ? 'Google Ads' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'None'}`;

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
