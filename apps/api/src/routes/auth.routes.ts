import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyToken } from '../middleware/auth.middleware';
import {
  registerStoreSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  sendOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
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
// Public (dev): delivery-boy self-onboarding requests its own OTP. The store is
// resolved server-side (default store for now) — never trust a storeId here.
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);

// Protected
router.post('/logout', verifyToken, validate(logoutSchema), authController.logout);
router.patch('/profile', verifyToken, validate(updateProfileSchema), authController.updateProfile);

export const authRouter = router;
