import { MMKV } from 'react-native-mmkv';
import type { AuthTokens } from '../types/models';

/** Single app-wide MMKV instance (synchronous key-value storage). */
export const storage = new MMKV({ id: 'delivroute' });

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export function getAccessToken(): string | undefined {
  return storage.getString(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | undefined {
  return storage.getString(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(tokens: AuthTokens): void {
  storage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/** Update only the access token (used after a silent refresh). */
export function setAccessToken(accessToken: string): void {
  storage.set(ACCESS_TOKEN_KEY, accessToken);
}

export function clearStoredTokens(): void {
  storage.delete(ACCESS_TOKEN_KEY);
  storage.delete(REFRESH_TOKEN_KEY);
}
