import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Singleton PrismaClient.
 * In development we cache the client on `globalThis` to avoid exhausting
 * connections across hot reloads (nodemon / ts-node).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Verify database connectivity (called once on server startup). */
export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
  logger.info('Prisma connected to database');
}

/** Gracefully disconnect Prisma. */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
