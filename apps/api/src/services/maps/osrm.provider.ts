import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { LatLng, MapProvider, RouteResult } from './types';

const NOMINATIM_URL = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
const OSRM_URL = process.env.OSRM_URL ?? 'https://router.project-osrm.org';

const unavailable = (msg: string) => new ApiError(503, 'MAP_API_UNAVAILABLE', msg);

/** OSRM expects `lng,lat;lng,lat` (note the reversed order vs Google). */
function joinCoords(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(';');
}

/**
 * OpenStreetMap implementation of MapProvider. Active when MAP_PROVIDER=osm.
 * Geocoding/autocomplete via Nominatim; matrix/routing via OSRM. No API key
 * required, but a descriptive User-Agent is sent per Nominatim usage policy.
 */
export class OSRMProvider implements MapProvider {
  private async fetchJson<T>(url: string): Promise<T> {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'DelivRoute/1.0' } });
      if (!res.ok) {
        throw unavailable(`OSM/OSRM responded ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.error('OSM/OSRM request failed', { error: (err as Error).message });
      throw unavailable('OSM/OSRM API request failed');
    }
  }

  async geocode(address: string): Promise<LatLng> {
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const data = await this.fetchJson<{ lat: string; lon: string }[]>(url);
    const hit = data[0];
    if (!hit) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Could not geocode address: ${address}`);
    }
    return { lat: Number(hit.lat), lng: Number(hit.lon) };
  }

  async autocomplete(query: string): Promise<string[]> {
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const data = await this.fetchJson<{ display_name: string }[]>(url);
    return data.map((d) => d.display_name);
  }

  async distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    // OSRM `table` takes one coordinate list with sources/destinations indices.
    const all = [...origins, ...destinations];
    const sources = origins.map((_, i) => i).join(';');
    const destinations_ = destinations.map((_, i) => origins.length + i).join(';');
    const url =
      `${OSRM_URL}/table/v1/driving/${joinCoords(all)}` +
      `?sources=${sources}&destinations=${destinations_}`;
    const data = await this.fetchJson<{ code: string; durations?: number[][] }>(url);

    if (data.code !== 'Ok' || !data.durations) {
      throw unavailable(`OSRM table status: ${data.code}`);
    }
    // OSRM may emit null for unreachable pairs — normalise to Infinity.
    return data.durations.map((row) =>
      row.map((v) => (v === null ? Number.POSITIVE_INFINITY : v)),
    );
  }

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const url =
      `${OSRM_URL}/route/v1/driving/${joinCoords([origin, destination])}` +
      `?overview=full&geometries=polyline`;
    const data = await this.fetchJson<{
      code: string;
      routes: { distance: number; duration: number; geometry: string }[];
    }>(url);

    const route = data.routes[0];
    if (data.code !== 'Ok' || !route) {
      throw unavailable(`OSRM route status: ${data.code}`);
    }
    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry ?? null,
    };
  }
}
