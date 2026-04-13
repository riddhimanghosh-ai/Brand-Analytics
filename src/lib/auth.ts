import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const CREDENTIALS_FILE = path.join(process.cwd(), 'data/credentials.json');

interface Credentials {
  teamMembers: Array<{ username: string; password: string }>;
  brands: any[];
}

let cachedCredentials: Credentials | null = null;

function loadCredentials(): Credentials {
  if (cachedCredentials) return cachedCredentials;

  try {
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    cachedCredentials = parsed;
    return parsed;
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return { teamMembers: [], brands: [] };
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const username = cookieStore.get('auth_user')?.value;

  if (!username) {
    return null;
  }

  return { username };
}

export async function validateCredentials(username: string, password: string) {
  const creds = loadCredentials();
  const member = creds.teamMembers.find(
    (m) => m.username === username && m.password === password
  );
  return !!member;
}

export async function loginUser(username: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_user', username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_user');
}
