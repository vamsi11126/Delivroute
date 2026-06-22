/**
 * Lightweight client-side mirrors of the API entities. These intentionally
 * stay loose (string unions, optional fields) — the source of truth is the
 * backend Prisma schema; a shared package can replace these later.
 */

export type Role = 'super_admin' | 'store_owner' | 'delivery_boy';

export type PackageStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

export type SessionStatus = 'pending' | 'active' | 'completed';

export interface User {
  id: string;
  storeId: string | null;
  role: Role;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeliverySession {
  id: string;
  storeId: string;
  boyId: string;
  date: string;
  status: SessionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface Package {
  id: string;
  sessionId: string;
  packageRef: string;
  customerName: string;
  addressRaw: string;
  lat: number;
  lng: number;
  status: PackageStatus;
  orderIndex: number;
  failReason?: string | null;
  deliveredAt?: string | null;
}
