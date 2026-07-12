import * as SecureStore from 'expo-secure-store';
import type { AuthTokens, User } from '../types/models';

/**
 * Token persistence backed by expo-secure-store (Keychain on iOS, Keystore /
 * EncryptedSharedPreferences on Android). All operations are async — unlike the
 * old synchronous MMKV layer — so callers must await them and the app hydrates
 * auth state on startup (see authStore.hydrate).
 *
 * SecureStore keys may only contain alphanumerics, ".", "-" and "_".
 */
const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const USER_KEY = 'auth.user';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setStoredTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/** Update only the access token (used after a silent refresh). */
export async function setAccessToken(accessToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
}

/**
 * Persist the authenticated user (incl. storeId) so it survives an app
 * restart. Without this, hydrate() would restore tokens but leave `user` null,
 * and anything that reads `user.storeId` (e.g. the socket namespace) breaks for
 * returning users.
 */
export async function setStoredUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/** Read the persisted user, or null if none / corrupt. */
export async function getStoredUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function clearStoredTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
