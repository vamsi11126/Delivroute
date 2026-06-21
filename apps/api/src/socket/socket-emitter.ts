import type { Server } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * Singleton holder for the Socket.io server instance.
 *
 * Controllers/services emit real-time events through `emitToStore(...)` without
 * needing a direct reference to `io`. The instance is registered once at
 * startup via `setIo(...)` (called from the socket bootstrap in index.ts).
 *
 * Each store has its own namespace (`/store-{storeId}`) — events are never
 * broadcast across stores.
 */
let io: Server | null = null;

/** Register the Socket.io server instance. Called once during startup. */
export function setIo(server: Server): void {
  io = server;
}

/** Returns the registered Socket.io server, or null if not yet initialised. */
export function getIo(): Server | null {
  return io;
}

/**
 * Emit an event to every client connected to a store's namespace.
 * No-ops (with a warning) if the socket server isn't initialised yet, so
 * callers never need to guard against it.
 */
export function emitToStore(storeId: string, event: string, payload: unknown): void {
  if (!io) {
    logger.warn('emitToStore called before Socket.io was initialised', { event, storeId });
    return;
  }
  io.of(`/store-${storeId}`).emit(event, payload);
}
