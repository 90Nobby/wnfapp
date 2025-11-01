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

    // Snake draft algorithm
    // 1. Separate players by position (D, M, S) and those without position
    const defenders = confirmed.filter(p => p.position === 'D')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const midfielders = confirmed.filter(p => p.position === 'M')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const strikers = confirmed.filter(p => p.position === 'S')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const unassigned = confirmed.filter(p => !p.position)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 2. Snake draft within each position group
    const snakeDraft = (players: typeof confirmed) => {
      const blue: string[] = [];
      const red: string[] = [];
      let toBlue = true;

      for (let i = 0; i < players.length; i++) {
        if (toBlue) {
          blue.push(players[i].userId);
        } else {
          red.push(players[i].userId);
        }

        // Snake: flip direction every 2 players
        if ((i + 1) % 2 === 0) {
          toBlue = !toBlue;
        }
      }

      return { blue, red };
    };

    // 3. Draft each position group
    const draftedDefenders = snakeDraft(defenders);
    const draftedMidfielders = snakeDraft(midfielders);
    const draftedStrikers = snakeDraft(strikers);
    const draftedUnassigned = snakeDraft(unassigned);

    // 4. Combine all positions
    const blueTeam = [
      ...draftedDefenders.blue,
      ...draftedMidfielders.blue,
      ...draftedStrikers.blue,
      ...draftedUnassigned.blue,
    ];

    const redTeam = [
      ...draftedDefenders.red,
      ...draftedMidfielders.red,
      ...draftedStrikers.red,
      ...draftedUnassigned.red,
    ];

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
