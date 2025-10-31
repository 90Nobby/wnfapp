import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Generate unique 8-character alphanumeric ID
export function generateUserId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const users = sqliteTable('users', {
  userId: text('user_id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  username: text('username').notNull().unique(),
  isManager: integer('is_manager', { mode: 'boolean' }).notNull().default(false),
  balance: real('balance').notNull().default(0.00),
  gamesPlayed: integer('games_played').notNull().default(0),
  wasReserveLastMatch: integer('was_reserve_last_match', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const matches = sqliteTable('matches', {
  matchId: text('match_id').primaryKey(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default('upcoming'), // upcoming, completed
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const availability = sqliteTable('availability', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  status: text('status').notNull().default('confirmed'), // confirmed, reserve
});

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.matchId, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  team: text('team').notNull(), // blue, red
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  type: text('type').notNull(), // match_charge, payment, adjustment
  matchId: text('match_id').references(() => matches.matchId, { onDelete: 'set null' }),
  createdBy: text('created_by').notNull().references(() => users.userId),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const managerLinks = sqliteTable('manager_links', {
  code: text('code').primaryKey(),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Availability = typeof availability.$inferSelect;
export type NewAvailability = typeof availability.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type ManagerLink = typeof managerLinks.$inferSelect;
export type NewManagerLink = typeof managerLinks.$inferInsert;
