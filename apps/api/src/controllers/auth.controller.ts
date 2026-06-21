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
    const storeId = req.user?.storeId;
    if (!storeId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only a store owner can invite delivery boys');
    }
    const otp = await authService.generateOtp(req.body.phone, storeId);
    logger.info('OTP invite sent', { storeId, phone: req.body.phone });

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
    const { phone, otp, name, password } = req.body;
    const result = await authService.verifyOtp(phone, otp, name, password);
    logger.info('Delivery boy onboarded', { userId: result.user.id, storeId: result.user.storeId });
    res.status(201).json({ success: true, data: result, meta: {} });
  } catch (err) {
    logger.error('verifyOtp failed', { error: (err as Error).message });
    next(err);
  }
}
