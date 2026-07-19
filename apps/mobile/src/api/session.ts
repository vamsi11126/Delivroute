import { apiClient } from './client';
import type { DeliverySession, Package } from '../types/models';

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** An address the server couldn't geocode, so it was skipped (not added). */
export interface FailedAddress {
  packageRef: string;
  customerName: string;
  address: string;
  reason: string;
}

/** Result of a bulk add: the packages created plus any addresses that failed. */
export interface AddPackagesResult {
  created: Package[];
  failed: FailedAddress[];
}

interface SessionWithPackages extends DeliverySession {
  packages: Package[];
}

export interface PackageInput {
  packageRef: string;
  customerName: string;
  address: string;
  /** Present when the address came from autocomplete — server skips geocoding. */
  lat?: number;
  lng?: number;
}

export async function createSession(): Promise<DeliverySession> {
  const { data } = await apiClient.post<Envelope<DeliverySession>>('/sessions', {});
  return data.data;
}

/**
 * Today's session for the signed-in delivery boy, or `null` if none has been
 * created yet. Backed by `GET /sessions` (server scopes to the JWT's boy/store
 * and the current day).
 */
export async function getTodaySession(): Promise<SessionWithPackages | null> {
  const { data } = await apiClient.get<Envelope<SessionWithPackages | null>>('/sessions');
  return data.data;
}

export async function getSession(sessionId: string): Promise<SessionWithPackages> {
  const { data } = await apiClient.get<Envelope<SessionWithPackages>>(`/sessions/${sessionId}`);
  return data.data;
}

export async function addPackages(
  sessionId: string,
  packages: PackageInput[],
): Promise<AddPackagesResult> {
  const { data } = await apiClient.post<Envelope<Package[]> & { meta?: { failed?: FailedAddress[] } }>(
    `/sessions/${sessionId}/packages`,
    { packages },
  );
  return { created: data.data, failed: data.meta?.failed ?? [] };
}

export async function optimizeRoute(
  sessionId: string,
  lat: number,
  lng: number,
): Promise<SessionWithPackages> {
  const { data } = await apiClient.post<Envelope<SessionWithPackages>>(
    `/sessions/${sessionId}/optimize`,
    { lat, lng },
  );
  return data.data;
}

export async function startSession(sessionId: string): Promise<DeliverySession> {
  const { data } = await apiClient.patch<Envelope<DeliverySession>>(`/sessions/${sessionId}/start`);
  return data.data;
}

export async function endSession(sessionId: string): Promise<DeliverySession> {
  const { data } = await apiClient.patch<Envelope<DeliverySession>>(`/sessions/${sessionId}/end`);
  return data.data;
}

export async function markDelivered(packageId: string): Promise<Package> {
  const { data } = await apiClient.patch<Envelope<Package>>(`/packages/${packageId}/deliver`, {});
  return data.data;
}

export async function markFailed(packageId: string, failReason: string): Promise<Package> {
  const { data } = await apiClient.patch<Envelope<Package>>(`/packages/${packageId}/fail`, {
    failReason,
  });
  return data.data;
}

/**
 * Remove a package that was already persisted server-side (e.g. from a prior
 * partial-success add). Only permitted while the session is still pending.
 */
export async function deletePackage(packageId: string): Promise<void> {
  await apiClient.delete(`/packages/${packageId}`);
}
