/**
 * Client-side shapes for the store-owner dashboard. These mirror what the
 * Express `/store/*` endpoints return (see apps/api store.service.ts) and stay
 * loose (string unions) so the web app never imports from the API package.
 */

export type PackageStatus = 'pending' | 'delivered' | 'failed' | 'skipped';
export type SessionStatus = 'pending' | 'active' | 'completed';

/** GET /store/sessions — one entry per delivery session for the day. */
export interface SessionSummary {
  id: string;
  storeId: string;
  boyId: string;
  date: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  boy: { id: string; name: string; phone: string | null };
  counts: {
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    skipped: number;
  };
}

/** GET /store/sessions/:id/packages — full package rows for a session. */
export interface PackageRecord {
  id: string;
  sessionId: string;
  packageRef: string;
  customerName: string;
  addressRaw: string;
  lat: string;
  lng: string;
  status: PackageStatus;
  orderIndex: number;
  failReason: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

/** A package row joined with the delivery boy that owns its session. */
export interface DeliveryRow extends PackageRecord {
  boy: { id: string; name: string; phone: string | null };
  sessionStatus: SessionStatus;
}

/** GET /store/fleet/live — latest known location per active boy. */
export interface FleetEntry {
  boy: { id: string; name: string; phone: string | null };
  location: { lat: string; lng: string; recordedAt: string };
}

/** GET /store/team — active delivery boys for the store. */
export interface TeamMember {
  id: string;
  storeId: string | null;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

/** GET /store/reports/daily?date=YYYY-MM-DD */
export interface DailyReport {
  date: string;
  totals: { delivered: number; failed: number; sessions: number };
  perBoy: {
    boyId: string;
    name: string;
    delivered: number;
    failed: number;
    total: number;
  }[];
}

/** Payload broadcast on the store namespace for every GPS ping. */
export interface LocationBroadcast {
  boyId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

/** Payload for a package status change (emitted from delivery controllers). */
export interface DeliveryStatusEvent {
  packageId: string;
  status: PackageStatus;
  boyId: string;
  timestamp: string;
}
