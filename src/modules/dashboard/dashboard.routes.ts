import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as dashboardController from './dashboard.controller';

const router = Router();

// GET /api/v1/dashboard/creator — creator only
router.get(
  '/creator',
  authenticate,
  requireRole('creator'),
  dashboardController.getCreatorDashboard,
);

// GET /api/v1/dashboard/audience — audience only
router.get(
  '/audience',
  authenticate,
  requireRole('audience'),
  dashboardController.getAudienceDashboard,
);

export default router;
