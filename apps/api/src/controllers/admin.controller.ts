import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';
import * as adminService from '../services/admin.service';
import {
  listStoresQuerySchema,
  listSubscriptionsQuerySchema,
} from '../schemas/admin.schema';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

/** Parse req.query against a Zod schema, throwing VALIDATION_ERROR on failure. */
function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): z.infer<S> {
  const result = schema.safeParse(query);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
      .join('; ');
    throw new ApiError(400, 'VALIDATION_ERROR', message);
  }
  return result.data;
}

export async function listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parseQuery(listStoresQuerySchema, req.query);
    const result = await adminService.listStores(page, limit);
    res.json({
      success: true,
      data: result.stores,
      meta: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (err) {
    logger.error('listStores failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await adminService.getStore(String(req.params.id));
    res.json({ success: true, data: store, meta: {} });
  } catch (err) {
    logger.error('getStore failed', { error: (err as Error).message });
    next(err);
  }
}

export async function updateStoreStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = String(req.params.id);
    const store = await adminService.updateStoreStatus(storeId, req.body.status);
    logger.info('Store status updated', { storeId, status: store.status });
    res.json({ success: true, data: store, meta: {} });
  } catch (err) {
    logger.error('updateStoreStatus failed', { error: (err as Error).message });
    next(err);
  }
}

export async function listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = parseQuery(listSubscriptionsQuerySchema, req.query);
    const subscriptions = await adminService.listSubscriptions(status);
    res.json({ success: true, data: subscriptions, meta: { count: subscriptions.length } });
  } catch (err) {
    logger.error('listSubscriptions failed', { error: (err as Error).message });
    next(err);
  }
}

export async function getPlatformAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analytics = await adminService.getPlatformAnalytics();
    res.json({ success: true, data: analytics, meta: {} });
  } catch (err) {
    logger.error('getPlatformAnalytics failed', { error: (err as Error).message });
    next(err);
  }
}
