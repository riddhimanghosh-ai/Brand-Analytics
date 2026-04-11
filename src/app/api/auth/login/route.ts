import { loginUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const user = await loginUser(username.trim());

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
