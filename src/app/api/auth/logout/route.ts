import { NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await logoutUser();
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
