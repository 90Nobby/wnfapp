import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, transactions } from '@/db/schema';
import { getUserFromCookie } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// GET - List all players
export async function GET() {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const allPlayers = await db
      .select()
      .from(users)
      .orderBy(users.username);

    return NextResponse.json(allPlayers);
  } catch (error) {
    console.error('Get players error:', error);
    return NextResponse.json(
      { error: 'Failed to get players' },
      { status: 500 }
    );
  }
}
