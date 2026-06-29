import { apiClient } from './client';
import type { DeliverySession, Package } from '../types/models';

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface SessionWithPackages extends DeliverySession {
  packages: Package[];
}

export interface PackageInput {
  packageRef: string;
  customerName: string;
  address: string;
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

export async function addPackages(sessionId: string, packages: PackageInput[]): Promise<Package[]> {
  const { data } = await apiClient.post<Envelope<Package[]>>(
    `/sessions/${sessionId}/packages`,
    { packages },
  );
  return data.data;
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

/**
 * Address suggestions for the entry form. There is no delivery-boy-facing
 * autocomplete endpoint yet, so any failure (404/403/network) resolves to an
 * empty list and the caller falls back to plain free-text entry.
 */
export async function autocompleteAddress(query: string): Promise<string[]> {
  try {
    const { data } = await apiClient.get<Envelope<string[]>>('/store/autocomplete', {
      params: { q: query },
    });
    return data.data ?? [];
  } catch {
    return [];
  }
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
