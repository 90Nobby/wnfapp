import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { availability, users } from '@/db/schema';
import { getUserFromCookie } from '@/lib/auth';
import { eq, and, asc } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// POST - Mark availability for a match
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { matchId, available } = await request.json();

    if (!matchId || available === undefined) {
      return NextResponse.json(
        { error: 'Match ID and availability status are required' },
        { status: 400 }
      );
    }

    // If marking as unavailable, remove from availability
    if (!available) {
      await db
        .delete(availability)
        .where(
          and(
            eq(availability.matchId, matchId),
            eq(availability.userId, user.userId)
          )
        );

      // Recalculate statuses for remaining players
      await recalculateAvailabilityStatuses(matchId);

      return NextResponse.json({
        success: true,
        available: false
      });
    }

    // Check if already marked available
    const existing = await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.matchId, matchId),
          eq(availability.userId, user.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        available: true,
        alreadyMarked: true
      });
    }

    // Add to availability
    const id = generateId();
    await db.insert(availability).values({
      id,
      matchId,
      userId: user.userId,
      status: 'confirmed', // Will be recalculated
    });

    // Recalculate statuses
    await recalculateAvailabilityStatuses(matchId);

    return NextResponse.json({
      success: true,
      available: true
    });
  } catch (error) {
    console.error('Mark availability error:', error);
    return NextResponse.json(
      { error: 'Failed to mark availability' },
      { status: 500 }
    );
  }
}

// Helper function to recalculate confirmed/reserve statuses
async function recalculateAvailabilityStatuses(matchId: string) {
  // Get all availability for this match with priority info
  const allAvailability = await db
    .select({
      id: availability.id,
      userId: availability.userId,
      timestamp: availability.timestamp,
      wasReserveLastMatch: users.wasReserveLastMatch,
    })
    .from(availability)
    .innerJoin(users, eq(availability.userId, users.userId))
    .where(eq(availability.matchId, matchId))
    .orderBy(availability.timestamp);

  // Sort: priority players first, then by timestamp
  const sorted = allAvailability.sort((a, b) => {
    if (a.wasReserveLastMatch && !b.wasReserveLastMatch) return -1;
    if (!a.wasReserveLastMatch && b.wasReserveLastMatch) return 1;
    return a.timestamp.getTime() - b.timestamp.getTime();
  });

  // First 18 are confirmed, rest are reserve
  for (let i = 0; i < sorted.length; i++) {
    const status = i < 18 ? 'confirmed' : 'reserve';
    await db
      .update(availability)
      .set({ status })
      .where(eq(availability.id, sorted[i].id));
  }
}
