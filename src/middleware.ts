import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const HIRA_AUTH_COOKIE = 'hira-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API routes, and static assets through
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
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
