import { Role } from '@prisma/client';

/**
 * Augments Express' Request with the authenticated user attached by
 * `verifyToken`. `storeId` is null for super_admin (no store scope).
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        storeId: string | null;
      };
    }
  }
}

export {};
