import type { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { z } from 'zod';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { setIo } from './socket-emitter';

/** Origins allowed to open a socket connection (web dashboard + mobile app). */
const SOCKET_CORS_ORIGINS = (process.env.SOCKET_CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/** Payload sent by the mobile app on every GPS ping (every ~30s). */
const locationUpdateSchema = z.object({
  boyId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

/** Matches per-store namespaces: `/store-{storeId}`. */
const STORE_NAMESPACE_RE = /^\/store-(.+)$/;

/**
 * Authenticate a socket from `handshake.auth.token`, attaching the decoded
 * user to `socket.data.user`. Rejects the connection on a missing/invalid JWT.
 */
function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('UNAUTHORIZED: missing auth token'));
  }
  try {
    const user = verifyAccessToken(token);
    socket.data.user = user;
    next();
  } catch {
    next(new Error('UNAUTHORIZED: invalid or expired token'));
  }
}

/**
 * Wire up handlers for a single connection inside a store namespace.
 * Currently handles `location:update` → persist + broadcast.
 */
function registerLocationHandlers(socket: Socket, storeId: string): void {
  const user = socket.data.user as AccessTokenPayload;

  socket.on('location:update', async (raw: unknown) => {
    try {
      const parsed = locationUpdateSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid location payload' });
        return;
      }
      const { boyId, lat, lng, timestamp } = parsed.data;

      // A delivery boy may only report their own location.
      if (user.role === 'delivery_boy' && user.id !== boyId) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot report another boy location' });
        return;
      }

      const recordedAt = timestamp ? new Date(timestamp) : new Date();

      await prisma.location.create({
        data: { boyId, lat, lng, recordedAt },
      });

      // Broadcast to everyone in this store's namespace (dashboards + peers).
      socket.nsp.emit('location:broadcast', {
        boyId,
        lat,
        lng,
        timestamp: recordedAt.toISOString(),
      });
    } catch (err) {
      logger.error('location:update failed', { error: (err as Error).message, storeId });
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to record location' });
    }
  });
}

/**
 * Initialise Socket.io on the existing HTTP server:
 *  - CORS limited to the web/mobile origins
 *  - JWT auth middleware on the connection handshake
 *  - one namespace per store (`/store-{storeId}`) created dynamically
 *
 * Returns the configured `io` instance (also registered in the emitter singleton).
 */
export function initLocationSocket(httpServer: HttpServer): Server {
  const io = new IOServer(httpServer, {
    cors: { origin: SOCKET_CORS_ORIGINS, credentials: true },
  });

  // Dynamic namespaces: any `/store-{id}` is accepted and shares this setup.
  const storeNamespaces = io.of(STORE_NAMESPACE_RE);

  storeNamespaces.use(authenticateSocket);

  storeNamespaces.on('connection', (socket: Socket) => {
    const match = socket.nsp.name.match(STORE_NAMESPACE_RE);
    const storeId = match?.[1] ?? '';
    const user = socket.data.user as AccessTokenPayload;

    // Enforce store scope: a store-bound user can only join their own namespace.
    if (user.storeId && user.storeId !== storeId) {
      logger.warn('Socket store mismatch — disconnecting', {
        userId: user.id,
        userStore: user.storeId,
        namespace: socket.nsp.name,
      });
      socket.emit('error', { code: 'FORBIDDEN', message: 'Store namespace mismatch' });
      socket.disconnect(true);
      return;
    }

    logger.info('Socket connected', { userId: user.id, role: user.role, storeId });
    registerLocationHandlers(socket, storeId);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId: user.id, storeId, reason });
    });
  });

  setIo(io);
  return io;
}
