import * as Location from 'expo-location';
import * as socketService from './socket.service';
import { addToQueue } from '../utils/offlineQueue';
import { useSessionStore } from '../store/sessionStore';

/**
 * Foreground GPS tracking for an active delivery session.
 *
 * A single `watchPositionAsync` subscription pushes a fix every ~30s while the
 * app is in the foreground. Each fix is emitted to the store's socket namespace
 * and mirrored into `sessionStore` (so the map/UI can show the boy's position).
 * When the socket is down the ping is buffered via the offline queue instead.
 *
 * Background tracking is intentionally NOT used — expo-location pauses updates
 * when the app is backgrounded or the phone is locked, which is exactly what we
 * want here: 30s foreground pings are sufficient and avoid the extra
 * permissions / battery cost of a background location service.
 */

/** Position watch cadence — matches the 30s GPS ping in the spec. */
const TIME_INTERVAL_MS = 30000;

/** Only report movement past this many metres between fixes (noise filter). */
const DISTANCE_INTERVAL_M = 10;

let watcher: Location.LocationSubscription | null = null;

/** Push a single fix out to the socket (or the offline queue) + local store. */
function handleFix(lat: number, lng: number): void {
  const timestamp = new Date().toISOString();

  // Mirror into session state for the map / live UI regardless of connectivity.
  useSessionStore.getState().setCurrentLocation(lat, lng);

  if (socketService.isConnected()) {
    socketService.emitLocation(lat, lng, timestamp);
  } else {
    // Buffer for replay when the socket comes back (fire-and-forget).
    void addToQueue(lat, lng, timestamp);
  }
}

/**
 * Begin watching the device position. Requests foreground location permission
 * first; resolves to `false` (and tracks nothing) if it's denied. Idempotent —
 * calling it while already tracking returns the existing subscription.
 */
export async function startTracking(): Promise<Location.LocationSubscription | null> {
  if (watcher) {
    console.log('[gps] startTracking() ignored — already tracking');
    return watcher;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    console.log('[gps] foreground location permission not granted — not tracking');
    return null;
  }

  watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: TIME_INTERVAL_MS,
      distanceInterval: DISTANCE_INTERVAL_M,
    },
    (position) => {
      handleFix(position.coords.latitude, position.coords.longitude);
    },
  );

  console.log('[gps] tracking started');
  return watcher;
}

/** Stop the position watcher (safe to call when not tracking). */
export function stopTracking(): void {
  if (!watcher) return;
  watcher.remove();
  watcher = null;
  console.log('[gps] tracking stopped');
}

/** Whether the position watcher is currently active. */
export function isTracking(): boolean {
  return watcher !== null;
}

/**
 * One-shot current position, used for route optimisation (PackageEntryScreen).
 * Assumes permission was already ensured by the caller; throws otherwise so the
 * caller can surface a clear "enable location" message.
 */
export async function getCurrentLocation(): Promise<Location.LocationObject> {
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}
