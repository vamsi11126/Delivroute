import { Router } from 'express';
import { Role } from '@prisma/client';
import * as packageController from '../controllers/package.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import { markDeliveredSchema, markFailedSchema } from '../schemas/package.schema';

const router = Router();

// Every package route requires a valid JWT belonging to a delivery_boy.
router.use(verifyToken, requireRole(Role.delivery_boy));

router.patch('/:id/deliver', validate(markDeliveredSchema), packageController.markDelivered);
router.patch('/:id/fail', validate(markFailedSchema), packageController.markFailed);
router.delete('/:id', packageController.deletePackage);

export const packageRouter = router;
