/**
 * Address autocomplete backed by the free Photon API (photon.komoot.io,
 * OSM-based), with a Nominatim fallback for thin coverage areas. Called
 * directly from the app — no API key, no backend hop. Results carry lat/lng,
 * so a selected suggestion never needs server-side geocoding at submit time.
 */

export interface AddressResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** Rough bounding box for India: minLon,minLat,maxLon,maxLat. */
const INDIA_BBOX = '68.1,8.0,97.4,37.6';
/** Location bias — Tadipatri, Andhra Pradesh (where the delivery fleet runs). */
const BIAS_LAT = 14.9;
const BIAS_LON = 78.0;
const MIN_QUERY_LENGTH = 3;
/** Below this many Photon hits, Nominatim is queried too and results merged. */
const FALLBACK_THRESHOLD = 3;

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface NominatimResult {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
}

/**
 * Build a readable single-line address from Photon's sparse properties, e.g.
 * "Bus Stand, Tadipatri, Andhra Pradesh". Empty parts and immediate
 * duplicates (name often repeats street/city) are skipped.
 */
function buildDisplayName(p: PhotonFeature['properties']): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const parts = [p.name, street, p.district, p.city, p.state, p.postcode];
  return parts
    .filter((part): part is string => Boolean(part))
    .filter((part, i, arr) => arr.indexOf(part) === i)
    .join(', ');
}

async function searchPhoton(query: string): Promise<AddressResult[]> {
  try {
    const url =
      `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=10&lang=en` +
      `&lat=${BIAS_LAT}&lon=${BIAS_LON}&bbox=${INDIA_BBOX}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = (await res.json()) as { features?: PhotonFeature[] };
    return (json.features ?? [])
      .filter((f) => Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length >= 2)
      .map((f) => ({
        placeId: String(f.properties.osm_id ?? ''),
        displayName: buildDisplayName(f.properties),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }))
      .filter((r) => r.displayName.length > 0);
  } catch {
    return [];
  }
}

async function searchNominatim(query: string): Promise<AddressResult[]> {
  try {
    const url =
      `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DelivRoute/1.0' } });
    if (!res.ok) return [];

    const json = (await res.json()) as NominatimResult[];
    if (!Array.isArray(json)) return [];
    return json
      .filter((r) => r.display_name && r.lat && r.lon)
      .map((r) => ({
        placeId: String(r.place_id ?? ''),
        displayName: r.display_name as string,
        lat: Number(r.lat),
        lng: Number(r.lon),
      }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  } catch {
    return [];
  }
}

/**
 * Search addresses — Photon first (biased toward the Tadipatri, AP region),
 * topped up with Nominatim when Photon's coverage is thin (< 3 hits) since the
 * two databases index small Indian towns and landmarks differently. Merged
 * results are deduplicated by displayName. Returns [] for queries shorter
 * than 3 chars and on any network/parse error — never throws, so the entry
 * form degrades gracefully when offline.
 */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const photonResults = await searchPhoton(q);
  const merged =
    photonResults.length < FALLBACK_THRESHOLD
      ? [...photonResults, ...(await searchNominatim(q))]
      : photonResults;

  const seen = new Set<string>();
  return merged.filter((r) => {
    const key = r.displayName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
