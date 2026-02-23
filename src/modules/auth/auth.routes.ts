import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as authController from './auth.controller';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authController.register);

// POST /api/v1/auth/login
router.post('/login', authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

export default router;
