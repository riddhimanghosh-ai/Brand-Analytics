import { NextRequest, NextResponse } from 'next/server';

const APP_URL = 'https://main.d1rrlzi8cyg90j.amplifyapp.com';

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

  const redirectUri = `${APP_URL}/api/auth/meta/callback`;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'ads_read,ads_management,business_management,read_insights',
    response_type: 'code',
    state: slug,
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
