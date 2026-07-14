'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PlanBadge, StoreStatusBadge } from '@/components/admin/badges';
import { fetchStores } from '@/lib/admin-queries';
import type { StoreListItem, StoreStatus } from '@/types/admin';

const PAGE_SIZE = 20;

type StatusTab = 'all' | StoreStatus;
const TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
];

type SortKey = 'name' | 'owner' | 'plan' | 'status' | 'boyCount' | 'createdAt';

/** Comparable value for a store under a given sort key. */
function sortValue(store: StoreListItem, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return store.name.toLowerCase();
    case 'owner':
      return store.owner.name.toLowerCase();
    case 'plan':
      return store.plan;
    case 'status':
      return store.status;
    case 'boyCount':
      return store.boyCount;
    case 'createdAt':
      return new Date(store.createdAt).getTime();
  }
}

export default function StoresListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'createdAt',
    dir: 'desc',
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'stores', page],
    queryFn: () => fetchStores(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Search + status filtering + sorting are applied client-side over the current
  // page (the API paginates but doesn't yet support search/filter params).
  const rows = useMemo(() => {
    let result = data?.stores ?? [];
    if (tab !== 'all') result = result.filter((s) => s.status === tab);

    const q = search.trim().toLowerCase();
    if (q) result = result.filter((s) => s.name.toLowerCase().includes(q));

    return [...result].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, tab, search, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stores</h1>
        <p className="text-sm text-muted-foreground">
          Every store on the platform. {total} total.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by store name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Store Name"
                    active={sort.key === 'name'}
                    onClick={() => toggleSort('name')}
                  />
                  <SortableHead
                    label="Owner"
                    active={sort.key === 'owner'}
                    onClick={() => toggleSort('owner')}
                  />
                  <SortableHead
                    label="Plan"
                    active={sort.key === 'plan'}
                    onClick={() => toggleSort('plan')}
                  />
                  <SortableHead
                    label="Status"
                    active={sort.key === 'status'}
                    onClick={() => toggleSort('status')}
                  />
                  <SortableHead
                    label="Boys"
                    active={sort.key === 'boyCount'}
                    onClick={() => toggleSort('boyCount')}
                  />
                  <SortableHead
                    label="Joined"
                    active={sort.key === 'createdAt'}
                    onClick={() => toggleSort('createdAt')}
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No stores match this view.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((store) => (
                    <TableRow
                      key={store.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/stores/${store.id}`)}
                    >
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.owner.name}</TableCell>
                      <TableCell>
                        <PlanBadge plan={store.plan} />
                      </TableCell>
                      <TableCell>
                        <StoreStatusBadge status={store.status} />
                      </TableCell>
                      <TableCell>{store.boyCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(store.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/stores/${store.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A clickable table header cell that toggles sorting on its column. */
function SortableHead({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        <ChevronsUpDown
          className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground/50'}`}
        />
      </button>
    </TableHead>
  );
}
