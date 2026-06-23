import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../types/models';

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

export async function clearStoredTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
