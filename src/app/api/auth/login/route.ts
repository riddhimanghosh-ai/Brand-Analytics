import { NextResponse } from 'next/server';
import { findUser, signSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Case-insensitive username match
    const user = findUser(username?.trim(), password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await signSession(user.username);

    // Redirect scoped users directly to their brand dashboard; admins to the brands list
    let redirectPath = '/';
    if (user.allowedBrands && user.allowedBrands.length > 0) {
      redirectPath = `/dashboard/${user.allowedBrands[0]}`;
    }

    const response = NextResponse.json({
      success: true,
      username: user.username,
      redirectTo: redirectPath,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
