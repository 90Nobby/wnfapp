import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, setUserCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: 'Username not found' },
        { status: 404 }
      );
    }

    // Set cookie
    await setUserCookie(user.userId);

    return NextResponse.json({
      success: true,
      userId: user.userId,
      username: user.username
    });
  } catch (error) {
    console.error('Recovery error:', error);
    return NextResponse.json(
      { error: 'Failed to recover account' },
      { status: 500 }
    );
  }
}
