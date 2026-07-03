import { Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/session.service';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

/** Pull the delivery boy's id + store scope from the JWT (never the body). */
function requireAuth(req: Request): { boyId: string; storeId: string } {
  const id = req.user?.id;
  const storeId = req.user?.storeId;
  if (!id || !storeId) {
    throw new ApiError(403, 'FORBIDDEN', 'No store is associated with this account');
  }
  return { boyId: id, storeId };
}

export async function markDelivered(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boyId, storeId } = requireAuth(req);
    const pkg = await sessionService.markDelivered(String(req.params.id), boyId, storeId);
    logger.info('Package delivered', { packageId: pkg.id, boyId });
    res.json({ success: true, data: pkg, meta: {} });
  } catch (err) {
    logger.error('markDelivered failed', { error: (err as Error).message });
    next(err);
  }
}

export async function markFailed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boyId, storeId } = requireAuth(req);
    const pkg = await sessionService.markFailed(
      String(req.params.id),
      boyId,
      req.body.failReason,
      storeId,
    );
    logger.info('Package failed', { packageId: pkg.id, boyId });
    res.json({ success: true, data: pkg, meta: {} });
  } catch (err) {
    logger.error('markFailed failed', { error: (err as Error).message });
    next(err);
  }
}

export async function deletePackage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boyId, storeId } = requireAuth(req);
    await sessionService.deletePackage(String(req.params.id), boyId, storeId);
    logger.info('Package deleted', { packageId: req.params.id, boyId });
    res.json({ success: true, data: null, meta: {} });
  } catch (err) {
    logger.error('deletePackage failed', { error: (err as Error).message });
    next(err);
  }
}
