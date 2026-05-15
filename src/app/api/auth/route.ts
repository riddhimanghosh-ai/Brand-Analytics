import { NextResponse } from 'next/server';
import { findUser, signSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }

    const user = findUser(body.username, body.password);
    if (user) {
      const response = NextResponse.json({ success: true, username: user.username });
      response.cookies.set(COOKIE_NAME, await signSession(user.username), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
