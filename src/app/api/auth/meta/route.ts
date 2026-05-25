import { NextRequest, NextResponse } from 'next/server';

function getAppUrl(request: NextRequest): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  // On AWS Lambda/Amplify, request.url can show an internal host.
  const reqUrl = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || reqUrl.host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0] || reqUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

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

  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  // Always request the full scope set; if `rerequest=1`, force Facebook to
  // re-prompt for any permissions the user previously declined.
  const rerequest = searchParams.get('rerequest') === '1';

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    // Keep this read-oriented scope set aligned with the social inbox feature.
    scope: [
      'ads_read',
      'ads_management',
      'business_management',
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_comments',
      'instagram_branded_content_ads_brand',
    ].join(','),
    response_type: 'code',
    state: slug,
    ...(rerequest ? { auth_type: 'rerequest' } : {}),
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
