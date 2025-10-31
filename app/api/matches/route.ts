import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, availability, teams, users } from '@/db/schema';
import { generateId } from '@/lib/utils';
import { getUserFromCookie } from '@/lib/auth';
import { eq, desc, asc } from 'drizzle-orm';

// GET - List all matches
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = db.select().from(matches);

    if (status) {
      query = query.where(eq(matches.status, status)) as any;
    }

    const allMatches = await query.orderBy(desc(matches.date), desc(matches.time));

    return NextResponse.json(allMatches);
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      { error: 'Failed to get matches' },
      { status: 500 }
    );
  }
}

// POST - Create new match
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user || !user.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { date, time, location } = await request.json();

    if (!date || !time || !location) {
      return NextResponse.json(
        { error: 'Date, time, and location are required' },
        { status: 400 }
      );
    }

    const matchId = generateId();

    await db.insert(matches).values({
      matchId,
      date,
      time,
      location,
      status: 'upcoming',
    });

    return NextResponse.json({
      success: true,
      matchId,
      shareText: `New match ${new Date(date).toLocaleDateString('en-GB', { weekday: 'long' })} ${time} at ${location} - mark your availability: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`
    });
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  }
}
