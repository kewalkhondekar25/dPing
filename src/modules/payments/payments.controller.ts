import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as paymentsService from './payments.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { ForbiddenError } from '../../utils/errors';

const initiateSchema = z.object({
  creator_id: z.string().uuid('creator_id must be a valid UUID'),
  message_preview: z.string().max(200).optional(),
});

const confirmSchema = z.object({
  // TODO [Solana]: transaction_id will be required (Solana tx signature)
  transaction_id: z.string().optional(),
});

const recordPaymentSchema = z.object({
  creator_id: z.string().uuid('creator_id must be a valid UUID'),
  amount_lamports: z.string().regex(/^\d+$/, 'amount_lamports must be a non-negative integer'),
  transaction_id: z.string().min(1, 'transaction_id is required'),
});

export async function initiatePayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.user!.role !== 'audience') {
      throw new ForbiddenError('Only audience members can initiate payments');
    }

    const input = initiateSchema.parse(req.body);
    const result = await paymentsService.initiatePayment({
      audience_id: req.user!.id,
      creator_id: input.creator_id,
      message_preview: input.message_preview,
    });

    sendCreated(res, result, 'Payment initiated. Complete the mock payment to unlock DMs.');
  } catch (err) {
    next(err);
  }
}

export async function confirmPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.user!.role !== 'audience') {
      throw new ForbiddenError('Only audience members can confirm payments');
    }

    const payment_id = String(req.params.payment_id);
    const { transaction_id } = confirmSchema.parse(req.body);

    const result = await paymentsService.confirmPayment(
      payment_id,
      req.user!.id,
      transaction_id,
    );

    sendSuccess(res, result, 200, 'Payment confirmed. DM access unlocked!');
  } catch (err) {
    next(err);
  }
}

export async function recordPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.user!.role !== 'audience') {
      throw new ForbiddenError('Only audience members can record payments');
    }

    const input = recordPaymentSchema.parse(req.body);
    const result = await paymentsService.recordPayment({
      audience_id: req.user!.id,
      creator_id: input.creator_id,
      amount_lamports: input.amount_lamports,
      transaction_id: input.transaction_id,
    });

    // Make the response object safe for JSON serialization by casting BigInt to string
    const safeResult = {
      ...result,
      amount_lamports: String(result.amount_lamports),
    };

    sendSuccess(res, safeResult, 201, 'Payment recorded successfully!');
  } catch (err) {
    next(err);
  }
}

export async function getMyPayments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.user!.role !== 'audience') {
      throw new ForbiddenError('Only audience members can view their payments');
    }

    const payments = await paymentsService.getAudiencePayments(req.user!.id);
    sendSuccess(res, payments);
  } catch (err) {
    next(err);
  }
}

export async function getIncomingPayments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.user!.role !== 'creator') {
      throw new ForbiddenError('Only creators can view incoming payments');
    }

    const payments = await paymentsService.getCreatorIncomingPayments(req.user!.id);
    sendSuccess(res, payments);
  } catch (err) {
    next(err);
  }
}

/**
 * Mock checkout handler — simulates a payment gateway redirect.
 * TODO [Solana]: Remove this entirely when Solana Pay is integrated.
 */
export async function mockCheckout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payment_id = String(req.params.payment_id);
    res.json({
      success: true,
      data: {
        payment_id,
        instructions: `This is a mock payment page. In production, this will redirect to Solana Pay or Stripe.
To confirm this payment, call: POST /api/v1/payments/confirm/${payment_id}`,
        // TODO [Solana]: Generate and return Solana Pay QR code here
      },
    });
  } catch (err) {
    next(err);
  }
}
