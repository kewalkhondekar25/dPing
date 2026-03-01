import { and, eq, or, desc } from 'drizzle-orm';
import { db } from '../../db';
import { messages, Message, NewMessage } from '../../db/schema/messages';
import { users } from '../../db/schema/users';
import { payments } from '../../db/schema/payments';
import { findActivePayment } from '../payments/payments.service';
import {
  NotFoundError,
  PaymentRequiredError,
  ForbiddenError,
} from '../../utils/errors';

export interface SendMessageInput {
  sender_id: string;
  receiver_id: string;
  content: string;
}

export interface ConversationSummary {
  other_user: {
    id: string;
    username: string;
    display_name: string | null;
    profile_image_url: string | null;
  };
  last_message: {
    id: string;
    content: string;
    created_at: Date;
    is_read: boolean;
    sender_id: string;
  };
  payment_status: string;
  unread_count: number;
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const { sender_id, receiver_id, content } = input;

  // Prevent self-messaging
  if (sender_id === receiver_id) {
    throw new ForbiddenError('You cannot send a message to yourself');
  }

  // Payment gate: verify a completed payment exists between sender and receiver
  const activePayment = await findActivePayment(sender_id, receiver_id);

  if (!activePayment) {
    throw new PaymentRequiredError(
      'No active payment found. Audience must pay the creator to unlock messaging.',
    );
  }

  const newMessage: NewMessage = {
    payment_id: activePayment.id,
    sender_id,
    receiver_id,
    content,
    is_priority: true,
  };

  const [created] = await db.insert(messages).values(newMessage).returning();
  return created;
}

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  // Get all unique conversation partners
  const allMessages = await db
    .select({
      id: messages.id,
      sender_id: messages.sender_id,
      receiver_id: messages.receiver_id,
      content: messages.content,
      is_read: messages.is_read,
      created_at: messages.created_at,
      payment_id: messages.payment_id,
    })
    .from(messages)
    .where(or(eq(messages.sender_id, userId), eq(messages.receiver_id, userId)))
    .orderBy(desc(messages.created_at));

  // Group by conversation partner
  const conversationMap = new Map<
    string,
    {
      last_message: (typeof allMessages)[0];
      unread_count: number;
    }
  >();

  for (const msg of allMessages) {
    const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, { last_message: msg, unread_count: 0 });
    }

    // Count unread messages from the other user
    if (msg.receiver_id === userId && !msg.is_read) {
      const conv = conversationMap.get(otherId)!;
      conv.unread_count++;
    }
  }

  const conversations: ConversationSummary[] = [];

  for (const [otherId, { last_message, unread_count }] of conversationMap.entries()) {
    const [otherUser] = await db
      .select({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        profile_image_url: users.profile_image_url,
      })
      .from(users)
      .where(eq(users.id, otherId))
      .limit(1);

    if (!otherUser) continue;

    // Get payment status for this conversation
    const [payment] = await db
      .select({ payment_status: payments.payment_status })
      .from(payments)
      .where(
        and(
          or(
            and(eq(payments.audience_id, userId), eq(payments.creator_id, otherId)),
            and(eq(payments.audience_id, otherId), eq(payments.creator_id, userId)),
          ),
          eq(payments.payment_status, 'completed'),
        ),
      )
      .limit(1);

    conversations.push({
      other_user: otherUser,
      last_message: {
        id: last_message.id,
        content: last_message.content,
        created_at: last_message.created_at,
        is_read: last_message.is_read,
        sender_id: last_message.sender_id,
      },
      payment_status: payment?.payment_status || 'none',
      unread_count,
    });
  }

  return conversations;
}

export async function getMessageThread(
  userId: string,
  otherUserId: string,
): Promise<Message[]> {
  // Verify payment exists before returning thread
  const activePayment = await findActivePayment(userId, otherUserId);

  if (!activePayment) {
    // Check the other direction as well
    const reversePayment = await findActivePayment(otherUserId, userId);
    if (!reversePayment) {
      throw new PaymentRequiredError(
        'No active payment found for this conversation.',
      );
    }
  }

  return db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.sender_id, userId), eq(messages.receiver_id, otherUserId)),
        and(eq(messages.sender_id, otherUserId), eq(messages.receiver_id, userId)),
      ),
    )
    .orderBy(messages.created_at);
}

export async function markConversationAsRead(
  userId: string,
  otherUserId: string,
): Promise<{ count: number }> {
  // Update all messages where sender is otherUserId and receiver is userId, that are unread
  const result = await db
    .update(messages)
    .set({ is_read: true })
    .where(
      and(
        eq(messages.sender_id, otherUserId),
        eq(messages.receiver_id, userId),
        eq(messages.is_read, false)
      )
    )
    .returning({ id: messages.id });

  return { count: result.length };
}

export async function markMessageAsRead(
  messageId: string,
  userId: string,
): Promise<Message> {
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) {
    throw new NotFoundError('Message');
  }

  // Only the receiver can mark a message as read
  if (message.receiver_id !== userId) {
    throw new ForbiddenError('You can only mark your own received messages as read');
  }

  const [updated] = await db
    .update(messages)
    .set({ is_read: true })
    .where(eq(messages.id, messageId))
    .returning();

  return updated;
}
