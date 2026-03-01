import { and, eq, desc, sql, or } from 'drizzle-orm';
import { db } from '../../db';
import { payments } from '../../db/schema/payments';
import { messages } from '../../db/schema/messages';
import { users } from '../../db/schema/users';

export interface CreatorDashboard {
  total_earnings_lamports: string;
  total_priority_dms: number;
  unread_message_count: number;
  recent_paying_audience: Array<{
    audience_id: string;
    username: string;
    display_name: string | null;
    profile_image_url: string | null;
    paid_at: Date | null;
    amount_lamports: string;
    last_message_preview: string | null;
    has_replied: boolean;
  }>;
  pending_dm_requests: Array<{
    payment_id: string;
    audience_id: string;
    username: string;
    display_name: string | null;
    paid_at: Date | null;
    amount_lamports: string;
  }>;
}

export interface AudienceDashboard {
  creators_messaged: Array<{
    creator_id: string;
    username: string;
    display_name: string | null;
    profile_image_url: string | null;
    dm_price_lamports: string;
  }>;
  payment_history: Array<{
    payment_id: string;
    creator_id: string;
    creator_username: string;
    amount_lamports: string;
    payment_status: string;
    paid_at: Date | null;
    message_unlocked: boolean;
    created_at: Date;
  }>;
  conversation_status: Array<{
    creator_id: string;
    creator_username: string;
    message_count: number;
    last_message_at: Date | null;
    payment_status: string;
  }>;
}

export async function getCreatorDashboard(creatorId: string): Promise<CreatorDashboard> {
  // Total earnings from completed payments (in lamports)
  const earningsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${payments.amount_lamports}::numeric), 0)::text`,
    })
    .from(payments)
    .where(
      and(eq(payments.creator_id, creatorId), eq(payments.payment_status, 'completed')),
    );

  const total_earnings_lamports = earningsResult[0]?.total ?? '0';

  // Total priority DMs received
  const dmCountResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(and(eq(messages.receiver_id, creatorId), eq(messages.is_priority, true)));

  const total_priority_dms = Number(dmCountResult[0]?.count ?? 0);

  // Unread message count
  const unreadResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(and(eq(messages.receiver_id, creatorId), eq(messages.is_read, false)));

  const unread_message_count = Number(unreadResult[0]?.count ?? 0);

  // Recent paying audience with last message preview
  const recentPayments = await db
    .select({
      payment_id: payments.id,
      audience_id: payments.audience_id,
      amount_lamports: payments.amount_lamports,
      paid_at: payments.paid_at,
    })
    .from(payments)
    .where(
      and(eq(payments.creator_id, creatorId), eq(payments.payment_status, 'completed')),
    )
    .orderBy(desc(payments.paid_at))
    .limit(10);

  const recent_paying_audience = await Promise.all(
    recentPayments.map(async (p) => {
      const [audienceUser] = await db
        .select({
          username: users.username,
          display_name: users.display_name,
          profile_image_url: users.profile_image_url,
        })
        .from(users)
        .where(eq(users.id, p.audience_id))
        .limit(1);

      // Last message preview
      const [lastMsg] = await db
        .select({ content: messages.content })
        .from(messages)
        .where(
          and(
            eq(messages.sender_id, p.audience_id),
            eq(messages.receiver_id, creatorId),
          ),
        )
        .orderBy(desc(messages.created_at))
        .limit(1);

      // Has creator replied?
      const [creatorReply] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.sender_id, creatorId),
            eq(messages.receiver_id, p.audience_id),
          ),
        )
        .limit(1);

      return {
        audience_id: p.audience_id,
        username: audienceUser?.username ?? 'unknown',
        display_name: audienceUser?.display_name ?? null,
        profile_image_url: audienceUser?.profile_image_url ?? null,
        paid_at: p.paid_at,
        amount_lamports: String(p.amount_lamports),
        last_message_preview: lastMsg?.content
          ? lastMsg.content.substring(0, 100)
          : null,
        has_replied: !!creatorReply,
      };
    }),
  );

  // Pending DM requests: paid but creator hasn't replied yet
  const pending_dm_requests = recent_paying_audience
    .filter((a) => !a.has_replied && a.last_message_preview !== null)
    .map((a) => ({
      payment_id: '',
      audience_id: a.audience_id,
      username: a.username,
      display_name: a.display_name,
      paid_at: a.paid_at,
      amount_lamports: String(a.amount_lamports),
    }));

  return {
    total_earnings_lamports,
    total_priority_dms,
    unread_message_count,
    recent_paying_audience,
    pending_dm_requests,
  };
}

export async function getAudienceDashboard(audienceId: string): Promise<AudienceDashboard> {
  // All payments made by this audience user
  const allPayments = await db
    .select({
      payment_id: payments.id,
      creator_id: payments.creator_id,
      amount_lamports: payments.amount_lamports,
      payment_status: payments.payment_status,
      paid_at: payments.paid_at,
      message_unlocked: payments.message_unlocked,
      created_at: payments.created_at,
    })
    .from(payments)
    .where(eq(payments.audience_id, audienceId))
    .orderBy(desc(payments.created_at));

  // Get creator details for each payment
  const creatorIds = [...new Set(allPayments.map((p) => p.creator_id))];

  const creatorDetails = await Promise.all(
    creatorIds.map(async (creatorId) => {
      const [creator] = await db
        .select({
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          profile_image_url: users.profile_image_url,
          dm_price_lamports: users.dm_price_lamports,
        })
        .from(users)
        .where(eq(users.id, creatorId))
        .limit(1);
      return creator;
    }),
  );

  const creatorMap = new Map(creatorDetails.filter(Boolean).map((c) => [c!.id, c!]));

  const creators_messaged = creatorDetails
    .filter(Boolean)
    .map((c) => ({
      creator_id: c!.id,
      username: c!.username,
      display_name: c!.display_name,
      profile_image_url: c!.profile_image_url,
      dm_price_lamports: String(c!.dm_price_lamports),
    }));

  const payment_history = allPayments.map((p) => ({
    payment_id: p.payment_id,
    creator_id: p.creator_id,
    creator_username: creatorMap.get(p.creator_id)?.username ?? 'unknown',
    amount_lamports: String(p.amount_lamports),
    payment_status: p.payment_status,
    paid_at: p.paid_at,
    message_unlocked: p.message_unlocked,
    created_at: p.created_at,
  }));

  // Conversation status per creator
  const conversation_status = await Promise.all(
    creatorIds.map(async (creatorId) => {
      const msgCountResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(messages)
        .where(
          or(
            and(
              eq(messages.sender_id, audienceId),
              eq(messages.receiver_id, creatorId),
            ),
            and(
              eq(messages.sender_id, creatorId),
              eq(messages.receiver_id, audienceId),
            ),
          ),
        );

      const [lastMsg] = await db
        .select({ created_at: messages.created_at })
        .from(messages)
        .where(
          or(
            and(
              eq(messages.sender_id, audienceId),
              eq(messages.receiver_id, creatorId),
            ),
            and(
              eq(messages.sender_id, creatorId),
              eq(messages.receiver_id, audienceId),
            ),
          ),
        )
        .orderBy(desc(messages.created_at))
        .limit(1);

      const [payment] = await db
        .select({ payment_status: payments.payment_status })
        .from(payments)
        .where(
          and(
            eq(payments.audience_id, audienceId),
            eq(payments.creator_id, creatorId),
          ),
        )
        .orderBy(desc(payments.created_at))
        .limit(1);

      return {
        creator_id: creatorId,
        creator_username: creatorMap.get(creatorId)?.username ?? 'unknown',
        message_count: Number(msgCountResult[0]?.count ?? 0),
        last_message_at: lastMsg?.created_at ?? null,
        payment_status: payment?.payment_status ?? 'none',
      };
    }),
  );

  return {
    creators_messaged,
    payment_history,
    conversation_status,
  };
}
