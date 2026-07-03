import { create } from 'zustand';
import * as Location from 'expo-location';

interface PermissionState {
  /**
   * Foreground location permission as the app last observed it.
   * `null` = not determined yet, `true` = granted, `false` = denied/skipped.
   */
  locationGranted: boolean | null;
  setLocationGranted: (granted: boolean) => void;
  /**
   * Re-read the live OS foreground-location permission and update the cached
   * flag. Use this when a screen gains focus so the cached state never drifts
   * from what the user set in OS Settings. Returns the live value.
   */
  syncLocationPermission: () => Promise<boolean>;
  /**
   * Ensure foreground location is usable right now: read the live OS status,
   * and if it isn't granted, request it. When the OS has already granted the
   * permission (e.g. the user enabled it in Settings after skipping onboarding)
   * the request resolves immediately to granted with no dialog, which is what
   * reconciles a stale cached "denied" with reality. Updates the cached flag
   * and returns whether location is granted.
   */
  ensureLocationPermission: () => Promise<boolean>;
}

/**
 * Tracks runtime permission state so a persistent warning banner can be shown
 * across the app (e.g. when the user skips location access during onboarding).
 * Permission-sensitive flows should call `ensureLocationPermission()` at the
 * moment of use rather than trusting the cached `locationGranted` flag, which
 * can lag behind changes made in OS Settings.
 */
export const usePermissionStore = create<PermissionState>((set) => ({
  locationGranted: null,
  setLocationGranted: (granted) => set({ locationGranted: granted }),
  syncLocationPermission: async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    const granted = status === Location.PermissionStatus.GRANTED;
    set({ locationGranted: granted });
    return granted;
  },
  ensureLocationPermission: async () => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
    const granted = status === Location.PermissionStatus.GRANTED;
    set({ locationGranted: granted });
    return granted;
  },
}));
