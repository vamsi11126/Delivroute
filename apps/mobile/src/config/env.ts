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

export const env = {
  API_URL: extra.apiUrl ?? 'http://localhost:4000/v1',
  MAP_PROVIDER: (extra.mapProvider ?? 'osm') as MapProvider,
  GOOGLE_MAPS_API_KEY: extra.googleMapsApiKey ?? '',
} as const;
