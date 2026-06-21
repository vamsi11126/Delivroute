/** A geographic coordinate pair. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Result of a point-to-point route lookup. */
export interface RouteResult {
  /** Total travel distance in metres. */
  distanceMeters: number;
  /** Total travel time in seconds. */
  durationSeconds: number;
  /** Encoded polyline / GeoJSON-ish geometry, when the provider returns one. */
  geometry: string | null;
}

/**
 * Provider-agnostic mapping interface. Two implementations exist —
 * GoogleMapsProvider (MAP_PROVIDER=google) and OSRMProvider (MAP_PROVIDER=osm).
 * Swap providers via the env var with zero changes to callers.
 */
export interface MapProvider {
  geocode(address: string): Promise<LatLng>;
  autocomplete(query: string): Promise<string[]>;
  /** n×m matrix of travel times (seconds) from each origin to each destination. */
  distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]>;
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult>;
}
