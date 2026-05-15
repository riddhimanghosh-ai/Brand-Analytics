import { NextRequest, NextResponse } from 'next/server';
import { updateBrand } from '@/lib/mongodb-store';
import { cacheInvalidate } from '@/lib/analytics-cache';

const APP_URL = 'https://main.d1rrlzi8cyg90j.amplifyapp.com';

// GET /api/shopify/callback
// Shopify redirects here after the merchant approves the app installation.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const slug = searchParams.get('state'); // we passed brand slug as state

  if (!code || !shop || !slug) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_params`);
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse('Shopify credentials not configured on server', { status: 500 });
  }

  // Exchange the temporary code for a permanent access token
  let accessToken: string;
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Shopify token exchange failed:', text);
      return NextResponse.redirect(`${APP_URL}/?error=token_exchange_failed`);
    }

    const data = await tokenRes.json() as { access_token: string };
    accessToken = data.access_token;
  } catch (err) {
    console.error('Shopify callback error:', err);
    return NextResponse.redirect(`${APP_URL}/?error=server_error`);
  }

  // Save store URL + access token to the brand in MongoDB
  try {
    await updateBrand(slug, {
      shopifyStoreUrl: shop,
      shopifyAccessToken: accessToken,
    });
  } catch (err) {
    console.error('Failed to save Shopify credentials:', err);
    return NextResponse.redirect(`${APP_URL}/?error=save_failed`);
  }

  // Clear all cached data so the new token is used immediately on next load.
  // Run both cache clears in parallel, fire-and-forget (don't block the redirect).
  Promise.all([
    cacheInvalidate(slug),
    import('@/lib/shopify-sync').then(({ clearCachedDays }) => clearCachedDays(slug)),
  ]).catch((err) => console.error('[shopify/callback] cache clear error:', err));

  // Done — redirect back to the brand's settings page
  return NextResponse.redirect(`${APP_URL}/dashboard/${slug}/settings?shopify=connected`);
}
