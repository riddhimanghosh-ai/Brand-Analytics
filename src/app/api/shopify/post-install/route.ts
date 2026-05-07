import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const APP_URL = 'https://main.d1rrlzi8cyg90j.amplifyapp.com';

// GET /api/shopify/post-install
// Shopify redirects here after user installs the custom app from the Distribution page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Extract Shopify parameters
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const host = searchParams.get('host');
  const timestamp = searchParams.get('timestamp');

  if (!shop || !hmac || !host || !timestamp) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_shopify_params`);
  }

  // Verify HMAC signature (security check)
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || '';
  const params = new URLSearchParams();

  // Add all params except hmac in alphabetical order
  const allParams = Array.from(searchParams.entries())
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [key, value] of allParams) {
    params.append(key, value);
  }

  const computed = crypto
    .createHmac('sha256', clientSecret)
    .update(params.toString())
    .digest('base64');

  if (computed !== hmac) {
    console.error('HMAC verification failed', { computed, hmac });
    return NextResponse.redirect(`${APP_URL}/?error=invalid_hmac`);
  }

  // HMAC verified — redirect to success page with store domain
  const encodedShop = encodeURIComponent(shop);
  return NextResponse.redirect(`${APP_URL}/shopify-installed?shop=${encodedShop}`);
}
