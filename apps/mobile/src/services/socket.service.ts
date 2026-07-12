import { io, type Socket } from 'socket.io-client';
import { env } from '../config/env';
import { getAccessToken } from '../storage/secureStorage';
import { useAuthStore } from '../store/authStore';
import type { PackageStatus } from '../types/models';

/**
 * Real-time client for the delivery boy app.
 *
 * Connects to the store's per-store Socket.io namespace (`/store-{storeId}`),
 * authenticating with the access token from SecureStore. GPS pings are emitted
 * via `emitLocation`; the dashboard is the consumer of `location:broadcast`.
 *
 * This module deliberately imports neither `gps.service` nor `offlineQueue` —
 * those depend on it, not the other way round — so the dependency graph stays
 * acyclic (socket ← offlineQueue ← gps).
 */

/** `delivery:status` — emitted by the API when a package outcome is recorded. */
export interface DeliveryStatusEvent {
  packageId: string;
  status: PackageStatus;
  boyId: string;
  timestamp: string;
}

/** `session:started` payload. */
export interface SessionStartedEvent {
  sessionId: string;
  boyId: string;
  totalPackages: number;
}

/** `session:completed` payload. */
export interface SessionCompletedEvent {
  sessionId: string;
  boyId: string;
  delivered: number;
  failed: number;
}

type DeliveryStatusHandler = (event: DeliveryStatusEvent) => void;
type SessionEventHandler = (
  type: 'started' | 'completed',
  payload: SessionStartedEvent | SessionCompletedEvent,
) => void;
type ReconnectHandler = () => void;

/** Built-in reconnection: fixed 5s delay, at most 3 attempts (see spec). */
const RECONNECT_DELAY_MS = 5000;
const RECONNECT_ATTEMPTS = 3;

/**
 * Singleton socket manager. Kept as module-level state (not a class instance)
 * to mirror the other service modules in `src/` and to make it trivially
 * shareable across screens.
 */
let socket: Socket | null = null;

// Handlers are held in sets and (re)bound to the live socket on connect, so
// registration order relative to connect() doesn't matter and listeners
// survive reconnection cleanly.
const deliveryStatusHandlers = new Set<DeliveryStatusHandler>();
const sessionEventHandlers = new Set<SessionEventHandler>();
const reconnectHandlers = new Set<ReconnectHandler>();

/** Attach the framework/domain listeners to a freshly-created socket. */
function bindSocketEvents(s: Socket): void {
  s.on('connect', () => {
    console.log(`[socket] connected (${s.id})`);
  });

  s.on('disconnect', (reason) => {
    console.log(`[socket] disconnected: ${reason}`);
  });

  s.on('connect_error', (err) => {
    console.log(`[socket] connect_error: ${err.message}`);
  });

  s.io.on('reconnect_attempt', (attempt) => {
    console.log(`[socket] reconnect attempt ${attempt}/${RECONNECT_ATTEMPTS}`);
  });

  s.io.on('reconnect', (attempt) => {
    console.log(`[socket] reconnected after ${attempt} attempt(s)`);
    // A reconnection means we were offline for a while — let listeners (e.g. the
    // offline location queue) flush anything buffered during the gap.
    reconnectHandlers.forEach((h) => h());
  });

  s.io.on('reconnect_failed', () => {
    console.log(`[socket] reconnect failed after ${RECONNECT_ATTEMPTS} attempts`);
  });

  // Domain events fan out to every registered handler.
  s.on('delivery:status', (payload: DeliveryStatusEvent) => {
    deliveryStatusHandlers.forEach((h) => h(payload));
  });
  s.on('session:started', (payload: SessionStartedEvent) => {
    sessionEventHandlers.forEach((h) => h('started', payload));
  });
  s.on('session:completed', (payload: SessionCompletedEvent) => {
    sessionEventHandlers.forEach((h) => h('completed', payload));
  });
}

/**
 * Open a connection to the current user's store namespace. No-ops if already
 * connected. The store id and auth token are read from the auth layer, so
 * callers just need to be logged in.
 */
export function connect(): void {
  if (socket?.connected) {
    console.log('[socket] connect() ignored — already connected');
    return;
  }

  const { user } = useAuthStore.getState();
  const storeId = user?.storeId;
  if (!storeId) {
    console.log('[socket] connect() skipped — no storeId on current user');
    return;
  }

  // Tear down any stale (disconnected) instance before creating a new one.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(`${env.SOCKET_URL}/store-${storeId}`, {
    // `auth` as a function is re-invoked on every (re)connection attempt, so a
    // token refreshed mid-session is picked up automatically. Fall back to the
    // in-memory token if SecureStore is momentarily unavailable.
    auth: async (cb) => {
      const token = (await getAccessToken()) ?? useAuthStore.getState().accessToken;
      cb({ token: token ?? '' });
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY_MS,
    reconnectionDelayMax: RECONNECT_DELAY_MS,
    randomizationFactor: 0,
  });

  bindSocketEvents(socket);
  console.log(`[socket] connecting to /store-${storeId}`);
}

/** Cleanly close the connection and drop the instance. */
export function disconnect(): void {
  if (!socket) return;
  console.log('[socket] disconnecting');
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/** Whether the socket is currently connected. */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Emit a `location:update` for the current delivery boy. `timestamp` defaults
 * to now; the offline queue passes the ping's original capture time so a
 * flushed backlog keeps accurate timestamps.
 */
export function emitLocation(
  lat: number,
  lng: number,
  timestamp: string = new Date().toISOString(),
): void {
  const boyId = useAuthStore.getState().user?.id;
  if (!socket?.connected || !boyId) {
    console.log('[socket] emitLocation skipped — not connected or no user');
    return;
  }
  socket.emit('location:update', { boyId, lat, lng, timestamp });
}

/**
 * Subscribe to `delivery:status` events. Returns an unsubscribe function.
 */
export function onDeliveryStatus(callback: DeliveryStatusHandler): () => void {
  deliveryStatusHandlers.add(callback);
  return () => deliveryStatusHandlers.delete(callback);
}

/**
 * Subscribe to `session:started` + `session:completed` events. The callback
 * receives the event type and its payload. Returns an unsubscribe function.
 */
export function onSessionEvents(callback: SessionEventHandler): () => void {
  sessionEventHandlers.add(callback);
  return () => sessionEventHandlers.delete(callback);
}

/**
 * Register a callback fired after the socket reconnects following a drop.
 * Used to flush the offline location queue. Returns an unsubscribe function.
 */
export function onReconnect(callback: ReconnectHandler): () => void {
  reconnectHandlers.add(callback);
  return () => reconnectHandlers.delete(callback);
}
