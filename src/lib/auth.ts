import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth_user_id')?.value;

  if (!userId) {
    return null;
  }

  return await prisma.user.findUnique({ where: { id: userId } });
}

export async function loginUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // No maxAge = session cookie (clears when browser closes)
  });
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_user_id');
}
