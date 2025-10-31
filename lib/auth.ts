import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const USER_COOKIE_NAME = 'football_user_id';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

export async function setUserCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE_NAME, userId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

  if (!userId) return null;

  const user = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
  return user[0] || null;
}

export async function clearUserCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE_NAME);
}

export async function getUserByUsername(username: string) {
  const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return user[0] || null;
}
