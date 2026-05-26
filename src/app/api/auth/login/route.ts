import { NextResponse } from 'next/server';

const HIRA_AUTH_COOKIE = 'hira-auth';
const VALID_USERNAME = 'hira';
const VALID_PASSWORD = 'HIRA@1234';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.set(HIRA_AUTH_COOKIE, '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
