import { create } from 'zustand';
import type { AuthTokens, User } from '../types/models';
import {
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../storage/storage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Persist tokens to MMKV and mark the user authenticated. */
  login: (user: User, tokens: AuthTokens) => void;
  /** Clear tokens from MMKV and reset auth state. */
  logout: () => void;
}

/**
 * Auth state, hydrated from MMKV on startup so RootNavigator can decide between
 * the auth flow and the app tabs without an extra loading round-trip.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: getAccessToken() ?? null,
  refreshToken: getRefreshToken() ?? null,
  isAuthenticated: Boolean(getAccessToken()),

  login: (user, tokens) => {
    setStoredTokens(tokens);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    clearStoredTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
