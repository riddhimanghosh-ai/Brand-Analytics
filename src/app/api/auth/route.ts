import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const USERNAME = 'Riddhiman';
const PASSWORD = 'BrandAnalytics1234';
const SESSION_SECRET = 'brand-analytics-session-v1';

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === 'logout') {
    const response = NextResponse.json({ success: true });
    response.cookies.set('ba_session', '', { maxAge: 0, path: '/' });
    return response;
  }

  if (body.username === USERNAME && body.password === PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('ba_session', SESSION_SECRET, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
}
