import { logger } from '../../utils/logger';
import { GoogleMapsProvider } from './google.provider';
import { OSRMProvider } from './osrm.provider';
import type { MapProvider } from './types';

export type { LatLng, MapProvider, RouteResult } from './types';

let provider: MapProvider | null = null;

/**
 * Returns the configured MapProvider singleton, chosen by the MAP_PROVIDER env
 * var ("google" or "osm"). Created lazily on first use.
 */
export function getMapProvider(): MapProvider {
  if (provider) return provider;

  const choice = (process.env.MAP_PROVIDER ?? 'osm').toLowerCase();
  if (choice === 'google') {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_MAPS_API_KEY is required when MAP_PROVIDER=google');
    }
    provider = new GoogleMapsProvider(key);
  } else {
    provider = new OSRMProvider();
  }

  logger.info(`Map provider initialised: ${choice}`);
  return provider;
}
