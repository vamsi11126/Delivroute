/**
 * Address autocomplete backed by the free Photon API (photon.komoot.io,
 * OSM-based). Called directly from the app — no API key, no backend hop.
 * Results carry lat/lng, so a selected suggestion never needs server-side
 * geocoding at submit time.
 */

export interface AddressResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
/** Rough bounding box for India: minLon,minLat,maxLon,maxLat. */
const INDIA_BBOX = '68.1,8.0,97.4,37.6';
const MIN_QUERY_LENGTH = 3;

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/** Build a readable single-line address from Photon's sparse properties. */
function buildDisplayName(p: PhotonFeature['properties']): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const parts = [p.name, street, p.city, p.state, p.postcode, p.country];
  // Drop empties and immediate duplicates (name often repeats street/city).
  return parts
    .filter((part): part is string => Boolean(part))
    .filter((part, i, arr) => arr.indexOf(part) === i)
    .join(', ');
}

/**
 * Search addresses via Photon, biased toward India. Returns [] for queries
 * shorter than 3 chars and on any network/parse error — never throws, so the
 * entry form degrades gracefully when offline.
 */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  try {
    const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=5&lang=en&bbox=${INDIA_BBOX}`;
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
