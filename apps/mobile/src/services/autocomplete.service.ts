/**
 * Address autocomplete backed by the Ola Maps Places API. Predictions already
 * include geometry.location, so a selected suggestion carries lat/lng and
 * never needs server-side geocoding at submit time.
 */
import { env } from '../config/env';

export interface AddressResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
}

const OLA_AUTOCOMPLETE_URL = 'https://api.olamaps.io/places/v1/autocomplete';
const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 5;

interface OlaPrediction {
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  geometry?: {
    location?: { lat?: number; lng?: number };
  };
}

/**
 * Search addresses via Ola Maps autocomplete. Returns [] for queries shorter
 * than 3 chars and on any network/parse error — never throws, so the entry
 * form degrades gracefully when offline.
 */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  try {
    const url =
      `${OLA_AUTOCOMPLETE_URL}?input=${encodeURIComponent(q)}` +
      `&api_key=${encodeURIComponent(env.OLA_MAPS_API_KEY)}&language=en`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = (await res.json()) as { predictions?: OlaPrediction[] };
    return (json.predictions ?? [])
      .map((p) => {
        const main = p.structured_formatting?.main_text ?? '';
        const secondary = p.structured_formatting?.secondary_text ?? '';
        return {
          placeId: p.place_id ?? '',
          displayName: [main, secondary].filter(Boolean).join(', '),
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
        };
      })
      .filter(
        (r): r is AddressResult =>
          r.displayName.length > 0 && Number.isFinite(r.lat) && Number.isFinite(r.lng),
      )
      .slice(0, MAX_RESULTS);
  } catch {
    return [];
  }
}
