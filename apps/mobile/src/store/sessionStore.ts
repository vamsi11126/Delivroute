import { create } from 'zustand';
import type { DeliverySession, Package } from '../types/models';

interface SessionState {
  currentSession: DeliverySession | null;
  /** All packages for the session (insertion order). */
  packages: Package[];
  /** Packages sorted by the optimiser's orderIndex (delivery order). */
  orderedPackages: Package[];
  /** Latest GPS fix for the boy, mirrored from the GPS tracker (null = none yet). */
  currentLat: number | null;
  currentLng: number | null;
  /** Whether live GPS tracking is currently running for this session. */
  isTracking: boolean;
  /** Set the active session + its packages (e.g. after fetch/optimise). */
  startSession: (session: DeliverySession, packages?: Package[]) => void;
  /** Patch a single package by id and re-derive the ordered list. */
  updatePackage: (packageId: string, patch: Partial<Package>) => void;
  /** Record the boy's latest GPS position (called on each tracking fix). */
  setCurrentLocation: (lat: number, lng: number) => void;
  /** Flag whether live tracking is on. */
  setTracking: (isTracking: boolean) => void;
  /** Clear all session state (on End Session / logout). */
  reset: () => void;
}

/** Sort a copy of the packages by orderIndex ascending. */
function sortByOrder(packages: Package[]): Package[] {
  return [...packages].sort((a, b) => a.orderIndex - b.orderIndex);
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  packages: [],
  orderedPackages: [],
  currentLat: null,
  currentLng: null,
  isTracking: false,

  startSession: (session, packages = []) =>
    set({
      currentSession: session,
      packages,
      orderedPackages: sortByOrder(packages),
    }),

  updatePackage: (packageId, patch) =>
    set((state) => {
      const packages = state.packages.map((p) =>
        p.id === packageId ? { ...p, ...patch } : p,
      );
      return { packages, orderedPackages: sortByOrder(packages) };
    }),

  setCurrentLocation: (lat, lng) => set({ currentLat: lat, currentLng: lng }),

  setTracking: (isTracking) => set({ isTracking }),

  reset: () =>
    set({
      currentSession: null,
      packages: [],
      orderedPackages: [],
      currentLat: null,
      currentLng: null,
      isTracking: false,
    }),
}));
