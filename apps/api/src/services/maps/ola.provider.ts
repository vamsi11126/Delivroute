import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { LatLng, MapProvider, RouteResult } from './types';

const GEOCODE_URL = 'https://api.olamaps.io/places/v1/geocode';
const AUTOCOMPLETE_URL = 'https://api.olamaps.io/places/v1/autocomplete';
const MATRIX_URL = 'https://api.olamaps.io/routing/v1/distanceMatrix';
const DIRECTIONS_URL = 'https://api.olamaps.io/routing/v1/directions';

const unavailable = (msg: string) => new ApiError(503, 'MAP_API_UNAVAILABLE', msg);

/** Encodes a list of coordinates as `lat,lng|lat,lng` for Ola Maps params. */
function joinLatLng(points: LatLng[]): string {
  return points.map((p) => `${p.lat},${p.lng}`).join('|');
}

interface OlaGeocodeResult {
  geometry?: { location?: { lat?: number; lng?: number } };
}

interface OlaMatrixElement {
  status?: string;
  /** Travel time in seconds — some Ola responses nest it as { value }. */
  duration?: number | { value?: number };
}

interface OlaRouteLeg {
  distance?: number | { value?: number };
  duration?: number | { value?: number };
}

/** Ola nests some numeric fields as `{ value }` depending on endpoint version. */
function numberOrValue(v: number | { value?: number } | undefined): number | null {
  if (typeof v === 'number') return v;
  if (v && typeof v.value === 'number') return v.value;
  return null;
}

/**
 * Ola Maps implementation of MapProvider. Active when MAP_PROVIDER=ola.
 * Requires OLA_MAPS_API_KEY. Better coverage of Indian addresses (small towns,
 * landmarks) than OSM. All calls are server-side only.
 */
export class OlaMapsProvider implements MapProvider {
  constructor(private readonly apiKey: string) {}

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        throw unavailable(`Ola Maps responded ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.error('Ola Maps request failed', { error: (err as Error).message });
      throw unavailable('Ola Maps API request failed');
    }
  }

  async geocode(address: string): Promise<LatLng> {
    const url =
      `${GEOCODE_URL}?address=${encodeURIComponent(address)}` +
      `&api_key=${encodeURIComponent(this.apiKey)}`;
    // The documented payload key is `geocodingResults`; accept `results` too.
    const data = await this.fetchJson<{
      geocodingResults?: OlaGeocodeResult[];
      results?: OlaGeocodeResult[];
    }>(url);

    const location = (data.geocodingResults ?? data.results ?? [])[0]?.geometry?.location;
    if (typeof location?.lat !== 'number' || typeof location.lng !== 'number') {
      throw new ApiError(400, 'VALIDATION_ERROR', `Could not geocode address: ${address}`);
    }
    return { lat: location.lat, lng: location.lng };
  }

  async autocomplete(query: string): Promise<string[]> {
    const url =
      `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}` +
      `&api_key=${encodeURIComponent(this.apiKey)}&language=en`;
    const data = await this.fetchJson<{ predictions?: { description?: string }[] }>(url);
    return (data.predictions ?? [])
      .map((p) => p.description ?? '')
      .filter((d) => d.length > 0);
  }

  async distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    const data = await this.fetchJson<{
      rows?: { elements?: OlaMatrixElement[] }[];
    }>(MATRIX_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origins: joinLatLng(origins),
        destinations: joinLatLng(destinations),
      }),
    });

    const rows = data.rows;
    if (!rows || rows.length !== origins.length) {
      throw unavailable('Ola distance matrix returned an unexpected shape');
    }
    return rows.map((row) =>
      (row.elements ?? []).map((el) => {
        const seconds = numberOrValue(el.duration);
        return el.status !== undefined && el.status !== 'OK'
          ? Number.POSITIVE_INFINITY
          : seconds ?? Number.POSITIVE_INFINITY;
      }),
    );
  }

  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const url =
      `${DIRECTIONS_URL}?origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      `&api_key=${encodeURIComponent(this.apiKey)}`;
    const data = await this.fetchJson<{
      routes?: {
        overview_polyline?: string | { points?: string };
        legs?: OlaRouteLeg[];
      }[];
    }>(url, { method: 'POST' });

    const route = data.routes?.[0];
    if (!route || !route.legs?.length) {
      throw unavailable('Ola directions returned no route');
    }
    const distanceMeters = route.legs.reduce(
      (sum, leg) => sum + (numberOrValue(leg.distance) ?? 0),
      0,
    );
    const durationSeconds = route.legs.reduce(
      (sum, leg) => sum + (numberOrValue(leg.duration) ?? 0),
      0,
    );
    const geometry =
      typeof route.overview_polyline === 'string'
        ? route.overview_polyline
        : route.overview_polyline?.points ?? null;
    return { distanceMeters, durationSeconds, geometry };
  }
}
