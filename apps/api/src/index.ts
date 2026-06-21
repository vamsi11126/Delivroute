import 'dotenv/config';
import { createApp } from './app';
import { logger } from './utils/logger';
import { connectPrisma, disconnectPrisma } from './utils/prisma';
import { connectRedis, disconnectRedis } from './utils/redis';

const PORT = Number(process.env.PORT) || 4000;

async function bootstrap(): Promise<void> {
  try {
    // Connect external services before accepting traffic.
    await connectPrisma();
    await connectRedis();

    const app = createApp();
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────────
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await disconnectPrisma();
        await disconnectRedis();
        logger.info('Shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void bootstrap();
