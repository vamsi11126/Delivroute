import { create } from 'zustand';

interface PermissionState {
  /**
   * Foreground location permission as the app last observed it.
   * `null` = not determined yet, `true` = granted, `false` = denied/skipped.
   */
  locationGranted: boolean | null;
  setLocationGranted: (granted: boolean) => void;
}

/**
 * Tracks runtime permission state so a persistent warning banner can be shown
 * across the app (e.g. when the user skips location access during onboarding).
 */
export const usePermissionStore = create<PermissionState>((set) => ({
  locationGranted: null,
  setLocationGranted: (granted) => set({ locationGranted: granted }),
}));
