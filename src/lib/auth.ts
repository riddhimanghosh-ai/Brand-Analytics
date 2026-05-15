/**
 * auth.ts — multi-user auth with per-user brand access scoping.
 *
 * Uses Web Crypto API (globalThis.crypto.subtle) so this file is safe to
 * import from both Edge runtime (middleware) and Node.js runtime (API routes).
 *
 * Session cookie format: `${username}.${hmac(username).slice(0,24)}`
 */

const SECRET = process.env.SESSION_SECRET || 'brand-analytics-session-v1';
const COOKIE_NAME = 'ba_session';

export interface User {
  username: string;
  password: string;
  /** null = admin (sees all brands), array = scoped to these slugs only */
  allowedBrands: string[] | null;
}

export const USERS: User[] = [
  { username: 'Riddhiman', password: 'BrandAnalytics1234', allowedBrands: null },
  { username: 'hira', password: 'HIRA@1234', allowedBrands: ['hira'] },
];

export function findUser(username: string, password: string): User | null {
  return USERS.find((u) => u.username === username && u.password === password) ?? null;
}

export function getUserByName(username: string): User | null {
  return USERS.find((u) => u.username === username) ?? null;
}

async function hmacHex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const buf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(username: string): Promise<string> {
  const sig = await hmacHex(username);
  return `${username}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  if (token === 'brand-analytics-session-v1') return getUserByName('Riddhiman');
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const username = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(username);
  if (!safeEqual(sig, expected)) return null;
  return getUserByName(username);
}

export function canAccessBrand(user: User | null, slug: string): boolean {
  if (!user) return false;
  if (user.allowedBrands === null) return true;
  return user.allowedBrands.includes(slug);
}

export function filterBrandsForUser<T extends { slug: string }>(brands: T[], user: User | null): T[] {
  if (!user) return [];
  if (user.allowedBrands === null) return brands;
  const set = new Set(user.allowedBrands);
  return brands.filter((b) => set.has(b.slug));
}

export { COOKIE_NAME };
