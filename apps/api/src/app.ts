import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ZodError } from 'zod';
import { logger } from './utils/logger';
import { ApiError } from './utils/errors';
import { authRouter } from './routes/auth.routes';
import { sessionRouter } from './routes/session.routes';
import { packageRouter } from './routes/package.routes';
import { storeRouter } from './routes/store.routes';
import { adminRouter } from './routes/admin.routes';
import { billingRouter } from './routes/billing.routes';

/**
 * Builds and configures the Express application.
 * Route groups (auth, sessions, packages, store, admin, billing) are mounted
 * here under the `/v1` base path as they are implemented in later prompts.
 */
export function createApp(): Application {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use('/v1/auth', authRouter);
  app.use('/v1/sessions', sessionRouter);
  app.use('/v1/packages', packageRouter);
  app.use('/v1/store', storeRouter);
  app.use('/v1/admin', adminRouter);
  app.use('/v1/billing', billingRouter);

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof ZodError) {
      const message = err.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message },
      });
      return;
    }

    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  return app;
}
