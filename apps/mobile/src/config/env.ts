import { API_URL, MAP_PROVIDER, GOOGLE_MAPS_API_KEY } from '@env';

export type MapProvider = 'google' | 'osm';

/**
 * Typed, defaulted access to the values declared in `.env` (read at build time
 * via react-native-dotenv). Import `env` everywhere instead of `@env` directly.
 */
export const env = {
  API_URL: API_URL || 'http://localhost:4000/v1',
  MAP_PROVIDER: (MAP_PROVIDER as MapProvider) || 'osm',
  GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY || '',
} as const;
