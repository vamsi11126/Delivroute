import { create } from 'zustand';
import type { AuthTokens, User } from '../types/models';
import {
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../storage/secureStorage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** False until tokens have been read back from SecureStore on startup. */
  isHydrated: boolean;
  /** Load persisted tokens from SecureStore (called once on app launch). */
  hydrate: () => Promise<void>;
  /** Persist tokens to SecureStore and mark the user authenticated. */
  login: (user: User, tokens: AuthTokens) => Promise<void>;
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
      isHydrated: true,
    });
  },

  login: async (user, tokens) => {
    await setStoredTokens(tokens);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await clearStoredTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
