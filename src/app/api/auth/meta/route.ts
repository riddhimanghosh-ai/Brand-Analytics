import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/meta?slug=brand-slug
// Starts the Meta / Facebook OAuth flow.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.trim();

  if (!slug) {
    return new NextResponse('Missing required param: slug', { status: 400 });
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return new NextResponse('META_APP_ID not configured on server', { status: 500 });
  }

  // On AWS Lambda/Amplify, request.url shows internal localhost — use
  // x-forwarded-host + x-forwarded-proto to get the real public URL instead.
  const host  = request.headers.get('x-forwarded-host') || new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0] || new URL(request.url).protocol.replace(':', '');
  const redirectUri = `${proto}://${host}/api/auth/meta/callback`;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    // read_insights was removed by Meta — ads_read covers ad metrics
    scope: 'ads_read,ads_management,business_management',
    response_type: 'code',
    state: slug,
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
