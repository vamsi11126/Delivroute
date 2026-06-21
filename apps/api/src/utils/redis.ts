import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in environment variables');
}

/**
 * Singleton ioredis client.
 * Used for OTP storage (`otp:{phone}`), refresh tokens (`refresh:{token}`),
 * and general caching/sessions.
 */
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

/** Establish the Redis connection (called once on server startup). */
export async function connectRedis(): Promise<void> {
  await redis.connect();
}

/** Gracefully close the Redis connection. */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
