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

  // Always request the full scope set; if `rerequest=1`, force Facebook to
  // re-prompt for any permissions the user previously declined.
  const rerequest = searchParams.get('rerequest') === '1';

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    // ads_read covers ad metrics; page + IG scopes needed for Social Comments feature
    scope: [
      'ads_read',
      'ads_management',
      'business_management',
      'pages_show_list',
      'pages_read_engagement',
      'pages_read_user_content',
      'instagram_basic',
      'instagram_manage_comments',
    ].join(','),
    response_type: 'code',
    state: slug,
    ...(rerequest ? { auth_type: 'rerequest' } : {}),
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
