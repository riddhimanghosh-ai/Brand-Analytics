import { NextRequest, NextResponse } from 'next/server';

const APP_URL = 'https://main.d1rrlzi8cyg90j.amplifyapp.com';

const SCOPES = [
  'read_analytics',
  'read_all_orders',   // required to access orders older than 60 days via list/GraphQL APIs
  'read_assigned_fulfillment_orders',
  'read_customer_events',
  'read_checkouts',
  'read_inventory',
  'read_orders',
  'read_product_feeds',
  'read_product_listings',
  'read_products',
  'read_customers',
].join(',');

// GET /api/shopify/install?shop=storename.myshopify.com&slug=brand-slug
// Send this link to a brand owner to connect their Shopify store via OAuth.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop')?.trim();
  const slug = searchParams.get('slug')?.trim();

  if (!shop || !slug) {
    return new NextResponse('Missing required params: shop and slug', { status: 400 });
  }

  // Normalise shop — strip https:// if accidentally included
  const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    return new NextResponse('SHOPIFY_CLIENT_ID not configured', { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/shopify/callback`;

  const authUrl =
    `https://${cleanShop}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(slug)}`;

  return NextResponse.redirect(authUrl);
}
