'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Store,
  CheckCircle2,
  Users,
  Truck,
  IndianRupee,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanBadge, StoreStatusBadge } from '@/components/admin/badges';
import { fetchAnalytics, fetchStores } from '@/lib/admin-queries';

interface Kpi {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
}

export default function AdminDashboardPage() {
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 60_000,
  });

  const signupsQuery = useQuery({
    queryKey: ['admin', 'stores', 'recent'],
    queryFn: () => fetchStores(1, 5),
    refetchInterval: 60_000,
  });

  const a = analyticsQuery.data;
  const kpis: Kpi[] = [
    {
      label: 'Total Stores',
      value: a?.totalStores ?? 0,
      icon: Store,
      accent: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Active Stores',
      value: a?.activeStores ?? 0,
      icon: CheckCircle2,
      accent: 'bg-green-100 text-green-700',
    },
    {
      label: 'Total Delivery Boys',
      value: a?.totalBoys ?? 0,
      icon: Users,
      accent: 'bg-purple-100 text-purple-700',
    },
    {
      label: 'Deliveries Today',
      value: a?.deliveriesToday ?? 0,
      icon: Truck,
      accent: 'bg-orange-100 text-orange-700',
    },
    {
      label: 'Monthly Revenue',
      value: '₹0',
      icon: IndianRupee,
      accent: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide metrics across all stores. Refreshes every 60s.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {analyticsQuery.isLoading
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
                    {kpi.label === 'Monthly Revenue' && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Razorpay not integrated yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Recent store signups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Store Signups</CardTitle>
          <Link
            href="/admin/stores"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {signupsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (signupsQuery.data?.stores.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No stores have signed up yet.
            </p>
          ) : (
            <ul className="divide-y">
              {signupsQuery.data!.stores.map((store) => (
                <li key={store.id}>
                  <Link
                    href={`/admin/stores/${store.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{store.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {store.owner.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <PlanBadge plan={store.plan} />
                      <StoreStatusBadge status={store.status} />
                      <span className="w-24 text-right text-xs text-muted-foreground">
                        {format(new Date(store.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
