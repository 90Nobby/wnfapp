import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { generateUserId } from '@/lib/utils';
import { setUserCookie, getUserByUsername } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, username } = await request.json();

    // Validate input
    if (!firstName || !lastName || !username) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Generate unique userId
    let userId = generateUserId();
    let attempts = 0;

    // Ensure userId is unique
    while (attempts < 10) {
      const existing = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
      if (existing.length === 0) break;
      userId = generateUserId();
      attempts++;
    }

    // Create new user
    await db.insert(users).values({
      userId,
      firstName,
      lastName,
      username,
      isManager: false,
      balance: 0,
      gamesPlayed: 0,
      wasReserveLastMatch: false,
    });

    // Set cookie
    await setUserCookie(userId);

    return NextResponse.json({
      success: true,
      userId,
      username
    });
  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
