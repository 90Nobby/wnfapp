import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      isManager: user.isManager,
      balance: user.balance,
      gamesPlayed: user.gamesPlayed,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
