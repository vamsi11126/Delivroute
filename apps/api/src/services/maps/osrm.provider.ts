import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { LatLng, MapProvider, RouteResult } from './types';

const NOMINATIM_URL = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
const OSRM_URL = process.env.OSRM_URL ?? 'https://router.project-osrm.org';

/**
 * Sent on every Nominatim request per their usage policy, which requires a
 * descriptive User-Agent identifying the application and a contact address.
 */
const NOMINATIM_USER_AGENT = 'DelivRoute/1.0 (contact@delivroute.com)';

/** Nominatim's public endpoint allows at most ~1 request/second. */
const GEOCODE_RETRY_DELAY_MS = 1000;

const unavailable = (msg: string) => new ApiError(503, 'MAP_API_UNAVAILABLE', msg);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** OSRM expects `lng,lat;lng,lat` (note the reversed order vs Google). */
function joinCoords(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(';');
}

/** Collapse runs of whitespace/newlines (common in pasted addresses) to single spaces. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Common misspellings of Indian state names that cause Nominatim to miss.
 * Whole-word, case-insensitive — corrections only, no risky abbreviations.
 */
const STATE_FIXES: [RegExp, string][] = [
  [/\bmaharastra\b/gi, 'Maharashtra'],
  [/\bkarnatka\b/gi, 'Karnataka'],
  [/\btamilnadu\b/gi, 'Tamil Nadu'],
  [/\btelengana\b/gi, 'Telangana'],
  [/\bpondicherry\b/gi, 'Puducherry'],
  [/\borissa\b/gi, 'Odisha'],
];

function fixStateNames(value: string): string {
  return STATE_FIXES.reduce((acc, [re, replacement]) => acc.replace(re, replacement), value);
}

/**
 * Build a coarse "city/area, India" query from a full address: keep the last
 * couple of comma-separated segments (typically area + city), drop house/street
 * detail and any 6-digit pincode, then anchor the search to India.
 */
function cityAreaFallback(value: string): string {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';

  const tail = parts
    .slice(-2)
    .map((p) => p.replace(/\b\d{6}\b/g, '').trim())
    .filter(Boolean);
  const base = (tail.length ? tail : parts.slice(-1)).join(', ');
  if (!base) return '';
  return /\bindia\b/i.test(base) ? base : `${base}, India`;
}

/**
 * OpenStreetMap implementation of MapProvider. Active when MAP_PROVIDER=osm.
 * Geocoding/autocomplete via Nominatim; matrix/routing via OSRM. No API key
 * required, but a descriptive User-Agent is sent per Nominatim usage policy.
 */
export class OSRMProvider implements MapProvider {
  private async fetchJson<T>(url: string): Promise<T> {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
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

  /** Single Nominatim lookup. Returns null when no match is found (vs a transport error). */
  private async searchOne(query: string): Promise<LatLng | null> {
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const data = await this.fetchJson<{ lat: string; lon: string }[]>(url);
    const hit = data[0];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  }

  async geocode(address: string): Promise<LatLng> {
    const normalized = fixStateNames(collapseWhitespace(address));
    const cityOnly = cityAreaFallback(normalized);

    // Progressively looser attempts, most specific first: the address as given,
    // a whitespace/state-name-cleaned version, then just city/area + India.
    // Deduplicated so identical variants don't waste a request (or a delay).
    const attempts = [address, normalized, cityOnly].filter(
      (q, i, arr) => q.length > 0 && arr.indexOf(q) === i,
    );

    for (let i = 0; i < attempts.length; i++) {
      const query = attempts[i];
      // Space attempts out to respect Nominatim's ~1 req/sec rate limit.
      if (i > 0) await delay(GEOCODE_RETRY_DELAY_MS);
      logger.debug('Geocoding attempt', { attempt: i + 1, of: attempts.length, query });
      const hit = await this.searchOne(query);
      if (hit) return hit;
    }

    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Could not find this address. Please check the spelling or add more detail (city, state).',
    );
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
