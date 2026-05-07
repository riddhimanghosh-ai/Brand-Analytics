import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateBrand, getBrands } from '@/lib/mongodb-store';

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

  // HMAC verified — find the brand with matching store URL and auto-connect
  try {
    const brands = await getBrands();
    const matchingBrand = brands.find(b => b.shopifyStoreUrl === shop);

    if (matchingBrand) {
      // Brand already registered — just mark as connected by updating timestamp
      // (No token to save — we use global app credentials)
      await updateBrand(matchingBrand.slug, {
        shopifyStoreUrl: shop,
        // shopifyAccessToken intentionally not set — uses global SHOPIFY_ACCESS_TOKEN
      });

      // Redirect to dashboard settings with success message
      const encodedShop = encodeURIComponent(shop);
      const slug = encodeURIComponent(matchingBrand.slug);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/${slug}/settings?shopify=connected&shop=${encodedShop}`
      );
    } else {
      // No matching brand — show generic success page
      const encodedShop = encodeURIComponent(shop);
      return NextResponse.redirect(`${APP_URL}/shopify-installed?shop=${encodedShop}`);
    }
  } catch (err) {
    console.error('Error updating brand after install:', err);
    const encodedShop = encodeURIComponent(shop);
    return NextResponse.redirect(`${APP_URL}/shopify-installed?shop=${encodedShop}`);
  }
}
