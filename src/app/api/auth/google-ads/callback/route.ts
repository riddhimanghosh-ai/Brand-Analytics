import { NextRequest, NextResponse } from 'next/server';
import { updateBrand } from '@/lib/mongodb-store';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleAdsAccount {
  resourceName: string;       // "customers/1234567890"
  id: string;
  descriptiveName: string;
  currencyCode: string;
  testAccount: boolean;
}

// GET /api/auth/google-ads/callback
// Google redirects here after the user approves the connection.
export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const APP_URL = `${reqUrl.protocol}//${reqUrl.host}`;
  const { searchParams } = reqUrl;
  const code  = searchParams.get('code');
  const slug  = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug ?? ''}/settings?google_ads_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !slug) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_params`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const devToken     = process.env.GOOGLE_ADS_DEV_TOKEN;

  if (!clientId || !clientSecret) {
    return new NextResponse('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured on server', { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/auth/google-ads/callback`;

  // ── Step 1: Exchange code for tokens ──────────────────────────────────────
  let accessToken: string;
  let refreshToken: string;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json() as TokenResponse;

    if (!tokenRes.ok || tokenData.error) {
      console.error('Google Ads token exchange failed:', tokenData);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/${slug}/settings?google_ads_error=token_exchange_failed`
      );
    }

    if (!tokenData.refresh_token) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/${slug}/settings?google_ads_error=no_refresh_token`
      );
    }

    accessToken  = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
  } catch (err) {
    console.error('Google Ads callback step 1 error:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?google_ads_error=server_error`
    );
  }

  // ── Step 2: List accessible customer accounts ─────────────────────────────
  let accounts: GoogleAdsAccount[] = [];
  if (devToken) {
    try {
      // Use the Google Ads API to list accessible customers
      const listRes = await fetch(
        'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': devToken,
          },
        }
      );

      if (listRes.ok) {
        const listData = await listRes.json() as { resourceNames?: string[] };
        const resourceNames = listData.resourceNames ?? [];

        // Fetch details for up to 20 customers
        const customerDetails = await Promise.allSettled(
          resourceNames.slice(0, 20).map(async (resourceName) => {
            const customerId = resourceName.replace('customers/', '');
            const detailRes = await fetch(
              `https://googleads.googleapis.com/v17/customers/${customerId}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'developer-token': devToken,
                  'login-customer-id': customerId,
                },
              }
            );
            if (!detailRes.ok) return null;
            const detail = await detailRes.json() as {
              resourceName: string;
              id: string;
              descriptiveName?: string;
              currencyCode?: string;
              testAccount?: boolean;
            };
            return {
              resourceName: detail.resourceName,
              id: detail.id,
              descriptiveName: detail.descriptiveName ?? `Account ${detail.id}`,
              currencyCode: detail.currencyCode ?? 'USD',
              testAccount: detail.testAccount ?? false,
            } as GoogleAdsAccount;
          })
        );

        accounts = customerDetails
          .filter((r): r is PromiseFulfilledResult<GoogleAdsAccount | null> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value as GoogleAdsAccount)
          .filter(a => !a.testAccount);
      }
    } catch (err) {
      console.warn('Could not list Google Ads accounts:', err);
    }
  }

  // ── Step 3: Save refresh token (+ dev token from env) ────────────────────
  try {
    const updates: Record<string, string | null> = {
      googleAdsRefreshToken: refreshToken,
      // Note: don't save clientId/Secret to DB — they live in env vars
      // googleAdsClientId and googleAdsClientSecret are no longer stored per-brand
      ...(devToken ? { googleAdsDevToken: devToken } : {}),
      // If exactly one account, auto-select it
      ...(accounts.length === 1
        ? { googleAdsCustomerId: accounts[0].id }
        : {}),
    };
    await updateBrand(slug, updates);
  } catch (err) {
    console.error('Failed to save Google Ads credentials:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?google_ads_error=save_failed`
    );
  }

  // ── Step 4: Redirect back ─────────────────────────────────────────────────
  if (accounts.length > 1) {
    const accountsParam = accounts
      .map(a => `${a.id}|${encodeURIComponent(a.descriptiveName)}`)
      .join(',');
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?google_ads=connected&google_ads_accounts=${encodeURIComponent(accountsParam)}`
    );
  }

  return NextResponse.redirect(
    `${APP_URL}/dashboard/${slug}/settings?google_ads=connected`
  );
}
