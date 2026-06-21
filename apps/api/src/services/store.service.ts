import { Plan, PackageStatus, Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

/** Maximum active delivery boys per plan (enterprise is unlimited). */
const PLAN_BOY_LIMITS: Record<Plan, number> = {
  [Plan.starter]: 5,
  [Plan.growth]: 20,
  [Plan.enterprise]: Number.POSITIVE_INFINITY,
};

/** Fields safe to return for a delivery boy (never includes passwordHash). */
const boySafeSelect = {
  id: true,
  storeId: true,
  role: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
} as const;

/** Returns [startOfDay, startOfNextDay) for the given date (local time). */
function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** List every active (non-deleted) delivery boy belonging to the store. */
export async function getTeam(storeId: string) {
  return prisma.user.findMany({
    where: { storeId, role: Role.delivery_boy, deletedAt: null },
    select: boySafeSelect,
    orderBy: { createdAt: 'desc' },
  });
}

/** Count delivery boys that count against the plan limit. */
async function countActiveBoys(storeId: string): Promise<number> {
  return prisma.user.count({
    where: { storeId, role: Role.delivery_boy, isActive: true, deletedAt: null },
  });
}

/**
 * Invite a delivery boy: enforce the store's plan limit, generate a 6-digit
 * OTP, and store it in Redis as `otp:{phone}` → { otp, storeId, name } with a
 * 10-minute TTL. The OTP is logged (SMS delivery is wired up later). Returns
 * the OTP for dev convenience.
 */
export async function inviteBoy(storeId: string, name: string, phone: string): Promise<string> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, deletedAt: null },
    select: { plan: true },
  });
  if (!store) {
    throw new ApiError(404, 'NOT_FOUND', 'Store not found');
  }

  const limit = PLAN_BOY_LIMITS[store.plan];
  const activeBoys = await countActiveBoys(storeId);
  if (activeBoys >= limit) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      `Plan limit reached: the ${store.plan} plan allows up to ${limit} delivery boys`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A user with this phone already exists');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await redis.set(`otp:${phone}`, JSON.stringify({ otp, storeId, name }), 'EX', OTP_TTL_SECONDS);

  // TODO: send via SMS provider. For now, log it.
  logger.info(`OTP for ${phone}: ${otp}`);
  return otp;
}

/**
 * Deactivate a delivery boy (set isActive=false) after verifying they belong
 * to the calling store. Frees up a slot against the plan limit.
 */
export async function deactivateBoy(boyId: string, storeId: string) {
  const boy = await prisma.user.findFirst({
    where: { id: boyId, storeId, role: Role.delivery_boy, deletedAt: null },
    select: { id: true },
  });
  if (!boy) {
    throw new ApiError(404, 'NOT_FOUND', 'Delivery boy not found');
  }

  return prisma.user.update({
    where: { id: boy.id },
    data: { isActive: false },
    select: boySafeSelect,
  });
}

/** All of today's sessions for the store, with per-status package counts. */
export async function getTodaySessions(storeId: string) {
  const { start, end } = dayRange(new Date());

  const sessions = await prisma.deliverySession.findMany({
    where: { storeId, date: { gte: start, lt: end } },
    orderBy: { createdAt: 'desc' },
    include: {
      boy: { select: { id: true, name: true, phone: true } },
      packages: { select: { status: true } },
    },
  });

  return sessions.map(({ packages, ...session }) => ({
    ...session,
    counts: {
      total: packages.length,
      pending: packages.filter((p) => p.status === PackageStatus.pending).length,
      delivered: packages.filter((p) => p.status === PackageStatus.delivered).length,
      failed: packages.filter((p) => p.status === PackageStatus.failed).length,
      skipped: packages.filter((p) => p.status === PackageStatus.skipped).length,
    },
  }));
}

/**
 * All packages for a session, after verifying the session belongs to the
 * store. Ordered by the optimizer's `orderIndex`.
 */
export async function getSessionPackages(sessionId: string, storeId: string) {
  const session = await prisma.deliverySession.findFirst({
    where: { id: sessionId, storeId },
    select: { id: true },
  });
  if (!session) {
    throw new ApiError(404, 'NOT_FOUND', 'Session not found');
  }

  return prisma.package.findMany({
    where: { sessionId },
    orderBy: { orderIndex: 'asc' },
  });
}

/**
 * Latest known location for each active delivery boy in the store. Boys
 * without any recorded location are omitted.
 */
export async function getLiveFleet(storeId: string) {
  const boys = await prisma.user.findMany({
    where: { storeId, role: Role.delivery_boy, isActive: true, deletedAt: null },
    select: { id: true, name: true, phone: true },
  });

  const fleet = await Promise.all(
    boys.map(async (boy) => {
      const location = await prisma.location.findFirst({
        where: { boyId: boy.id },
        orderBy: { recordedAt: 'desc' },
        select: { lat: true, lng: true, recordedAt: true },
      });
      return location ? { boy, location } : null;
    }),
  );

  return fleet.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

/**
 * Delivery report for a single day: overall delivered/failed counts plus a
 * per-boy breakdown across the store's sessions for that date.
 */
export async function getDailyReport(storeId: string, date?: string) {
  const baseDate = date ? new Date(`${date}T00:00:00`) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid date');
  }
  const { start, end } = dayRange(baseDate);

  const sessions = await prisma.deliverySession.findMany({
    where: { storeId, date: { gte: start, lt: end } },
    include: {
      boy: { select: { id: true, name: true } },
      packages: { select: { status: true } },
    },
  });

  let delivered = 0;
  let failed = 0;
  const perBoy = new Map<
    string,
    { boyId: string; name: string; delivered: number; failed: number; total: number }
  >();

  for (const session of sessions) {
    const entry =
      perBoy.get(session.boyId) ??
      { boyId: session.boyId, name: session.boy.name, delivered: 0, failed: 0, total: 0 };

    for (const pkg of session.packages) {
      entry.total += 1;
      if (pkg.status === PackageStatus.delivered) {
        entry.delivered += 1;
        delivered += 1;
      } else if (pkg.status === PackageStatus.failed) {
        entry.failed += 1;
        failed += 1;
      }
    }

    perBoy.set(session.boyId, entry);
  }

  return {
    date: start.toISOString().slice(0, 10),
    totals: { delivered, failed, sessions: sessions.length },
    perBoy: Array.from(perBoy.values()),
  };
}
