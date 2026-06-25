import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import {
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../storage/secureStorage';
import { useAuthStore } from '../store/authStore';
import type { AuthTokens } from '../types/models';

/** Standard API response envelope used by the backend. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

/** Axios config flagged so a request is only ever retried once after a refresh. */
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Bypass ngrok's HTML interstitial so the API always returns raw JSON
    // (the warning page would otherwise break response parsing in dev).
    'ngrok-skip-browser-warning': 'true',
  },
});

// ── Request interceptor: attach the bearer token from SecureStore ────────────
// SecureStore reads are async, so this interceptor is async too (axios awaits it).
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ── Refresh single-flight ────────────────────────────────────────────────────
// While a refresh is in progress, queue concurrent 401s onto the same promise
// so we only hit /auth/refresh once.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // Bare axios (not apiClient) so this call skips the interceptors above.
  const { data } = await axios.post<ApiEnvelope<AuthTokens>>(
    `${env.API_URL}/auth/refresh`,
    { refreshToken },
    { timeout: 15000 },
  );

  const tokens = data.data;
  await setStoredTokens(tokens);
  useAuthStore.setState({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    isAuthenticated: true,
  });
  return tokens.accessToken;
}

// ── Response interceptor: refresh on 401, retry once, else log out ───────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newAccessToken = await refreshPromise;
      refreshPromise = null;

      original.headers = AxiosHeaders.from(original.headers);
      original.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return apiClient(original as AxiosRequestConfig);
    } catch (refreshError) {
      refreshPromise = null;
      await clearStoredTokens();
      await useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  },
);
