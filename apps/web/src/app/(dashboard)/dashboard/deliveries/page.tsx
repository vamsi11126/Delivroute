'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { connectStoreSocket } from '@/lib/socket';
import { fetchTodayDeliveries } from '@/lib/store-queries';
import type { DeliveryRow, DeliveryStatusEvent } from '@/types/store';

type FilterTab = 'all' | 'pending' | 'delivered' | 'failed';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

/** ISO timestamp a row occurred at, for the Time column and sorting. */
function rowTime(row: DeliveryRow): string {
  return row.deliveredAt ?? row.createdAt;
}

export default function DeliveriesPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const storeId = session?.user.storeId;
  const accessToken = session?.accessToken;

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DeliveryRow | null>(null);

  // NOTE: the /store/sessions endpoint currently returns today's sessions only;
  // `date` is wired into the query key so this page updates automatically once
  // the API accepts a date range.
  const { data, isLoading } = useQuery({
    queryKey: ['store', 'deliveries', 'today', date],
    queryFn: fetchTodayDeliveries,
    refetchInterval: 30_000,
  });

  // A package status change anywhere in the store refreshes the table live.
  useEffect(() => {
    if (!storeId || !accessToken) return;
    const socket = connectStoreSocket(storeId, accessToken);
    socket.on('delivery:status', (_payload: DeliveryStatusEvent) => {
      queryClient.invalidateQueries({
        queryKey: ['store', 'deliveries', 'today'],
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [storeId, accessToken, queryClient]);

  const rows = useMemo(() => {
    let result = data ?? [];
    if (tab !== 'all') result = result.filter((r) => r.status === tab);

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.packageRef.toLowerCase().includes(q),
      );
    }
    return [...result].sort(
      (a, b) => new Date(rowTime(b)).getTime() - new Date(rowTime(a)).getTime(),
    );
  }, [data, tab, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
        <p className="text-sm text-muted-foreground">
          Every package and its delivery outcome.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="relative flex-1 space-y-1">
          <Label htmlFor="search">Search</Label>
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Customer name or package ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
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
                  <TableHead>Package Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery Boy</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No packages match this view.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(row)}
                    >
                      <TableCell className="font-medium">
                        {row.packageRef}
                      </TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {row.addressRaw}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>{row.boy.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(rowTime(row)), 'HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PackageDetailDialog
        row={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

/** Detail dialog with a synthesized status timeline for a single package. */
function PackageDetailDialog({
  row,
  onOpenChange,
}: {
  row: DeliveryRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  // The API doesn't yet expose DeliveryLog rows, so we reconstruct the timeline
  // from the package's own timestamps.
  const timeline: { label: string; at: string; note?: string }[] = [
    { label: 'Created', at: row.createdAt },
  ];
  if (row.status === 'delivered' && row.deliveredAt) {
    timeline.push({ label: 'Delivered', at: row.deliveredAt });
  }
  if (row.status === 'failed') {
    timeline.push({
      label: 'Failed',
      at: row.deliveredAt ?? row.createdAt,
      note: row.failReason ?? undefined,
    });
  }

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.packageRef}
            <StatusBadge status={row.status} />
          </DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Customer</dt>
          <dd className="col-span-2">{row.customerName}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd className="col-span-2">{row.addressRaw}</dd>
          <dt className="text-muted-foreground">Delivery boy</dt>
          <dd className="col-span-2">{row.boy.name}</dd>
          {row.status === 'failed' && (
            <>
              <dt className="text-muted-foreground">Fail reason</dt>
              <dd className="col-span-2 text-red-600">
                {row.failReason ?? '—'}
              </dd>
            </>
          )}
        </dl>

        <div>
          <p className="mb-2 text-sm font-medium">Status timeline</p>
          <ol className="space-y-3">
            {timeline.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(step.at), 'dd MMM yyyy, HH:mm')}
                  </p>
                  {step.note && (
                    <p className="text-xs text-red-600">{step.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
