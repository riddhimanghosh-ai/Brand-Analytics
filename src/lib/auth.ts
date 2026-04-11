import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

const USER_COOKIE_NAME = 'current_user_id';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch {
    return null;
  }
}

export async function loginUser(username: string) {
  let user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { username },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return user;
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE_NAME);
}

export async function getUserBrands(userId: string) {
  return prisma.brand.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
