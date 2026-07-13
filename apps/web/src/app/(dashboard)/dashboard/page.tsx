'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Truck,
  Package as PackageIcon,
  CheckCircle2,
  XCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  fetchTodayDeliveries,
  fetchTodaySessions,
} from '@/lib/store-queries';

interface Kpi {
  label: string;
  value: number;
  icon: LucideIcon;
  /** Accent classes for the icon chip. */
  accent: string;
}

/** Auto-refresh cadence for all dashboard-home queries. */
const REFRESH_MS = 30_000;

export default function DashboardHomePage() {
  const sessionsQuery = useQuery({
    queryKey: ['store', 'sessions', 'today'],
    queryFn: fetchTodaySessions,
    refetchInterval: REFRESH_MS,
  });

  const deliveriesQuery = useQuery({
    queryKey: ['store', 'deliveries', 'today'],
    queryFn: fetchTodayDeliveries,
    refetchInterval: REFRESH_MS,
  });

  const kpis = useMemo<Kpi[]>(() => {
    const sessions = sessionsQuery.data ?? [];
    const totals = sessions.reduce(
      (acc, s) => {
        acc.packages += s.counts.total;
        acc.delivered += s.counts.delivered;
        acc.failed += s.counts.failed;
        return acc;
      },
      { packages: 0, delivered: 0, failed: 0 },
    );

    const activeSessions = sessions.filter((s) => s.status === 'active');
    const boysOnline = new Set(activeSessions.map((s) => s.boyId)).size;

    return [
      {
        label: 'Active Deliveries',
        value: activeSessions.length,
        icon: Truck,
        accent: 'bg-green-100 text-green-700',
      },
      {
        label: 'Total Packages Today',
        value: totals.packages,
        icon: PackageIcon,
        accent: 'bg-blue-100 text-blue-700',
      },
      {
        label: 'Delivered',
        value: totals.delivered,
        icon: CheckCircle2,
        accent: 'bg-green-100 text-green-700',
      },
      {
        label: 'Failed',
        value: totals.failed,
        icon: XCircle,
        accent: 'bg-red-100 text-red-700',
      },
      {
        label: 'Boys Online',
        value: boysOnline,
        icon: Users,
        accent: 'bg-purple-100 text-purple-700',
      },
    ];
  }, [sessionsQuery.data]);

  /** Last 10 packages that reached a terminal state, newest first. */
  const recentActivity = useMemo(() => {
    const rows = deliveriesQuery.data ?? [];
    return rows
      .filter((r) => r.status === 'delivered' || r.status === 'failed')
      .sort((a, b) => {
        const at = new Date(a.deliveredAt ?? a.createdAt).getTime();
        const bt = new Date(b.deliveredAt ?? b.createdAt).getTime();
        return bt - at;
      })
      .slice(0, 10);
  }, [deliveriesQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Today&apos;s delivery activity across your store. Refreshes every 30s.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {sessionsQuery.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </CardTitle>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${kpi.accent}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpi.value}</div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Recent activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveriesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No delivery activity yet today.
            </p>
          ) : (
            <ul className="divide-y">
              {recentActivity.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.customerName}{' '}
                      <span className="text-muted-foreground">
                        · {row.packageRef}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.boy.name}
                      {row.status === 'failed' && row.failReason
                        ? ` · ${row.failReason}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={row.status} />
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(row.deliveredAt ?? row.createdAt),
                        { addSuffix: true },
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
