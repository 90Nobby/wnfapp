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

    // Get confirmed players
    const confirmed = await db
      .select({
        userId: availability.userId,
      })
      .from(availability)
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

    // Shuffle players
    const shuffled = [...confirmed].sort(() => Math.random() - 0.5);

    // Split into two teams
    const half = Math.ceil(shuffled.length / 2);
    const blueTeam = shuffled.slice(0, half).map(p => p.userId);
    const redTeam = shuffled.slice(half).map(p => p.userId);

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
