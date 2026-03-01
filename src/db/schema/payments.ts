import {
  pgTable,
  uuid,
  text,
  bigint,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const paymentMethodEnum = pgEnum('payment_method', ['mock', 'stripe', 'solana']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  audience_id: uuid('audience_id')
    .notNull()
    .references(() => users.id),
  creator_id: uuid('creator_id')
    .notNull()
    .references(() => users.id),

  // Amount in Solana lamports (1 SOL = 1_000_000_000 lamports)
  amount_lamports: bigint('amount_lamports', { mode: 'bigint' }).notNull(),

  currency: text('currency').default('SOL').notNull(),

  // TODO [Solana]: Replace mock payment_method with Solana native variant
  payment_method: paymentMethodEnum('payment_method').default('mock').notNull(),
  payment_status: paymentStatusEnum('payment_status').default('pending').notNull(),

  // TODO [Solana]: Store Solana transaction signature here instead of mock ID
  transaction_id: text('transaction_id'),

  message_unlocked: boolean('message_unlocked').default(false).notNull(),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentMethod = 'mock' | 'stripe' | 'solana';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
