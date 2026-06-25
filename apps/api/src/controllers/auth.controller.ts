import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function registerStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.registerStore(req.body);
    logger.info('Store registered', { storeId: result.store.id, ownerId: result.user.id });
    res.status(201).json({ success: true, data: result, meta: {} });
  } catch (err) {
    logger.error('registerStore failed', { error: (err as Error).message });
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password);
    logger.info('User logged in', { userId: result.user.id, role: result.user.role });
    res.json({ success: true, data: result, meta: {} });
  } catch (err) {
    logger.error('login failed', { error: (err as Error).message });
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);
    logger.info('Access token refreshed');
    res.json({ success: true, data: tokens, meta: {} });
  } catch (err) {
    logger.error('refresh failed', { error: (err as Error).message });
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(req.body.refreshToken);
    logger.info('User logged out', { userId: req.user?.id });
    res.json({ success: true, data: { loggedOut: true }, meta: {} });
  } catch (err) {
    logger.error('logout failed', { error: (err as Error).message });
    next(err);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Public endpoint for delivery-boy self-onboarding — no authenticated store
    // owner. If one is ever present we honour their storeId; otherwise the
    // service falls back to the default store (dev-only, see generateOtp).
    const otp = await authService.generateOtp(req.body.phone, req.user?.storeId ?? undefined);
    logger.info('OTP sent', { phone: req.body.phone });

    // Never expose the OTP outside development.
    const data =
      process.env.NODE_ENV === 'development' ? { sent: true, otp } : { sent: true };
    res.json({ success: true, data, meta: {} });
  } catch (err) {
    logger.error('sendOtp failed', { error: (err as Error).message });
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp } = req.body;
    const result = await authService.verifyOtp(phone, otp);
    logger.info('OTP verified', {
      userId: result.user.id,
      storeId: result.user.storeId,
      isNewUser: result.isNewUser,
    });
    res.status(result.isNewUser ? 201 : 200).json({ success: true, data: result, meta: {} });
  } catch (err) {
    logger.error('verifyOtp failed', { error: (err as Error).message });
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    const { name, password } = req.body;
    const user = await authService.updateProfile(userId, name, password);
    logger.info('Profile updated', { userId });
    res.json({ success: true, data: { user }, meta: {} });
  } catch (err) {
    logger.error('updateProfile failed', { error: (err as Error).message });
    next(err);
  }
}
