import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { payments } from './payments';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Message only exists if there is a completed payment
  payment_id: uuid('payment_id')
    .notNull()
    .references(() => payments.id),

  sender_id: uuid('sender_id')
    .notNull()
    .references(() => users.id),
  receiver_id: uuid('receiver_id')
    .notNull()
    .references(() => users.id),

  content: text('content').notNull(),
  is_read: boolean('is_read').default(false).notNull(),

  // All paid DMs are priority by default
  is_priority: boolean('is_priority').default(true).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
