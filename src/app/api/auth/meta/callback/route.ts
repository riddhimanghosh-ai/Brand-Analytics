import { NextRequest, NextResponse } from 'next/server';
import { updateBrand } from '@/lib/mongodb-store';

interface AdAccount {
  id: string;        // e.g. "act_123456789"
  name: string;
  account_status: number; // 1 = ACTIVE
}

// GET /api/auth/meta/callback
// Meta redirects here after the user approves the connection.
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
    const reason = searchParams.get('error_reason') || error;
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug ?? ''}/settings?meta_error=${encodeURIComponent(reason)}`
    );
  }

  if (!code || !slug) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_params`);
  }

  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return new NextResponse('Meta credentials not configured on server', { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/auth/meta/callback`;

  // ── Step 1: Exchange code for short-lived token ──────────────────────────
  let shortToken: string;
  try {
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`
    );
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Meta token exchange failed:', text);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/${slug}/settings?meta_error=token_exchange_failed`
      );
    }
    const tokenData = await tokenRes.json() as { access_token: string };
    shortToken = tokenData.access_token;
  } catch (err) {
    console.error('Meta callback step 1 error:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?meta_error=server_error`
    );
  }

  // ── Step 2: Extend to long-lived token (60 days) ─────────────────────────
  let longToken: string;
  try {
    const extendParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    });
    const extendRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${extendParams.toString()}`
    );
    if (!extendRes.ok) {
      // Non-fatal — fall back to short-lived token
      console.warn('Meta token extension failed, using short-lived token');
      longToken = shortToken;
    } else {
      const extendData = await extendRes.json() as { access_token: string };
      longToken = extendData.access_token;
    }
  } catch {
    longToken = shortToken;
  }

  // ── Step 3: Fetch ad accounts ─────────────────────────────────────────────
  let adAccounts: AdAccount[] = [];
  try {
    const adRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${longToken}`
    );
    if (adRes.ok) {
      const adData = await adRes.json() as { data: AdAccount[] };
      adAccounts = (adData.data ?? []).filter(a => a.account_status === 1);
    }
  } catch (err) {
    console.warn('Could not fetch Meta ad accounts:', err);
  }

  // ── Step 4: Save to brand ─────────────────────────────────────────────────
  try {
    // Always save the access token (and clear app ID/secret — no longer needed via OAuth)
    const updates: Record<string, string | null> = {
      metaAccessToken: longToken,
      // If exactly one active ad account, auto-select it
      ...(adAccounts.length === 1 ? { metaAdAccountId: adAccounts[0].id } : {}),
    };
    await updateBrand(slug, updates);
  } catch (err) {
    console.error('Failed to save Meta credentials:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?meta_error=save_failed`
    );
  }

  // ── Step 5: Redirect back ─────────────────────────────────────────────────
  // If multiple ad accounts, send the list so settings page can show a picker
  if (adAccounts.length > 1) {
    const accountsParam = adAccounts
      .map(a => `${a.id}|${encodeURIComponent(a.name)}`)
      .join(',');
    return NextResponse.redirect(
      `${APP_URL}/dashboard/${slug}/settings?meta=connected&meta_accounts=${encodeURIComponent(accountsParam)}`
    );
  }

  return NextResponse.redirect(
    `${APP_URL}/dashboard/${slug}/settings?meta=connected`
  );
}
