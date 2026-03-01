import {
  pgTable,
  uuid,
  text,
  bigint,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['creator', 'audience']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  username: text('username').notNull().unique(),
  display_name: text('display_name'),
  bio: text('bio'),
  profile_image_url: text('profile_image_url'),

  // TODO [Solana]: Accept wallet_address during registration for Solana Pay
  wallet_address: text('wallet_address'),

  // DM price in Solana lamports (1 SOL = 1_000_000_000 lamports)
  dm_price_lamports: bigint('dm_price_lamports', { mode: 'bigint' }).default(sql`5000000000`).notNull(),

  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = 'creator' | 'audience';
