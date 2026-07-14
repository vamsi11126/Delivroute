/**
 * Client-side shapes for the super-admin panel, mirroring the `/admin/*`
 * endpoints (see apps/api admin.service.ts). Kept loose (string unions) so the
 * web app never imports from the API package.
 */

export type Plan = 'starter' | 'growth' | 'enterprise';
export type StoreStatus = 'trial' | 'active' | 'suspended';
export type SubStatus = 'active' | 'past_due' | 'cancelled';
export type SessionStatus = 'pending' | 'active' | 'completed';

/** GET /admin/analytics */
export interface PlatformAnalytics {
  totalStores: number;
  activeStores: number;
  totalBoys: number;
  deliveriesToday: number;
  deliveriesThisMonth: number;
}

/** One row from GET /admin/stores */
export interface StoreListItem {
  id: string;
  name: string;
  plan: Plan;
  status: StoreStatus;
  createdAt: string;
  owner: { id: string; name: string };
  boyCount: number;
}

/** Pagination envelope meta for GET /admin/stores */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface StoresListResult {
  stores: StoreListItem[];
  meta: PageMeta;
}

/** A subscription record embedded in the store detail / subscriptions list. */
export interface Subscription {
  id: string;
  storeId: string;
  plan: Plan;
  gateway: string;
  gatewaySubId: string;
  status: SubStatus;
  currentPeriodEnd: string;
  createdAt: string;
}

/** GET /admin/subscriptions — subscription joined with its store. */
export interface SubscriptionRow extends Subscription {
  store: { id: string; name: string };
}

/** A recent session summary on the store detail page. */
export interface AdminRecentSession {
  id: string;
  date: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  boy: { id: string; name: string };
  packageCount: number;
}

/** A delivery boy on the store detail page. */
export interface AdminDeliveryBoy {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
}

/** GET /admin/stores/:id */
export interface StoreDetail {
  id: string;
  name: string;
  plan: Plan;
  status: StoreStatus;
  createdAt: string;
  owner: { id: string; name: string; email: string | null; phone: string | null };
  subscription: Subscription | null;
  boyCount: number;
  deliveryBoys: AdminDeliveryBoy[];
  recentSessions: AdminRecentSession[];
}
