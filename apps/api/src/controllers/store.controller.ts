import { Request, Response, NextFunction } from 'express';
import * as storeService from '../services/store.service';
import { dailyReportQuerySchema } from '../schemas/store.schema';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

/** Reads the store scope from the JWT — never from the request body. */
function requireStoreId(req: Request): string {
  const storeId = req.user?.storeId;
  if (!storeId) {
    throw new ApiError(403, 'FORBIDDEN', 'No store is associated with this account');
  }
  return storeId;
}

export async function getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const team = await storeService.getTeam(storeId);
    res.json({ success: true, data: team, meta: { count: team.length } });
  } catch (err) {
    logger.error('getTeam failed', { error: (err as Error).message });
    next(err);
  }
}

export async function inviteBoy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const { name, phone } = req.body;
    const otp = await storeService.inviteBoy(storeId, name, phone);
    logger.info('Delivery boy invited', { storeId, phone });

    // Never expose the OTP outside development.
    const data = process.env.NODE_ENV === 'development' ? { sent: true, otp } : { sent: true };
    res.status(201).json({ success: true, data, meta: {} });
  } catch (err) {
    logger.error('inviteBoy failed', { error: (err as Error).message });
    next(err);
  }
}

export async function deactivateBoy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const boy = await storeService.deactivateBoy(String(req.params.id), storeId);
    logger.info('Delivery boy deactivated', { storeId, boyId: boy.id });
    res.json({ success: true, data: boy, meta: {} });
  } catch (err) {
    logger.error('deactivateBoy failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getTodaySessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const sessions = await storeService.getTodaySessions(storeId);
    res.json({ success: true, data: sessions, meta: { count: sessions.length } });
  } catch (err) {
    logger.error('getTodaySessions failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getSessionPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const packages = await storeService.getSessionPackages(String(req.params.id), storeId);
    res.json({ success: true, data: packages, meta: { count: packages.length } });
  } catch (err) {
    logger.error('getSessionPackages failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getLiveFleet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const fleet = await storeService.getLiveFleet(storeId);
    res.json({ success: true, data: fleet, meta: { count: fleet.length } });
  } catch (err) {
    logger.error('getLiveFleet failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getDailyReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = requireStoreId(req);
    const query = dailyReportQuerySchema.safeParse(req.query);
    if (!query.success) {
      const message = query.error.issues
        .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
        .join('; ');
      throw new ApiError(400, 'VALIDATION_ERROR', message);
    }

    const report = await storeService.getDailyReport(storeId, query.data.date);
    res.json({ success: true, data: report, meta: {} });
  } catch (err) {
    logger.error('getDailyReport failed', { error: (err as Error).message });
    next(err);
  }
}
