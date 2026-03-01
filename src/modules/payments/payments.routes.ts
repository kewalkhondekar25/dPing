import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as paymentsController from './payments.controller';

const router = Router();

// POST /api/v1/payments/record — audience only
router.post('/record', authenticate, paymentsController.recordPayment);

// POST /api/v1/payments/initiate — audience only
router.post('/initiate', authenticate, paymentsController.initiatePayment);

// POST /api/v1/payments/confirm/:payment_id — audience only
router.post('/confirm/:payment_id', authenticate, paymentsController.confirmPayment);

// GET /api/v1/payments/my-payments — audience only
router.get('/my-payments', authenticate, paymentsController.getMyPayments);

// GET /api/v1/payments/incoming — creator only
router.get('/incoming', authenticate, paymentsController.getIncomingPayments);

// GET /api/v1/payments/mock-checkout/:payment_id — public (simulates payment gateway)
// TODO [Solana]: Remove this route when Solana Pay is integrated
router.get('/mock-checkout/:payment_id', paymentsController.mockCheckout);

export default router;
