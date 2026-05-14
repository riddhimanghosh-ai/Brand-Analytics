import { NextRequest, NextResponse } from 'next/server';
import { updateBrand } from '@/lib/mongodb-store';

// Resolved dynamically from request origin — see GET handler below

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface GA4Property {
  name: string;           // "properties/123456789"
  displayName: string;
  propertyType: string;   // "PROPERTY_TYPE_ORDINARY" = standard GA4
  parent: string;         // "accounts/987654321"
}

interface AccountSummary {
  name: string;           // "accountSummaries/987654321"
  displayName: string;
  account: string;        // "accounts/987654321"
  propertySummaries?: Array<{
    property: string;     // "properties/123456789"
    displayName: string;
    propertyType: string;
  }>;
}

// GET /api/auth/ga4/callback
// Google redirects here after the user approves GA4 access.
export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const host  = request.headers.get('x-forwarded-host') || reqUrl.host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0] || reqUrl.protocol.replace(':', '');
  const APP_URL = `${proto}://${host}`;
  const { searchParams } = reqUrl;
  const code  = searchParams.get('code');
  const slug  = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug ?? ''}/settings?ga4_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !slug) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_params`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured', { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/auth/ga4/callback`;

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
      console.error('GA4 token exchange failed:', tokenData);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/${slug}/settings?ga4_error=token_exchange_failed`
      );
    }

    if (!tokenData.refresh_token) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/${slug}/settings?ga4_error=no_refresh_token`
      );
    }

    accessToken  = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
  } catch (err) {
    console.error('GA4 callback step 1 error:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?ga4_error=server_error`
    );
  }

  // ── Step 2: List GA4 properties the user has access to ───────────────────
  let properties: { id: string; name: string; accountName: string }[] = [];
  try {
    const summariesRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (summariesRes.ok) {
      const summariesData = await summariesRes.json() as { accountSummaries?: AccountSummary[] };
      for (const account of summariesData.accountSummaries ?? []) {
        for (const prop of account.propertySummaries ?? []) {
          // Only standard GA4 properties (not rollups / subproperties)
          if (prop.propertyType === 'PROPERTY_TYPE_ORDINARY' || !prop.propertyType) {
            properties.push({
              id: prop.property.replace('properties/', ''),
              name: prop.displayName,
              accountName: account.displayName,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not list GA4 properties:', err);
  }

  // ── Step 3: Save refresh token to brand ──────────────────────────────────
  try {
    await updateBrand(slug, {
      ga4RefreshToken: refreshToken,
      // Auto-select if only one property found
      ...(properties.length === 1 ? { ga4PropertyId: properties[0].id } : {}),
    });
  } catch (err) {
    console.error('Failed to save GA4 credentials:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?ga4_error=save_failed`
    );
  }

  // ── Step 4: Redirect back ─────────────────────────────────────────────────
  if (properties.length > 1) {
    const propsParam = properties
      .map(p => `${p.id}|${encodeURIComponent(`${p.name} (${p.accountName})`)}`)
      .join(',');
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?ga4=connected&ga4_properties=${encodeURIComponent(propsParam)}`
    );
  }

  // No properties found — token saved but user must enter Property ID manually
  if (properties.length === 0) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?ga4=connected&ga4_properties=none`
    );
  }

  return NextResponse.redirect(
    `${APP_URL}/dashboard/${slug}/settings?ga4=connected`
  );
}
