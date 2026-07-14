import { PackageStatus, Plan, Role, StoreStatus, SubStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/errors';

/** Returns [startOfDay, startOfNextDay) for the given date (local time). */
function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Returns [startOfMonth, startOfNextMonth) for the given date (local time). */
function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

/**
 * Paginated list of every (non-deleted) store with owner name, plan, status,
 * and a count of active delivery boys. Returns the page plus the total for
 * pagination metadata.
 */
export async function listStores(page: number, limit: number) {
  const where = { deletedAt: null };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        plan: true,
        status: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
        _count: {
          select: {
            users: { where: { role: Role.delivery_boy, isActive: true, deletedAt: null } },
          },
        },
      },
    }),
    prisma.store.count({ where }),
  ]);

  const data = stores.map(({ _count, ...store }) => ({
    ...store,
    boyCount: _count.users,
  }));

  return { stores: data, total, page, limit };
}

/** Full store detail: owner, subscription, and the 10 most recent sessions. */
export async function getStore(storeId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, deletedAt: null },
    select: {
      id: true,
      name: true,
      plan: true,
      status: true,
      createdAt: true,
      owner: { select: { id: true, name: true, email: true, phone: true } },
      subscription: true,
      _count: {
        select: {
          users: { where: { role: Role.delivery_boy, isActive: true, deletedAt: null } },
        },
      },
      users: {
        where: { role: Role.delivery_boy, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, isActive: true },
      },
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          date: true,
          status: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          boy: { select: { id: true, name: true } },
          _count: { select: { packages: true } },
        },
      },
    },
  });

  if (!store) {
    throw new ApiError(404, 'NOT_FOUND', 'Store not found');
  }

  const { _count, sessions, users, ...rest } = store;
  return {
    ...rest,
    boyCount: _count.users,
    deliveryBoys: users,
    recentSessions: sessions.map(({ _count: sc, ...session }) => ({
      ...session,
      packageCount: sc.packages,
    })),
  };
}

/** Update a store's lifecycle status and/or plan. */
export async function updateStoreStatus(
  storeId: string,
  data: { status?: StoreStatus; plan?: Plan },
) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, deletedAt: null },
    select: { id: true },
  });
  if (!store) {
    throw new ApiError(404, 'NOT_FOUND', 'Store not found');
  }

  return prisma.store.update({
    where: { id: store.id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.plan !== undefined ? { plan: data.plan } : {}),
    },
    select: { id: true, name: true, plan: true, status: true },
  });
}

/** List subscriptions across all stores, optionally filtered by status. */
export async function listSubscriptions(status?: SubStatus) {
  return prisma.subscription.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      store: { select: { id: true, name: true } },
    },
  });
}

/**
 * Platform-wide analytics for the super admin dashboard: store counts, total
 * active delivery boys, and delivered-package counts for today and this month.
 */
export async function getPlatformAnalytics() {
  const now = new Date();
  const { start: dayStart, end: dayEnd } = dayRange(now);
  const { start: monthStart, end: monthEnd } = monthRange(now);

  const [totalStores, activeStores, totalBoys, deliveriesToday, deliveriesThisMonth] =
    await Promise.all([
      prisma.store.count({ where: { deletedAt: null } }),
      prisma.store.count({ where: { deletedAt: null, status: StoreStatus.active } }),
      prisma.user.count({
        where: { role: Role.delivery_boy, isActive: true, deletedAt: null },
      }),
      prisma.package.count({
        where: { status: PackageStatus.delivered, deliveredAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.package.count({
        where: {
          status: PackageStatus.delivered,
          deliveredAt: { gte: monthStart, lt: monthEnd },
        },
      }),
    ]);

  return { totalStores, activeStores, totalBoys, deliveriesToday, deliveriesThisMonth };
}
