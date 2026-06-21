import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Role } from '@prisma/client';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import {
  registerStoreSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../schemas/auth.schema';

// 10 requests / minute / IP across all auth endpoints (security rule #6).
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

const router = Router();
router.use(authLimiter);

// Public
router.post('/register-store', validate(registerStoreSchema), authController.registerStore);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// Protected
router.post('/logout', verifyToken, validate(logoutSchema), authController.logout);
router.post(
  '/send-otp',
  verifyToken,
  requireRole(Role.store_owner),
  validate(sendOtpSchema),
  authController.sendOtp,
);

export const authRouter = router;
