import Constants from 'expo-constants';

export type MapProvider = 'google' | 'osm';

interface ExtraConfig {
  apiUrl?: string;
  mapProvider?: MapProvider;
  googleMapsApiKey?: string;
}

/**
 * The values declared in `.env` are injected into `app.config.ts` → `extra` at
 * build time and read here at runtime via expo-constants. Import `env`
 * everywhere instead of touching `Constants` directly.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

const API_URL = extra.apiUrl ?? 'http://localhost:4000/v1';

/**
 * Socket.io connects to the bare server origin, not the REST base — strip the
 * trailing `/v1` (or any `/vN`) so `${SOCKET_URL}/store-{storeId}` targets the
 * per-store namespace rather than `/v1/store-...`.
 */
const SOCKET_URL = API_URL.replace(/\/v\d+\/?$/, '');

export const env = {
  API_URL,
  SOCKET_URL,
  MAP_PROVIDER: (extra.mapProvider ?? 'osm') as MapProvider,
  GOOGLE_MAPS_API_KEY: extra.googleMapsApiKey ?? '',
} as const;
