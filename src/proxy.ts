import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, canAccessBrand, COOKIE_NAME } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Resolve user from signed session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = await verifySession(token);
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce per-user brand scope on dashboard pages
  const dashMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  if (dashMatch) {
    const slug = decodeURIComponent(dashMatch[1]);
    if (!canAccessBrand(user, slug)) {
      // Redirect non-admins back to home (their brand list page)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
