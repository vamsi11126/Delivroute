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

export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boyId, storeId } = requireAuth(req);
    const session = await sessionService.createSession(boyId, storeId);
    logger.info('Session created', { sessionId: session.id, boyId, storeId });
    res.status(201).json({ success: true, data: session, meta: {} });
  } catch (err) {
    logger.error('createSession failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = requireAuth(req);
    const session = await sessionService.getSession(String(req.params.id), storeId);
    res.json({ success: true, data: session, meta: {} });
  } catch (err) {
    logger.error('getSession failed', { error: (err as Error).message });
    next(err);
  }
}

export async function addPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = requireAuth(req);
    const created = await sessionService.addPackages(
      String(req.params.id),
      storeId,
      req.body.packages,
    );
    logger.info('Packages added', { sessionId: req.params.id, count: created.length });
    res.status(201).json({ success: true, data: created, meta: { count: created.length } });
  } catch (err) {
    logger.error('addPackages failed', { error: (err as Error).message });
    next(err);
  }
}

export async function optimizeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = requireAuth(req);
    const { lat, lng } = req.body;
    const session = await sessionService.optimizeSession(String(req.params.id), storeId, { lat, lng });
    logger.info('Session optimised', { sessionId: req.params.id });
    res.json({ success: true, data: session, meta: {} });
  } catch (err) {
    logger.error('optimizeSession failed', { error: (err as Error).message });
    next(err);
  }
}

export async function startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = requireAuth(req);
    const session = await sessionService.startSession(String(req.params.id), storeId);
    logger.info('Session started', { sessionId: session.id });
    res.json({ success: true, data: session, meta: {} });
  } catch (err) {
    logger.error('startSession failed', { error: (err as Error).message });
    next(err);
  }
}

export async function pushLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boyId } = requireAuth(req);
    const { lat, lng } = req.body;
    const location = await sessionService.pushLocation(boyId, lat, lng);
    res.status(201).json({ success: true, data: location, meta: {} });
  } catch (err) {
    logger.error('pushLocation failed', { error: (err as Error).message });
    next(err);
  }
}
