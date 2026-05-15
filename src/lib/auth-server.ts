/**
 * Server-only auth helpers — do NOT import from middleware (Edge runtime).
 * Import auth.ts for shared logic (verifySession, canAccessBrand, etc.).
 */
import { NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { verifySession, canAccessBrand, COOKIE_NAME } from '@/lib/auth';
import type { User } from '@/lib/auth';

export async function requireBrandAccess(slug: string | null): Promise<
  | { user: User; denied: null }
  | { user: null; denied: NextResponse }
> {
  if (!slug) {
    return { user: null, denied: NextResponse.json({ error: 'Brand slug required' }, { status: 400 }) };
  }
  const cookieStore = await nextCookies();
  const user = await verifySession(cookieStore.get(COOKIE_NAME)?.value);
  if (!user) {
    return { user: null, denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!canAccessBrand(user, slug)) {
    return { user: null, denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, denied: null };
}

export async function requireUser(): Promise<
  | { user: User; denied: null }
  | { user: null; denied: NextResponse }
> {
  const cookieStore = await nextCookies();
  const user = await verifySession(cookieStore.get(COOKIE_NAME)?.value);
  if (!user) {
    return { user: null, denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, denied: null };
}
