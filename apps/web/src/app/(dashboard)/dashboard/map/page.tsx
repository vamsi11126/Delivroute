'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { connectStoreSocket } from '@/lib/socket';
import { fetchLiveFleet, fetchTodayDeliveries } from '@/lib/store-queries';
import type { LocationBroadcast } from '@/types/store';
import type { FleetPin, PinColor } from '@/components/dashboard/FleetMap';

// Leaflet touches `window` on import, so the map must never render on the
// server. Dynamic import with ssr:false keeps it client-only.
const FleetMap = dynamic(() => import('@/components/dashboard/FleetMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** A boy is "active" if their last ping was within this window. */
const RECENT_PING_MS = 5 * 60 * 1000;

/** Live position keyed by boyId, seeded from the API then updated by sockets. */
type LivePosition = { lat: number; lng: number; recordedAt: string };

/** Per-boy details derived from today's packages. */
interface BoyMeta {
  name: string;
  currentStop: string | null;
  currentStopIndex: number;
  remaining: number;
  hasFailed: boolean;
}

export default function LiveFleetPage() {
  const { data: session } = useSession();
  const storeId = session?.user.storeId;
  const accessToken = session?.accessToken;

  const fleetQuery = useQuery({
    queryKey: ['store', 'fleet', 'live'],
    queryFn: fetchLiveFleet,
    refetchInterval: 30_000,
  });

  // Packages power the per-boy popup details (current stop, remaining) and the
  // "has a failed delivery" red-pin rule.
  const deliveriesQuery = useQuery({
    queryKey: ['store', 'deliveries', 'today'],
    queryFn: fetchTodayDeliveries,
    refetchInterval: 30_000,
  });

  const [positions, setPositions] = useState<Record<string, LivePosition>>({});

  // Seed live positions from the fleet snapshot whenever it refreshes. Merge by
  // timestamp so a fresher socket-driven position is never overwritten.
  useEffect(() => {
    if (!fleetQuery.data) return;
    setPositions((prev) => {
      const next = { ...prev };
      for (const entry of fleetQuery.data) {
        const incoming = {
          lat: Number(entry.location.lat),
          lng: Number(entry.location.lng),
          recordedAt: entry.location.recordedAt,
        };
        const current = next[entry.boy.id];
        if (
          !current ||
          new Date(incoming.recordedAt) >= new Date(current.recordedAt)
        ) {
          next[entry.boy.id] = incoming;
        }
      }
      return next;
    });
  }, [fleetQuery.data]);

  // Live location stream over the store's Socket.io namespace.
  useEffect(() => {
    if (!storeId || !accessToken) return;
    const socket = connectStoreSocket(storeId, accessToken);

    socket.on('location:broadcast', (payload: LocationBroadcast) => {
      setPositions((prev) => ({
        ...prev,
        [payload.boyId]: {
          lat: payload.lat,
          lng: payload.lng,
          recordedAt: payload.timestamp,
        },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [storeId, accessToken]);

  // Per-boy derived data from today's packages: name, first pending stop,
  // remaining count, and whether any delivery failed (→ red pin).
  const boyMeta = useMemo(() => {
    const rows = deliveriesQuery.data ?? [];
    const meta = new Map<string, BoyMeta>();

    for (const row of rows) {
      const entry: BoyMeta = meta.get(row.boy.id) ?? {
        name: row.boy.name,
        currentStop: null,
        currentStopIndex: Number.POSITIVE_INFINITY,
        remaining: 0,
        hasFailed: false,
      };
      if (row.status === 'pending') {
        entry.remaining += 1;
        // The lowest-orderIndex pending package is the next stop.
        if (row.orderIndex < entry.currentStopIndex) {
          entry.currentStop = row.addressRaw;
          entry.currentStopIndex = row.orderIndex;
        }
      }
      if (row.status === 'failed') entry.hasFailed = true;
      meta.set(row.boy.id, entry);
    }
    return meta;
  }, [deliveriesQuery.data]);

  const pins = useMemo<FleetPin[]>(() => {
    const now = Date.now();
    return Object.entries(positions).map(([boyId, pos]) => {
      const meta = boyMeta.get(boyId);
      const fleetName = fleetQuery.data?.find((f) => f.boy.id === boyId)?.boy
        .name;
      const recent = now - new Date(pos.recordedAt).getTime() < RECENT_PING_MS;

      let color: PinColor = recent ? 'green' : 'orange';
      if (meta?.hasFailed) color = 'red';

      return {
        boyId,
        name: meta?.name ?? fleetName ?? 'Delivery boy',
        lat: pos.lat,
        lng: pos.lng,
        lastSeen: pos.recordedAt,
        currentStop: meta?.currentStop ?? null,
        remaining: meta?.remaining ?? 0,
        color,
      };
    });
  }, [positions, boyMeta, fleetQuery.data]);

  const isEmpty = !fleetQuery.isLoading && pins.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Fleet</h1>
          <p className="text-sm text-muted-foreground">
            Real-time positions of your delivery boys.
          </p>
        </div>
        <Legend />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="relative h-[600px] p-0">
          {isEmpty ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No active deliveries right now.
              </p>
            </div>
          ) : (
            <FleetMap pins={pins} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Legend() {
  const items = [
    { color: 'bg-green-600', label: 'Active (<5m)' },
    { color: 'bg-orange-600', label: 'Idle (>5m)' },
    { color: 'bg-red-600', label: 'Has failed stop' },
  ];
  return (
    <div className="flex items-center gap-4">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs">
          <span className={`h-3 w-3 rounded-full ${i.color}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
