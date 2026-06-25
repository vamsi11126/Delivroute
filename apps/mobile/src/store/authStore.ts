import { create } from 'zustand';
import type { AuthTokens, User } from '../types/models';
import {
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../storage/secureStorage';

interface LoginOptions {
  /**
   * Whether onboarding (profile + permissions) is already done. Returning users
   * pass `true` and land straight on the app; first-time users pass `false` so
   * RootNavigator keeps them in the onboarding stack until `completeOnboarding`.
   * Defaults to `true`.
   */
  onboardingComplete?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /**
   * Gates the swap to AppTabs. A first-time user is authenticated (tokens saved)
   * but still finishing SetProfile/Permissions, so this stays false until those
   * steps complete. Anyone with persisted tokens is treated as already onboarded.
   */
  onboardingComplete: boolean;
  /** False until tokens have been read back from SecureStore on startup. */
  isHydrated: boolean;
  /** Load persisted tokens from SecureStore (called once on app launch). */
  hydrate: () => Promise<void>;
  /** Persist tokens to SecureStore and mark the user authenticated. */
  login: (user: User, tokens: AuthTokens, options?: LoginOptions) => Promise<void>;
  /** Patch the in-memory user (e.g. after the profile is saved). */
  setUser: (user: User) => void;
  /** Mark onboarding done so RootNavigator swaps to AppTabs. */
  completeOnboarding: () => void;
  /** Clear tokens from SecureStore and reset auth state. */
  logout: () => Promise<void>;
}

/**
 * Auth state. SecureStore is async, so unlike the old MMKV-backed store we can't
 * hydrate synchronously at module load — RootNavigator calls `hydrate()` on
 * mount and shows a splash until `isHydrated` flips true.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  onboardingComplete: false,
  isHydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
    ]);
    set({
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken),
      // Tokens on disk mean this user already finished onboarding previously.
      onboardingComplete: Boolean(accessToken),
      isHydrated: true,
    });
  },

  login: async (user, tokens, options) => {
    await setStoredTokens(tokens);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      onboardingComplete: options?.onboardingComplete ?? true,
    });
  },

  setUser: (user) => set({ user }),

  completeOnboarding: () => set({ onboardingComplete: true }),

  logout: async () => {
    await clearStoredTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      onboardingComplete: false,
    });
  },
}));
