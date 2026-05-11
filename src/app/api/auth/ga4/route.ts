import { NextRequest, NextResponse } from 'next/server';

const APP_URL = 'https://main.d1rrlzi8cyg90j.amplifyapp.com';

// GET /api/auth/ga4?slug=brand-slug
// Starts the Google Analytics 4 OAuth flow.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.trim();

  if (!slug) {
    return new NextResponse('Missing required param: slug', { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new NextResponse('GOOGLE_CLIENT_ID not configured on server', { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/auth/ga4/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users.readonly',
    ].join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',  // always get refresh_token
    state: slug,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
