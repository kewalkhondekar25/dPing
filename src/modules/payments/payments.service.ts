import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { payments, Payment, NewPayment } from '../../db/schema/payments';
import { users } from '../../db/schema/users';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  PaymentNotFoundError,
} from '../../utils/errors';

// ============================================================
// Mock Payment Service
// TODO [Solana]: Replace this entire service with @solana/web3.js
// TODO [Solana]: Verify on-chain payment via program derived address (PDA)
// ============================================================

export interface RecordPaymentInput {
  audience_id: string;
  creator_id: string;
  amount_lamports: string;
  transaction_id: string;
}

export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const { audience_id, creator_id, amount_lamports, transaction_id } = input;

  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, creator_id))
    .limit(1);

  if (!creator || creator.role !== 'creator' || !creator.is_active) {
    throw new NotFoundError('Creator');
  }

  if (audience_id === creator_id) {
    throw new ForbiddenError('You cannot record a payment to yourself');
  }

  // Prevent duplicate transaction_id
  if (transaction_id) {
    const [existingTx] = await db
      .select()
      .from(payments)
      .where(eq(payments.transaction_id, transaction_id))
      .limit(1);

    if (existingTx) {
      throw new ConflictError('A payment with this transaction_id already exists');
    }
  }

  const newPayment: NewPayment = {
    audience_id,
    creator_id,
    amount_lamports: BigInt(amount_lamports),
    currency: 'SOL',
    payment_method: 'solana',
    payment_status: 'completed',
    transaction_id,
    message_unlocked: true,
    paid_at: new Date(),
  };

  const [created] = await db.insert(payments).values(newPayment).returning();

  return created;
}

export interface InitiatePaymentInput {
  audience_id: string;
  creator_id: string;
  message_preview?: string;
}

export interface InitiatePaymentResult {
  payment_id: string;
  amount_lamports: string;
  creator: {
    id: string;
    username: string;
    display_name: string | null;
  };
  // TODO [Solana]: Replace mock_payment_url with Solana Pay URL (solana:<recipient>?amount=<amount>&label=<label>)
  mock_payment_url: string;
}

export interface ConfirmPaymentResult {
  payment: Payment;
  dm_unlocked: boolean;
}

export async function initiatePayment(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  const { audience_id, creator_id } = input;

  // Fetch creator
  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, creator_id))
    .limit(1);

  if (!creator || creator.role !== 'creator' || !creator.is_active) {
    throw new NotFoundError('Creator');
  }

  // Prevent self-payment
  if (audience_id === creator_id) {
    throw new ForbiddenError('You cannot initiate a payment to yourself');
  }

  // Check for existing active (completed, non-expired) payment — prevent duplicate
  const existingPayments = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.audience_id, audience_id),
        eq(payments.creator_id, creator_id),
        eq(payments.payment_status, 'completed'),
        eq(payments.message_unlocked, true),
      ),
    );

  const now = new Date();
  const activePayment = existingPayments.find(
    (p) => !p.expires_at || p.expires_at > now,
  );

  if (activePayment) {
    throw new ConflictError(
      'You already have an active payment for this creator. You can message them directly.',
    );
  }

  // Lock in the creator's price at the time of initiation (in lamports)
  const amount_lamports = creator.dm_price_lamports;

  const newPayment: NewPayment = {
    audience_id,
    creator_id,
    amount_lamports,
    currency: 'SOL',
    payment_method: 'mock',
    payment_status: 'pending',
  };

  const [created] = await db.insert(payments).values(newPayment).returning();

  // TODO [Solana]: Generate Solana Pay URL instead of mock URL
  // e.g. `solana:${creatorWallet}?amount=${amountSOL}&label=dTopMate+DM&memo=${created.id}`
  const mock_payment_url = `http://localhost:${process.env.PORT || 3000}/api/v1/payments/mock-checkout/${created.id}`;

  return {
    payment_id: created.id,
    amount_lamports: String(created.amount_lamports),
    creator: {
      id: creator.id,
      username: creator.username,
      display_name: creator.display_name,
    },
    mock_payment_url,
  };
}

export async function confirmPayment(
  paymentId: string,
  audienceId: string,
  transactionId?: string,
): Promise<ConfirmPaymentResult> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new PaymentNotFoundError();
  }

  // Only the audience member who initiated can confirm
  if (payment.audience_id !== audienceId) {
    throw new ForbiddenError('You are not authorized to confirm this payment');
  }

  if (payment.payment_status === 'completed') {
    throw new ConflictError('This payment has already been confirmed');
  }

  if (payment.payment_status === 'failed' || payment.payment_status === 'refunded') {
    throw new ForbiddenError(`Cannot confirm a payment with status: ${payment.payment_status}`);
  }

  // TODO [Solana]: Replace mock confirmation with on-chain verification
  // TODO [Solana]: Verify transaction signature on Solana blockchain
  // TODO [Solana]: Check that the correct amount was sent to the creator's wallet
  // const isValid = await verifyOnChainPayment(transactionId, payment.amount_lamports, payment.creator_id);

  const mockTransactionId =
    transactionId ||
    `mock_tx_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const [updated] = await db
    .update(payments)
    .set({
      payment_status: 'completed',
      message_unlocked: true,
      transaction_id: mockTransactionId,
      paid_at: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning();

  return {
    payment: updated,
    dm_unlocked: true,
  };
}

export async function getAudiencePayments(audienceId: string): Promise<Payment[]> {
  const results = await db
    .select()
    .from(payments)
    .where(eq(payments.audience_id, audienceId))
    .orderBy(desc(payments.created_at));
    
  return results.map((p) => ({
    ...p,
    amount_lamports: String(p.amount_lamports),
  })) as any;
}

export async function getCreatorIncomingPayments(creatorId: string): Promise<
  Array<
    Payment & {
      audience: { id: string; username: string; display_name: string | null };
    }
  >
> {
  const results = await db
    .select({
      payment: payments,
      audience: {
        id: users.id,
        username: users.username,
        display_name: users.display_name,
      },
    })
    .from(payments)
    .innerJoin(users, eq(payments.audience_id, users.id))
    .where(eq(payments.creator_id, creatorId))
    .orderBy(desc(payments.created_at));

  // BigInt must be converted to string for JSON serialization
  return results.map(({ payment, audience }) => ({
    ...payment,
    amount_lamports: String(payment.amount_lamports),
    audience,
  })) as any;
}

export async function getCreatorEarnings(creatorId: string): Promise<{ total_earnings_lamports: string }> {
  const earningsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${payments.amount_lamports}::numeric), 0)::text`,
    })
    .from(payments)
    .where(
      and(eq(payments.creator_id, creatorId), eq(payments.payment_status, 'completed')),
    );

  return {
    total_earnings_lamports: earningsResult[0]?.total ?? '0',
  };
}

/**
 * Checks if a completed payment exists between two users.
 * Used by the messages service to enforce the payment gate.
 */
export async function findActivePayment(
  senderId: string,
  receiverId: string,
): Promise<Payment | null> {
  // Determine the audience/creator direction
  // Audience → Creator: audience has paid
  // Creator → Audience: audience had paid the creator (bidirectional messaging after payment)
  const results = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.payment_status, 'completed'),
        eq(payments.message_unlocked, true),
      ),
    );

  const now = new Date();

  // Check both directions: sender paid receiver, or receiver paid sender
  const activePayment = results.find((p) => {
    const isNotExpired = !p.expires_at || p.expires_at > now;
    const audienceToCreator =
      p.audience_id === senderId && p.creator_id === receiverId;
    const creatorToAudience =
      p.creator_id === senderId && p.audience_id === receiverId;
    return isNotExpired && (audienceToCreator || creatorToAudience);
  });

  return activePayment || null;
}
