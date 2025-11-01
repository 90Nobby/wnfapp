import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, availability, teams, users, transactions } from '@/db/schema';
import { getUserFromCookie } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// GET - Get match details with availability and teams
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;

    const match = await db.select().from(matches).where(eq(matches.matchId, matchId)).limit(1);

    if (!match[0]) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Get availability with user details
    const availabilityList = await db
      .select({
        id: availability.id,
        userId: availability.userId,
        timestamp: availability.timestamp,
        status: availability.status,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        wasReserveLastMatch: users.wasReserveLastMatch,
      })
      .from(availability)
      .innerJoin(users, eq(availability.userId, users.userId))
      .where(eq(availability.matchId, matchId))
      .orderBy(availability.timestamp);

    // Get teams with user details
    const teamsList = await db
      .select({
        id: teams.id,
        userId: teams.userId,
        team: teams.team,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        rating: users.rating,
        position: users.position,
      })
      .from(teams)
      .innerJoin(users, eq(teams.userId, users.userId))
      .where(eq(teams.matchId, matchId));

    return NextResponse.json({
      match: match[0],
      availability: availabilityList,
      teams: teamsList,
    });
  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json(
      { error: 'Failed to get match' },
      { status: 500 }
    );
  }
}

// PATCH - Update match (e.g., mark as completed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const user = await getUserFromCookie();

    if (!user || !user.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { matchId } = await params;
    const { status } = await request.json();

    // Get match
    const match = await db.select().from(matches).where(eq(matches.matchId, matchId)).limit(1);

    if (!match[0]) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // If completing match, charge players
    if (status === 'completed' && match[0].status === 'upcoming') {
      // Get all players in teams
      const playersInTeams = await db
        .select({
          userId: teams.userId,
          isManager: users.isManager,
        })
        .from(teams)
        .innerJoin(users, eq(teams.userId, users.userId))
        .where(eq(teams.matchId, matchId));

      // Charge each non-manager player £4 and increment games played
      for (const player of playersInTeams) {
        if (!player.isManager) {
          // Add £4 to balance (positive = owes money)
          await db
            .update(users)
            .set({
              balance: db.$with('current').as(
                db.select({ balance: users.balance }).from(users).where(eq(users.userId, player.userId))
              ) as any,
              gamesPlayed: db.$with('current').as(
                db.select({ gamesPlayed: users.gamesPlayed }).from(users).where(eq(users.userId, player.userId))
              ) as any,
            })
            .where(eq(users.userId, player.userId));

          // Simpler update
          const currentUser = await db.select().from(users).where(eq(users.userId, player.userId)).limit(1);
          if (currentUser[0]) {
            await db
              .update(users)
              .set({
                balance: currentUser[0].balance + 4,
                gamesPlayed: currentUser[0].gamesPlayed + 1,
              })
              .where(eq(users.userId, player.userId));
          }

          // Create transaction record
          await db.insert(transactions).values({
            id: generateId(),
            userId: player.userId,
            amount: 4,
            type: 'match_charge',
            matchId,
            createdBy: user.userId,
          });
        } else {
          // Just increment games played for managers
          const currentUser = await db.select().from(users).where(eq(users.userId, player.userId)).limit(1);
          if (currentUser[0]) {
            await db
              .update(users)
              .set({
                gamesPlayed: currentUser[0].gamesPlayed + 1,
              })
              .where(eq(users.userId, player.userId));
          }
        }
      }

      // Reset wasReserveLastMatch for all players who were on a team
      const playerIds = playersInTeams.map(p => p.userId);
      for (const playerId of playerIds) {
        await db
          .update(users)
          .set({ wasReserveLastMatch: false })
          .where(eq(users.userId, playerId));
      }

      // Set wasReserveLastMatch for players who were on reserve but didn't make a team
      const reserves = await db
        .select({ userId: availability.userId })
        .from(availability)
        .where(and(
          eq(availability.matchId, matchId),
          eq(availability.status, 'reserve')
        ));

      for (const reserve of reserves) {
        // Check if they didn't make it to a team
        const inTeam = playerIds.includes(reserve.userId);
        if (!inTeam) {
          await db
            .update(users)
            .set({ wasReserveLastMatch: true })
            .where(eq(users.userId, reserve.userId));
        }
      }
    }

    // Update match status
    await db.update(matches).set({ status }).where(eq(matches.matchId, matchId));

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    );
  }
}
