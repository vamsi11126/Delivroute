import { Router } from 'express';
import { Role } from '@prisma/client';
import * as storeController from '../controllers/store.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import { inviteBoySchema } from '../schemas/store.schema';

const router = Router();

// Every store route requires a valid JWT belonging to a store_owner.
router.use(verifyToken, requireRole(Role.store_owner));

// Team management
router.get('/team', storeController.getTeam);
router.post('/team', validate(inviteBoySchema), storeController.inviteBoy);
router.delete('/team/:id', storeController.deactivateBoy);

// Sessions & packages
router.get('/sessions', storeController.getTodaySessions);
router.get('/sessions/:id/packages', storeController.getSessionPackages);

// Live fleet
router.get('/fleet/live', storeController.getLiveFleet);

// Reports
router.get('/reports/daily', storeController.getDailyReport);

export const storeRouter = router;
