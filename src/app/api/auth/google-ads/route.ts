import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/google-ads?slug=brand-slug
// Starts the Google Ads OAuth flow.
export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const APP_URL = `${reqUrl.protocol}//${reqUrl.host}`;
  const { searchParams } = reqUrl;
  const slug = searchParams.get('slug')?.trim();

  if (!slug) {
    return new NextResponse('Missing required param: slug', { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new NextResponse('GOOGLE_CLIENT_ID not configured on server', { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/auth/google-ads/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'https://www.googleapis.com/auth/adwords',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',   // force refresh_token to be issued even if previously authorized
    state: slug,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
