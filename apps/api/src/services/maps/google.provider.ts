import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { LatLng, MapProvider, RouteResult } from './types';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

const unavailable = (msg: string) => new ApiError(503, 'MAP_API_UNAVAILABLE', msg);

/** Encodes a list of coordinates as `lat,lng|lat,lng` for Google query params. */
function joinLatLng(points: LatLng[]): string {
  return points.map((p) => `${p.lat},${p.lng}`).join('|');
}

/**
 * Google Maps implementation of MapProvider. Active when MAP_PROVIDER=google.
 * Requires GOOGLE_MAPS_API_KEY. All calls are server-side only.
 */
export class GoogleMapsProvider implements MapProvider {
  constructor(private readonly apiKey: string) {}

  private async fetchJson<T>(url: string): Promise<T> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw unavailable(`Google Maps responded ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.error('Google Maps request failed', { error: (err as Error).message });
      throw unavailable('Google Maps API request failed');
    }
  }

  async geocode(address: string): Promise<LatLng> {
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const data = await this.fetchJson<{
      status: string;
      results: { geometry: { location: { lat: number; lng: number } } }[];
    }>(url);

    const location = data.results[0]?.geometry?.location;
    if (data.status !== 'OK' || !location) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Could not geocode address: ${address}`);
    }
    return { lat: location.lat, lng: location.lng };
  }

  async autocomplete(query: string): Promise<string[]> {
    const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}&key=${this.apiKey}`;
    const data = await this.fetchJson<{ predictions: { description: string }[] }>(url);
    return (data.predictions ?? []).map((p) => p.description);
  }

  async distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    const url =
      `${MATRIX_URL}?origins=${encodeURIComponent(joinLatLng(origins))}` +
      `&destinations=${encodeURIComponent(joinLatLng(destinations))}&key=${this.apiKey}`;
    const data = await this.fetchJson<{
      status: string;
      rows: { elements: { status: string; duration?: { value: number } }[] }[];
    }>(url);

    if (data.status !== 'OK') {
      throw unavailable(`Google distance matrix status: ${data.status}`);
    }
    return data.rows.map((row) =>
      row.elements.map((el) =>
        el.status === 'OK' && el.duration ? el.duration.value : Number.POSITIVE_INFINITY,
      ),
    );
  }

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const url =
      `${DIRECTIONS_URL}?origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}&key=${this.apiKey}`;
    const data = await this.fetchJson<{
      status: string;
      routes: {
        overview_polyline?: { points: string };
        legs: { distance: { value: number }; duration: { value: number } }[];
      }[];
    }>(url);

    const route = data.routes[0];
    if (data.status !== 'OK' || !route) {
      throw unavailable(`Google directions status: ${data.status}`);
    }
    const distanceMeters = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const durationSeconds = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);
    return { distanceMeters, durationSeconds, geometry: route.overview_polyline?.points ?? null };
  }
}
