import { Router } from 'express';
import { Role } from '@prisma/client';
import * as sessionController from '../controllers/session.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import {
  createSessionSchema,
  addPackagesSchema,
  optimizeSchema,
  pushLocationSchema,
} from '../schemas/session.schema';

const router = Router();

// Every session route requires a valid JWT belonging to a delivery_boy.
router.use(verifyToken, requireRole(Role.delivery_boy));

router.post('/', validate(createSessionSchema), sessionController.createSession);
router.get('/', sessionController.getTodaySession);
router.get('/:id', sessionController.getSession);
router.post('/:id/packages', validate(addPackagesSchema), sessionController.addPackages);
router.post('/:id/optimize', validate(optimizeSchema), sessionController.optimizeSession);
router.patch('/:id/start', sessionController.startSession);
router.patch('/:id/end', sessionController.endSession);
router.post('/:id/location', validate(pushLocationSchema), sessionController.pushLocation);

export const sessionRouter = router;
