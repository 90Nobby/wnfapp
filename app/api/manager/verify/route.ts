import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { managerLinks, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST - Verify manager link code
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    const link = await db
      .select()
      .from(managerLinks)
      .where(eq(managerLinks.code, code))
      .limit(1);

    if (!link[0]) {
      return NextResponse.json(
        { error: 'Invalid manager code' },
        { status: 404 }
      );
    }

    // Get manager user
    const manager = await db
      .select()
      .from(users)
      .where(eq(users.userId, link[0].userId))
      .limit(1);

    return NextResponse.json({
      valid: true,
      hasManager: manager.length > 0,
      managerId: link[0].userId,
    });
  } catch (error) {
    console.error('Verify manager code error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
