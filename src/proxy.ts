import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const HIRA_AUTH_COOKIE = 'hira-auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API routes, and static assets
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Check for hira-auth session cookie
  const authCookie = request.cookies.get(HIRA_AUTH_COOKIE)?.value;
  if (authCookie !== '1') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
