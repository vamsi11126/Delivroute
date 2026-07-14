'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchAnalytics, fetchStores } from '@/lib/admin-queries';
import type { Plan, StoreStatus } from '@/types/admin';

// Aggregate the plan/status breakdown from the stores list (analytics doesn't
// expose per-plan counts). Covers up to this many stores.
const STORES_SAMPLE = 100;

const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

export default function RevenuePage() {
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: fetchAnalytics,
  });

  const storesQuery = useQuery({
    queryKey: ['admin', 'stores', 'revenue-sample'],
    queryFn: () => fetchStores(1, STORES_SAMPLE),
  });

  const { byPlan, byStatus, loaded, total } = useMemo(() => {
    const stores = storesQuery.data?.stores ?? [];
    const plan: Record<Plan, number> = { starter: 0, growth: 0, enterprise: 0 };
    const status: Record<StoreStatus, number> = {
      trial: 0,
      active: 0,
      suspended: 0,
    };
    for (const s of stores) {
      plan[s.plan] += 1;
      status[s.status] += 1;
    }
    return {
      byPlan: plan,
      byStatus: status,
      loaded: stores.length,
      total: storesQuery.data?.meta.total ?? 0,
    };
  }, [storesQuery.data]);

  const chartData = (Object.keys(PLAN_LABELS) as Plan[]).map((plan) => ({
    plan: PLAN_LABELS[plan],
    stores: byPlan[plan],
  }));

  const cards = [
    {
      label: 'MRR',
      value: '₹0',
      note: 'Razorpay not integrated yet',
    },
    {
      label: 'Active Stores',
      value: analyticsQuery.data?.activeStores ?? byStatus.active,
    },
    { label: 'Trial Stores', value: byStatus.trial },
    { label: 'Suspended Stores', value: byStatus.suspended },
  ];

  const loading = analyticsQuery.isLoading || storesQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">
          Platform revenue and store distribution.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Revenue tracking coming soon</AlertTitle>
        <AlertDescription>
          Revenue tracking will be available after Razorpay integration. Figures
          below reflect store counts, not billed amounts.
        </AlertDescription>
      </Alert>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))
          : cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                  {card.note && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Stores by plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stores by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="plan" tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Bar
                      dataKey="stores"
                      name="Stores"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {total > loaded && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing distribution for the {loaded} most recent of {total}{' '}
                  stores.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
