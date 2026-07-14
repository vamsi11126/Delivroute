import { z } from 'zod';
import { Plan, StoreStatus, SubStatus } from '@prisma/client';

/** Pagination for the stores list. Coerced from query strings. */
export const listStoresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Super admin updates a store's lifecycle status and/or plan. Both are optional
 * but at least one must be supplied (status-only for activate/suspend, plan-only
 * for a plan change, or both together).
 */
export const updateStoreStatusSchema = z
  .object({
    status: z.nativeEnum(StoreStatus).optional(),
    plan: z.nativeEnum(Plan).optional(),
  })
  .refine((data) => data.status !== undefined || data.plan !== undefined, {
    message: 'Provide at least one of status or plan',
  });

/** Optional subscription status filter. */
export const listSubscriptionsQuerySchema = z.object({
  status: z.nativeEnum(SubStatus).optional(),
});

export type ListStoresQuery = z.infer<typeof listStoresQuerySchema>;
export type UpdateStoreStatusInput = z.infer<typeof updateStoreStatusSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
