import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, transactions } from '@/db/schema';
import { getUserFromCookie } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// PATCH - Update player (balance, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getUserFromCookie();

    if (!currentUser || !currentUser.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { action, amount } = await request.json();

    // Get player
    const player = await db.select().from(users).where(eq(users.userId, userId)).limit(1);

    if (!player[0]) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    if (action === 'payment') {
      // Record payment (subtract from balance)
      const newBalance = player[0].balance - amount;

      await db
        .update(users)
        .set({ balance: newBalance })
        .where(eq(users.userId, userId));

      // Create transaction record
      await db.insert(transactions).values({
        id: generateId(),
        userId,
        amount: -amount, // Negative because it's a payment
        type: 'payment',
        matchId: null,
        createdBy: currentUser.userId,
      });

      return NextResponse.json({
        success: true,
        newBalance
      });
    }

    if (action === 'adjustment') {
      // Manual balance adjustment
      const newBalance = player[0].balance + amount;

      await db
        .update(users)
        .set({ balance: newBalance })
        .where(eq(users.userId, userId));

      // Create transaction record
      await db.insert(transactions).values({
        id: generateId(),
        userId,
        amount,
        type: 'adjustment',
        matchId: null,
        createdBy: currentUser.userId,
      });

      return NextResponse.json({
        success: true,
        newBalance
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update player error:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

// DELETE - Remove player
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getUserFromCookie();

    if (!currentUser || !currentUser.isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Manager access required' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    await db.delete(users).where(eq(users.userId, userId));

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Delete player error:', error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}
