import { Router } from 'express';
import { Role } from '@prisma/client';
import * as adminController from '../controllers/admin.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import { updateStoreStatusSchema } from '../schemas/admin.schema';

const router = Router();

// Every admin route requires a valid JWT belonging to a super_admin.
router.use(verifyToken, requireRole(Role.super_admin));

// Stores
router.get('/stores', adminController.listStores);
router.get('/stores/:id', adminController.getStore);
router.patch(
  '/stores/:id/status',
  validate(updateStoreStatusSchema),
  adminController.updateStoreStatus,
);

// Subscriptions
router.get('/subscriptions', adminController.listSubscriptions);

// Platform analytics
router.get('/analytics', adminController.getPlatformAnalytics);

export const adminRouter = router;
