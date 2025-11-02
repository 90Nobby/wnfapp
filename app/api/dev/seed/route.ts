import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, availability } from '@/db/schema';
import { getUserFromCookie } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';

// First names pool
const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven',
  'Andrew', 'Paul', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy',
  'Ryan', 'Jason', 'Jeffrey', 'Gary', 'Eric', 'Stephen', 'Jacob', 'Nicholas',
];

// Last names pool
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
];

const positions = ['D', 'M', 'S'];
const ratings = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

// POST - Seed test players
export async function POST(request: NextRequest) {
  try {
    // Check if user is manager
    const currentUser = await getUserFromCookie();
    if (!currentUser || !currentUser.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { numberOfPlayers = 20, matchId } = await request.json();

    const createdPlayers = [];

    for (let i = 0; i < numberOfPlayers; i++) {
      // Generate random name
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const randomNum = Math.floor(Math.random() * 1000);
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}`;

      // Random rating and position
      const rating = ratings[Math.floor(Math.random() * ratings.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];

      // Check if username already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existing.length > 0) {
        continue; // Skip if username exists
      }

      // Create player
      const userId = generateId();
      await db.insert(users).values({
        userId,
        firstName,
        lastName,
        username,
        isManager: false,
        balance: 0,
        gamesPlayed: 0,
        wasReserveLastMatch: false,
        rating,
        position,
      });

      createdPlayers.push({
        userId,
        firstName,
        lastName,
        username,
        rating,
        position,
      });

      // If matchId provided, mark as available
      if (matchId) {
        // Randomly decide if confirmed or reserve (80% confirmed, 20% reserve)
        const status = Math.random() < 0.8 ? 'confirmed' : 'reserve';

        await db.insert(availability).values({
          id: generateId(),
          matchId,
          userId,
          status,
          timestamp: new Date(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      playersCreated: createdPlayers.length,
      players: createdPlayers,
      markedAvailable: !!matchId,
    });
  } catch (error) {
    console.error('Seed players error:', error);
    return NextResponse.json(
      { error: 'Failed to seed players' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all non-manager test players
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is manager
    const currentUser = await getUserFromCookie();
    if (!currentUser || !currentUser.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    // Delete all non-manager players
    await db.delete(users).where(eq(users.isManager, false));

    return NextResponse.json({
      success: true,
      message: 'All test players deleted',
    });
  } catch (error) {
    console.error('Delete test players error:', error);
    return NextResponse.json(
      { error: 'Failed to delete test players' },
      { status: 500 }
    );
  }
}
