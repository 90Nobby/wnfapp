import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, availability, users } from '@/db/schema';
import { getUserFromCookie } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// POST - Create or update teams for a match
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user || !user.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { matchId, blueTeam, redTeam } = await request.json();

    if (!matchId || !blueTeam || !redTeam) {
      return NextResponse.json(
        { error: 'Match ID and teams are required' },
        { status: 400 }
      );
    }

    // Delete existing teams for this match
    await db.delete(teams).where(eq(teams.matchId, matchId));

    // Insert blue team
    for (const userId of blueTeam) {
      await db.insert(teams).values({
        id: generateId(),
        matchId,
        userId,
        team: 'blue',
      });
    }

    // Insert red team
    for (const userId of redTeam) {
      await db.insert(teams).values({
        id: generateId(),
        matchId,
        userId,
        team: 'red',
      });
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Create teams error:', error);
    return NextResponse.json(
      { error: 'Failed to create teams' },
      { status: 500 }
    );
  }
}

// PUT - Auto-generate teams from confirmed players
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user || !user.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { matchId } = await request.json();

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Get confirmed players with their ratings and positions
    const confirmed = await db
      .select({
        userId: availability.userId,
        rating: users.rating,
        position: users.position,
      })
      .from(availability)
      .innerJoin(users, eq(availability.userId, users.userId))
      .where(
        and(
          eq(availability.matchId, matchId),
          eq(availability.status, 'confirmed')
        )
      )
      .limit(18);

    if (confirmed.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 confirmed players to create teams' },
        { status: 400 }
      );
    }

    // Balanced team generation algorithm
    // Primary: Balance total team ratings
    // Secondary: Distribute positions evenly across teams

    // 1. Group players by position and sort each group by rating
    const defenders = confirmed.filter(p => p.position === 'D')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const midfielders = confirmed.filter(p => p.position === 'M')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const strikers = confirmed.filter(p => p.position === 'S')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const unassigned = confirmed.filter(p => !p.position)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 2. Interleave positions in round-robin fashion to distribute them evenly
    // This creates a draft order that naturally spreads positions across teams
    const positionGroups = [defenders, midfielders, strikers, unassigned].filter(g => g.length > 0);
    const sortedPlayers: typeof confirmed = [];

    let allEmpty = false;
    while (!allEmpty) {
      allEmpty = true;
      for (const group of positionGroups) {
        if (group.length > 0) {
          sortedPlayers.push(group.shift()!);
          allEmpty = false;
        }
      }
    }

    // 3. Snake draft: alternating picks with direction reversal
    // Pattern: Blue, Red, Red, Blue, Blue, Red, Red, Blue...
    const blueTeam: string[] = [];
    const redTeam: string[] = [];

    for (let i = 0; i < sortedPlayers.length; i++) {
      // Determine which "round" we're in (each round = 2 picks)
      const round = Math.floor(i / 2);

      // In even rounds (0, 2, 4...), blue picks first
      // In odd rounds (1, 3, 5...), red picks first (snake reversal)
      const bluePicksFirst = round % 2 === 0;

      // Is this the first or second pick in the current round?
      const isFirstPickInRound = i % 2 === 0;

      // Assign player to team based on snake draft logic
      if ((bluePicksFirst && isFirstPickInRound) || (!bluePicksFirst && !isFirstPickInRound)) {
        blueTeam.push(sortedPlayers[i].userId);
      } else {
        redTeam.push(sortedPlayers[i].userId);
      }
    }

    // Delete existing teams
    await db.delete(teams).where(eq(teams.matchId, matchId));

    // Insert blue team
    for (const userId of blueTeam) {
      await db.insert(teams).values({
        id: generateId(),
        matchId,
        userId,
        team: 'blue',
      });
    }

    // Insert red team
    for (const userId of redTeam) {
      await db.insert(teams).values({
        id: generateId(),
        matchId,
        userId,
        team: 'red',
      });
    }

    return NextResponse.json({
      success: true,
      blueTeam,
      redTeam
    });
  } catch (error) {
    console.error('Auto-generate teams error:', error);
    return NextResponse.json(
      { error: 'Failed to generate teams' },
      { status: 500 }
    );
  }
}
