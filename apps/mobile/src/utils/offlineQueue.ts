import * as SecureStore from 'expo-secure-store';
import * as socketService from '../services/socket.service';

/**
 * Offline buffer for GPS pings.
 *
 * When the socket is down (no connectivity, backgrounded app, server blip) a
 * location update can't be emitted, so it's persisted here instead. On the next
 * successful reconnect, `flushQueue` replays every buffered ping — with its
 * *original* capture timestamp, so the dashboard's history stays accurate —
 * and clears the store.
 *
 * Backed by expo-secure-store (same async storage layer as the auth tokens);
 * the whole queue lives under one key as a JSON array.
 */
const QUEUE_KEY = 'pendingLocations';

/**
 * Cap the buffer so a long offline stretch can't grow it without bound (and
 * SecureStore has a per-item size limit). At one ping / 30s this holds ~4h of
 * history; older pings are dropped oldest-first.
 */
const MAX_QUEUE_SIZE = 500;

export interface PendingLocation {
  lat: number;
  lng: number;
  timestamp: string;
}

/** Read the queue, tolerating an empty or corrupt store (returns []). */
async function readQueue(): Promise<PendingLocation[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingLocation[]) : [];
  } catch (err) {
    console.log(`[offlineQueue] read failed, resetting: ${(err as Error).message}`);
    return [];
  }
}

/** Persist the queue (or delete the key entirely when empty). */
async function writeQueue(queue: PendingLocation[]): Promise<void> {
  if (queue.length === 0) {
    await SecureStore.deleteItemAsync(QUEUE_KEY);
    return;
  }
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Append a ping to the offline queue. `timestamp` defaults to now but should be
 * the moment the fix was taken so replay preserves ordering.
 */
export async function addToQueue(
  lat: number,
  lng: number,
  timestamp: string = new Date().toISOString(),
): Promise<void> {
  const queue = await readQueue();
  queue.push({ lat, lng, timestamp });
  // Keep only the most recent MAX_QUEUE_SIZE entries (drop oldest).
  const trimmed = queue.length > MAX_QUEUE_SIZE ? queue.slice(-MAX_QUEUE_SIZE) : queue;
  await writeQueue(trimmed);
  console.log(`[offlineQueue] buffered ping (${trimmed.length} pending)`);
}

/** How many pings are currently buffered. */
export async function queueSize(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Replay every buffered ping through the socket, then clear the queue. No-ops
 * when the socket isn't connected (the pings stay buffered for the next try),
 * so it's safe to call optimistically on reconnect.
 */
export async function flushQueue(): Promise<void> {
  if (!socketService.isConnected()) {
    console.log('[offlineQueue] flush skipped — socket not connected');
    return;
  }

  const queue = await readQueue();
  if (queue.length === 0) return;

  console.log(`[offlineQueue] flushing ${queue.length} buffered ping(s)`);
  for (const { lat, lng, timestamp } of queue) {
    socketService.emitLocation(lat, lng, timestamp);
  }
  await writeQueue([]);
}
