import { z } from 'zod';
import { StoreStatus, SubStatus } from '@prisma/client';

/** Pagination for the stores list. Coerced from query strings. */
export const listStoresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Super admin sets a store's lifecycle status. */
export const updateStoreStatusSchema = z.object({
  status: z.nativeEnum(StoreStatus),
});

/** Optional subscription status filter. */
export const listSubscriptionsQuerySchema = z.object({
  status: z.nativeEnum(SubStatus).optional(),
});

export type ListStoresQuery = z.infer<typeof listStoresQuerySchema>;
export type UpdateStoreStatusInput = z.infer<typeof updateStoreStatusSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
