import { api } from '@/lib/api';
import type {
  PlatformAnalytics,
  StoreDetail,
  StoreListItem,
  StoresListResult,
  SubscriptionRow,
  Plan,
  StoreStatus,
  SubStatus,
} from '@/types/admin';

/** Backend response envelope. */
interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
  error?: { code: string; message: string };
}

/** GET /admin/analytics — platform-wide KPI counts. */
export async function fetchAnalytics(): Promise<PlatformAnalytics> {
  const res = await api.get<Envelope<PlatformAnalytics>>('/admin/analytics');
  return res.data.data;
}

/** GET /admin/stores?page&limit — paginated store list with meta. */
export async function fetchStores(
  page: number,
  limit: number,
): Promise<StoresListResult> {
  const res = await api.get<Envelope<StoreListItem[]>>('/admin/stores', {
    params: { page, limit },
  });
  const meta = (res.data.meta ?? { page, limit, total: 0 }) as StoresListResult['meta'];
  return { stores: res.data.data, meta };
}

/** GET /admin/stores/:id — full store detail. */
export async function fetchStore(id: string): Promise<StoreDetail> {
  const res = await api.get<Envelope<StoreDetail>>(`/admin/stores/${id}`);
  return res.data.data;
}

/** PATCH /admin/stores/:id/status — update status and/or plan. */
export async function updateStore(
  id: string,
  body: { status?: StoreStatus; plan?: Plan },
): Promise<void> {
  await api.patch(`/admin/stores/${id}/status`, body);
}

/** GET /admin/subscriptions?status — all subscriptions, optionally filtered. */
export async function fetchSubscriptions(
  status?: SubStatus,
): Promise<SubscriptionRow[]> {
  const res = await api.get<Envelope<SubscriptionRow[]>>('/admin/subscriptions', {
    params: status ? { status } : undefined,
  });
  return res.data.data;
}
