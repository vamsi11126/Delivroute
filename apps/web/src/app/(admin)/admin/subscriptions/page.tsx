'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PlanBadge, SubStatusBadge } from '@/components/admin/badges';
import { fetchSubscriptions } from '@/lib/admin-queries';
import type { SubStatus } from '@/types/admin';

// "trial" isn't a SubStatus (trial stores have no subscription record), so it's
// a client-only tab that always shows the empty state.
type SubTab = 'all' | SubStatus | 'trial';
const TABS: { value: SubTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'trial', label: 'Trial' },
];

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<SubTab>('all');

  // Fetch all subscriptions once and filter client-side; the "trial" tab has no
  // matching status so filtering yields an empty list by design.
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => fetchSubscriptions(),
  });

  const rows = useMemo(() => {
    const subs = data ?? [];
    if (tab === 'all') return subs;
    if (tab === 'trial') return [];
    return subs.filter((s) => s.status === tab);
  }, [data, tab]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Billing subscriptions across all stores.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead>Gateway</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {tab === 'trial'
                        ? 'Trial stores have no subscription record.'
                        : 'No subscriptions in this view.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className={cn(
                        sub.status === 'past_due' && 'bg-amber-50 hover:bg-amber-100',
                      )}
                    >
                      <TableCell className="font-medium">
                        {sub.store.name}
                      </TableCell>
                      <TableCell>
                        <PlanBadge plan={sub.plan} />
                      </TableCell>
                      <TableCell>
                        <SubStatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sub.currentPeriodEnd), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="capitalize">{sub.gateway}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
