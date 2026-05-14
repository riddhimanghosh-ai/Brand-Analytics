/**
 * auth.ts — multi-user auth with per-user brand access scoping.
 *
 * Session cookie format: `${username}.${hmac(username)}`
 * Anyone who tampers with the cookie can't generate a valid hmac without the SECRET.
 */

import crypto from 'crypto';

// IMPORTANT: keep the SECRET stable — changing it logs out all users.
// Old shared session secret was 'brand-analytics-session-v1'. Reusing it
// as the HMAC key keeps existing sessions readable in their old form too.
const SECRET = process.env.SESSION_SECRET || 'brand-analytics-session-v1';
const COOKIE_NAME = 'ba_session';

export interface User {
  username: string;
  password: string;
  /** null = admin (sees all brands), array = scoped to these slugs only */
  allowedBrands: string[] | null;
}

export const USERS: User[] = [
  // Admin — sees everything
  { username: 'Riddhiman', password: 'BrandAnalytics1234', allowedBrands: null },
  // Hira-only user
  { username: 'HIRAX', password: 'HIRA@1234', allowedBrands: ['hira'] },
];

export function findUser(username: string, password: string): User | null {
  return USERS.find((u) => u.username === username && u.password === password) ?? null;
}

export function getUserByName(username: string): User | null {
  return USERS.find((u) => u.username === username) ?? null;
}

/** Returns the cookie value to set after a successful login */
export function signSession(username: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(username).digest('hex').slice(0, 24);
  return `${username}.${sig}`;
}

/** Verifies the cookie and returns the resolved user, or null. */
export function verifySession(token: string | undefined | null): User | null {
  if (!token) return null;

  // ── Legacy session support (cookie = 'brand-analytics-session-v1') ─────────
  // Pre-multi-user cookies were a shared static string. Treat them as admin.
  if (token === 'brand-analytics-session-v1') {
    return getUserByName('Riddhiman');
  }

  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const username = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(username).digest('hex').slice(0, 24);
  // Constant-time comparison
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return getUserByName(username);
}

export function canAccessBrand(user: User | null, slug: string): boolean {
  if (!user) return false;
  if (user.allowedBrands === null) return true; // admin
  return user.allowedBrands.includes(slug);
}

export function filterBrandsForUser<T extends { slug: string }>(brands: T[], user: User | null): T[] {
  if (!user) return [];
  if (user.allowedBrands === null) return brands;
  const set = new Set(user.allowedBrands);
  return brands.filter((b) => set.has(b.slug));
}

export { COOKIE_NAME };
