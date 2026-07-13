import { api } from '@/lib/api';
import type {
  DailyReport,
  DeliveryRow,
  FleetEntry,
  PackageRecord,
  SessionSummary,
  TeamMember,
} from '@/types/store';

/** Backend response envelope. */
interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
  error?: { code: string; message: string };
}

/** GET /store/sessions — today's delivery sessions with per-status counts. */
export async function fetchTodaySessions(): Promise<SessionSummary[]> {
  const res = await api.get<Envelope<SessionSummary[]>>('/store/sessions');
  return res.data.data;
}

/** GET /store/sessions/:id/packages — packages for a single session. */
export async function fetchSessionPackages(
  sessionId: string,
): Promise<PackageRecord[]> {
  const res = await api.get<Envelope<PackageRecord[]>>(
    `/store/sessions/${sessionId}/packages`,
  );
  return res.data.data;
}

/**
 * Today's packages flattened into rows, each joined with its delivery boy.
 * The sessions endpoint only returns counts, so we fan out to per-session
 * package lists and merge — used by the Deliveries table and the map popups.
 */
export async function fetchTodayDeliveries(): Promise<DeliveryRow[]> {
  const sessions = await fetchTodaySessions();
  const perSession = await Promise.all(
    sessions.map(async (session) => {
      const packages = await fetchSessionPackages(session.id);
      return packages.map<DeliveryRow>((pkg) => ({
        ...pkg,
        boy: session.boy,
        sessionStatus: session.status,
      }));
    }),
  );
  return perSession.flat();
}

/** GET /store/fleet/live — latest location per active delivery boy. */
export async function fetchLiveFleet(): Promise<FleetEntry[]> {
  const res = await api.get<Envelope<FleetEntry[]>>('/store/fleet/live');
  return res.data.data;
}

/** GET /store/team — active delivery boys. */
export async function fetchTeam(): Promise<TeamMember[]> {
  const res = await api.get<Envelope<TeamMember[]>>('/store/team');
  return res.data.data;
}

/** GET /store/reports/daily?date=YYYY-MM-DD */
export async function fetchDailyReport(date: string): Promise<DailyReport> {
  const res = await api.get<Envelope<DailyReport>>('/store/reports/daily', {
    params: { date },
  });
  return res.data.data;
}
