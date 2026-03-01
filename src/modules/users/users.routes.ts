import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as usersController from './users.controller';

const router = Router();

// GET /api/v1/users/creators — public
router.get('/creators', usersController.getAllCreators);

// GET /api/v1/users/creators/:username — public
router.get('/creators/:username', usersController.getCreatorByUsername);

// GET /api/v1/users/me — authenticated
router.get('/me', authenticate, usersController.getMe);

// PATCH /api/v1/users/me — authenticated
router.patch('/me', authenticate, usersController.updateMe);

// PATCH /api/v1/users/creator/profile — authenticated (creator only)
router.patch('/creator/profile', authenticate, usersController.updateCreatorProfile);

// PATCH /api/v1/users/wallet — authenticated
router.patch('/wallet', authenticate, usersController.updateWallet);

export default router;
