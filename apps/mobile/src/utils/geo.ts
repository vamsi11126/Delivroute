/**
 * Lightweight client-side distance/time estimates for the delivery screens.
 *
 * The backend optimiser orders the stops (the authoritative `orderIndex`) but
 * does not return a per-stop distance/ETA, so we derive *estimates* here:
 * straight-line (haversine) distance between consecutive stops, and a time
 * estimate using a flat urban average speed. These are display-only — clearly
 * labelled "est." in the UI — and intentionally avoid an extra API round-trip.
 */

import type { Package } from '../types/models';

/** Assumed average urban driving speed, used to turn distance into an ETA. */
const AVERAGE_SPEED_KMH = 22;

const EARTH_RADIUS_KM = 6371;

interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Convert a distance in km to an estimated travel time in minutes. */
export function estimateMinutes(km: number): number {
  return (km / AVERAGE_SPEED_KMH) * 60;
}

/** "850 m" / "3.4 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** "6 min" / "1 h 12 min" */
export function formatMinutes(min: number): string {
  const rounded = Math.max(1, Math.round(min));
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface LegEstimate {
  /** Distance from the previous stop (or origin) to this stop, in km. */
  distanceKm: number;
  /** Estimated travel time for this leg, in minutes. */
  minutes: number;
}

/**
 * Per-stop leg estimates plus running totals. `origin` is the boy's current
 * location if known; when omitted, the first stop's leg is measured from the
 * second stop backwards isn't possible, so its leg is 0.
 */
export function routeEstimates(
  stops: Package[],
  origin?: LatLng | null,
): { legs: LegEstimate[]; totalKm: number; totalMinutes: number } {
  const legs: LegEstimate[] = [];
  let totalKm = 0;

  let prev: LatLng | null = origin ?? null;
  for (const stop of stops) {
    const point = { lat: Number(stop.lat), lng: Number(stop.lng) };
    const distanceKm = prev ? haversineKm(prev, point) : 0;
    legs.push({ distanceKm, minutes: estimateMinutes(distanceKm) });
    totalKm += distanceKm;
    prev = point;
  }

  return { legs, totalKm, totalMinutes: estimateMinutes(totalKm) };
}
