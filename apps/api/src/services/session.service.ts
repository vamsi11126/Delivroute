import { PackageStatus, SessionStatus, type Package } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { emitToStore } from '../socket/socket-emitter';
import { getMapProvider, type LatLng } from './maps';
import { optimizeRoute } from './route-optimizer.service';
import type { PackageInput } from '../schemas/session.schema';

/** Returns [startOfDay, startOfNextDay) for the given date (local time). */
function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Load a session scoped to the store, throwing 404 if it doesn't belong. */
async function findScopedSession(sessionId: string, storeId: string) {
  const session = await prisma.deliverySession.findFirst({
    where: { id: sessionId, storeId },
  });
  if (!session) {
    throw new ApiError(404, 'NOT_FOUND', 'Session not found');
  }
  return session;
}

/**
 * Create a delivery session for today. Errors if the boy already has one for
 * the current day (one active session per boy per day).
 */
export async function createSession(boyId: string, storeId: string) {
  const { start, end } = dayRange(new Date());

  const existing = await prisma.deliverySession.findFirst({
    where: { boyId, storeId, date: { gte: start, lt: end } },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A session already exists for today');
  }

  return prisma.deliverySession.create({
    data: { storeId, boyId, date: start, status: SessionStatus.pending },
  });
}

/**
 * Fetch today's session for a boy (with packages), or null if none exists yet.
 * Powers the mobile Home screen's "do I have a session today?" check.
 */
export async function getTodaySession(boyId: string, storeId: string) {
  const { start, end } = dayRange(new Date());
  return prisma.deliverySession.findFirst({
    where: { boyId, storeId, date: { gte: start, lt: end } },
    include: { packages: { orderBy: { orderIndex: 'asc' } } },
  });
}

/** Fetch a session with all of its packages ordered by the optimiser index. */
export async function getSession(sessionId: string, storeId: string) {
  const session = await prisma.deliverySession.findFirst({
    where: { id: sessionId, storeId },
    include: { packages: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!session) {
    throw new ApiError(404, 'NOT_FOUND', 'Session not found');
  }
  return session;
}

/** An address that couldn't be geocoded, returned so the boy can correct it. */
export interface FailedAddress {
  packageRef: string;
  customerName: string;
  address: string;
  reason: string;
}

export interface AddPackagesResult {
  created: Package[];
  failed: FailedAddress[];
}

/**
 * Create Package records for a batch of inputs. Packages that arrive with
 * lat/lng (resolved client-side via address autocomplete) are used as-is; the
 * rest are geocoded via the configured MapProvider. New packages are appended
 * after any existing ones (orderIndex continues from the current max); call
 * optimizeSession afterwards to order them.
 *
 * A single un-geocodable address must not sink the whole batch: every address
 * that resolves is added, and the ones that don't are returned in `failed` so
 * the delivery boy knows exactly which to fix. A provider outage
 * (MAP_API_UNAVAILABLE) is different — it isn't the address's fault, so it
 * propagates and fails the request rather than flagging every address as bad.
 *
 * Geocoding runs sequentially on purpose: Nominatim is rate-limited (and the
 * OSM provider already sleeps between its own retries), so firing the whole
 * batch in parallel risks 429s for no real speed-up.
 */
export async function addPackages(
  sessionId: string,
  storeId: string,
  packages: PackageInput[],
): Promise<AddPackagesResult> {
  await findScopedSession(sessionId, storeId);

  const geocoded: { input: PackageInput; coords: LatLng }[] = [];
  const failed: FailedAddress[] = [];
  // Only reach for the provider if at least one package lacks coordinates.
  const needsGeocoding = packages.some((p) => p.lat === undefined || p.lng === undefined);
  const provider = needsGeocoding ? getMapProvider() : null;

  for (const pkg of packages) {
    if (pkg.lat !== undefined && pkg.lng !== undefined) {
      geocoded.push({ input: pkg, coords: { lat: pkg.lat, lng: pkg.lng } });
      continue;
    }
    try {
      const coords = await provider!.geocode(pkg.address);
      geocoded.push({ input: pkg, coords });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MAP_API_UNAVAILABLE') {
        throw err;
      }
      const reason = err instanceof ApiError ? err.message : 'Could not geocode this address';
      logger.warn('Skipping package with ungeocodable address', {
        sessionId,
        packageRef: pkg.packageRef,
        address: pkg.address,
        reason,
      });
      failed.push({
        packageRef: pkg.packageRef,
        customerName: pkg.customerName,
        address: pkg.address,
        reason,
      });
    }
  }

  const existingCount = await prisma.package.count({ where: { sessionId } });

  const created = geocoded.length
    ? await prisma.$transaction(
        geocoded.map(({ input, coords }, i) =>
          prisma.package.create({
            data: {
              sessionId,
              packageRef: input.packageRef,
              customerName: input.customerName,
              addressRaw: input.address,
              lat: coords.lat,
              lng: coords.lng,
              orderIndex: existingCount + i,
              status: PackageStatus.pending,
            },
          }),
        ),
      )
    : [];

  return { created, failed };
}

/**
 * Run the route optimiser from the boy's current location over the session's
 * undelivered packages, then persist new orderIndex values for every package.
 *
 * Ordering: already-visited packages (delivered/skipped) keep their relative
 * order at the front, then optimised pending packages, then failed packages
 * appended at the end (re-attempted last).
 */
export async function optimizeSession(sessionId: string, storeId: string, current: LatLng) {
  await findScopedSession(sessionId, storeId);

  const packages = await prisma.package.findMany({ where: { sessionId } });
  const pending = packages.filter((p) => p.status === PackageStatus.pending);
  const failed = packages.filter((p) => p.status === PackageStatus.failed);
  const done = packages
    .filter((p) => p.status === PackageStatus.delivered || p.status === PackageStatus.skipped)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const optimized = await optimizeRoute(
    current,
    pending.map((p) => ({ id: p.id, lat: Number(p.lat), lng: Number(p.lng) })),
  );

  const orderedIds = [
    ...done.map((p) => p.id),
    ...optimized.map((o) => o.id),
    ...failed.map((p) => p.id),
  ];

  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.package.update({ where: { id }, data: { orderIndex: idx } }),
    ),
  );

  return getSession(sessionId, storeId);
}

/** Start a session: status → active, startedAt = now. Emits session:started. */
export async function startSession(sessionId: string, storeId: string) {
  const session = await findScopedSession(sessionId, storeId);
  if (session.status !== SessionStatus.pending) {
    throw new ApiError(409, 'CONFLICT', 'Session has already been started');
  }

  const updated = await prisma.deliverySession.update({
    where: { id: session.id },
    data: { status: SessionStatus.active, startedAt: new Date() },
  });

  const totalPackages = await prisma.package.count({ where: { sessionId } });
  emitToStore(storeId, 'session:started', {
    sessionId,
    boyId: session.boyId,
    totalPackages,
  });

  return updated;
}

/**
 * End a session early/manually: any package still pending or failed is marked
 * skipped (FAILED → SKIPPED per the documented status flow), the session is
 * completed, and session:completed is emitted. Idempotent — a session that is
 * already completed is returned unchanged.
 */
export async function endSession(sessionId: string, storeId: string) {
  const session = await findScopedSession(sessionId, storeId);
  if (session.status === SessionStatus.completed) {
    return session;
  }

  const unresolved = await prisma.package.findMany({
    where: {
      sessionId,
      status: { in: [PackageStatus.pending, PackageStatus.failed] },
    },
  });

  await prisma.$transaction([
    ...unresolved.flatMap((p) => [
      prisma.package.update({
        where: { id: p.id },
        data: { status: PackageStatus.skipped },
      }),
      prisma.deliveryLog.create({
        data: {
          packageId: p.id,
          fromStatus: p.status,
          toStatus: PackageStatus.skipped,
          reason: p.failReason ?? 'Session ended',
        },
      }),
    ]),
    prisma.deliverySession.update({
      where: { id: session.id },
      data: { status: SessionStatus.completed, endedAt: new Date() },
    }),
  ]);

  const [delivered, skipped] = await Promise.all([
    prisma.package.count({ where: { sessionId, status: PackageStatus.delivered } }),
    prisma.package.count({ where: { sessionId, status: PackageStatus.skipped } }),
  ]);

  emitToStore(storeId, 'session:completed', {
    sessionId,
    boyId: session.boyId,
    delivered,
    failed: skipped,
  });

  return prisma.deliverySession.findUnique({ where: { id: session.id } });
}

/** Load a package scoped to the boy + store via its session relation. */
async function findScopedPackage(packageId: string, boyId: string, storeId: string) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, session: { boyId, storeId } },
    include: { session: { select: { id: true, storeId: true, boyId: true, status: true } } },
  });
  if (!pkg) {
    throw new ApiError(404, 'NOT_FOUND', 'Package not found');
  }
  return pkg;
}

/**
 * Hard-delete a package. Only the owning delivery boy (scoped via the session)
 * may delete, and only while the session is still `pending` — once it has
 * started, packages are part of the live run and must not vanish from the queue.
 *
 * Used by the mobile entry screen when the boy removes a row that a previous
 * partial-success add had already persisted server-side.
 */
export async function deletePackage(packageId: string, boyId: string, storeId: string): Promise<void> {
  const pkg = await findScopedPackage(packageId, boyId, storeId);
  if (pkg.session.status !== SessionStatus.pending) {
    throw new ApiError(409, 'CONFLICT', 'Packages can only be removed before the session starts');
  }

  // No FK cascade is configured, so clear any dependent logs first. A pending
  // package normally has none, but this keeps the delete safe regardless.
  await prisma.$transaction([
    prisma.deliveryLog.deleteMany({ where: { packageId } }),
    prisma.package.delete({ where: { id: packageId } }),
  ]);
}

/**
 * Re-optimise the remaining route from a package's location (the boy is now
 * physically at that package). Best-effort: a MapProvider outage must not fail
 * the delivery/failure that has already been committed.
 */
async function reoptimizeFrom(sessionId: string, storeId: string, pkg: Package): Promise<void> {
  try {
    await optimizeSession(sessionId, storeId, { lat: Number(pkg.lat), lng: Number(pkg.lng) });
  } catch (err) {
    logger.warn('Re-optimisation skipped', { sessionId, error: (err as Error).message });
  }
}

/**
 * Auto-complete a session once every package is resolved (delivered or
 * skipped, i.e. no pending and no failed remain). Emits session:completed.
 */
async function maybeCompleteSession(sessionId: string, storeId: string, boyId: string): Promise<void> {
  const outstanding = await prisma.package.count({
    where: { sessionId, status: { in: [PackageStatus.pending, PackageStatus.failed] } },
  });
  if (outstanding > 0) return;

  const session = await prisma.deliverySession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });
  if (!session || session.status === SessionStatus.completed) return;

  await prisma.deliverySession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.completed, endedAt: new Date() },
  });

  const [delivered, failed] = await Promise.all([
    prisma.package.count({ where: { sessionId, status: PackageStatus.delivered } }),
    prisma.package.count({ where: { sessionId, status: PackageStatus.skipped } }),
  ]);

  emitToStore(storeId, 'session:completed', { sessionId, boyId, delivered, failed });
}

/**
 * Mark a package delivered: status → delivered, deliveredAt = now, write a
 * DeliveryLog, emit delivery:status, re-optimise the remaining route, and
 * complete the session if nothing is left.
 */
export async function markDelivered(packageId: string, boyId: string, storeId: string) {
  const pkg = await findScopedPackage(packageId, boyId, storeId);

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.package.update({
      where: { id: pkg.id },
      data: { status: PackageStatus.delivered, deliveredAt: new Date() },
    });
    await tx.deliveryLog.create({
      data: { packageId: pkg.id, fromStatus: pkg.status, toStatus: PackageStatus.delivered },
    });
    return p;
  });

  const timestamp = new Date().toISOString();
  emitToStore(storeId, 'delivery:status', {
    packageId,
    status: PackageStatus.delivered,
    boyId,
    timestamp,
  });

  await reoptimizeFrom(pkg.session.id, storeId, updated);
  await maybeCompleteSession(pkg.session.id, storeId, boyId);

  return updated;
}

/**
 * Mark a package failed: status → failed with a reason, write a DeliveryLog,
 * emit delivery:status, move it to the end of the queue and re-optimise the
 * rest, then complete the session if nothing is left.
 */
export async function markFailed(packageId: string, boyId: string, reason: string, storeId: string) {
  const pkg = await findScopedPackage(packageId, boyId, storeId);

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.package.update({
      where: { id: pkg.id },
      data: { status: PackageStatus.failed, failReason: reason },
    });
    await tx.deliveryLog.create({
      data: {
        packageId: pkg.id,
        fromStatus: pkg.status,
        toStatus: PackageStatus.failed,
        reason,
      },
    });
    return p;
  });

  const timestamp = new Date().toISOString();
  emitToStore(storeId, 'delivery:status', {
    packageId,
    status: PackageStatus.failed,
    boyId,
    timestamp,
  });

  // Failed packages are appended to the end by optimizeSession.
  await reoptimizeFrom(pkg.session.id, storeId, updated);
  await maybeCompleteSession(pkg.session.id, storeId, boyId);

  return updated;
}

/** Record the delivery boy's current GPS location. */
export async function pushLocation(boyId: string, lat: number, lng: number) {
  return prisma.location.create({
    data: { boyId, lat, lng, recordedAt: new Date() },
  });
}
