'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { format } from 'date-fns';
import { AxiosError } from 'axios';
import { ArrowLeft, CheckCircle2, Ban } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  PlanBadge,
  StoreStatusBadge,
  SubStatusBadge,
} from '@/components/admin/badges';
import { fetchStore, updateStore } from '@/lib/admin-queries';
import type { Plan } from '@/types/admin';

const PLANS: Plan[] = ['starter', 'growth', 'enterprise'];

export default function StoreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const { data: store, isLoading } = useQuery({
    queryKey: ['admin', 'store', id],
    queryFn: () => fetchStore(id),
  });

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof updateStore>[1]) =>
      updateStore(id, body),
    onSuccess: (_data, body) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] });
      toast({
        title: body.status
          ? `Store ${body.status === 'active' ? 'activated' : 'suspended'}`
          : 'Plan updated',
      });
      setConfirmSuspend(false);
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          err instanceof AxiosError
            ? (err.response?.data?.error?.message ?? err.message)
            : 'Something went wrong.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Store not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
            <StoreStatusBadge status={store.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Joined {format(new Date(store.createdAt), 'dd MMM yyyy')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {store.status !== 'active' && (
            <Button
              onClick={() => mutation.mutate({ status: 'active' })}
              disabled={mutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Activate
            </Button>
          )}
          {store.status !== 'suspended' && (
            <Button
              variant="destructive"
              onClick={() => setConfirmSuspend(true)}
              disabled={mutation.isPending}
            >
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </Button>
          )}
          <Select
            value={store.plan}
            onValueChange={(plan) => mutation.mutate({ plan: plan as Plan })}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Change plan" />
            </SelectTrigger>
            <SelectContent>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Store profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Store Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
              <Field label="Store name" value={store.name} />
              <Field label="Owner" value={store.owner.name} />
              <Field label="Email" value={store.owner.email ?? '—'} />
              <Field label="Phone" value={store.owner.phone ?? '—'} />
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="col-span-2">
                <PlanBadge plan={store.plan} />
              </dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="col-span-2">
                <StoreStatusBadge status={store.status} />
              </dd>
              <Field
                label="Joined"
                value={format(new Date(store.createdAt), 'dd MMM yyyy')}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
            <CardDescription>Billing status for this store.</CardDescription>
          </CardHeader>
          <CardContent>
            {store.subscription ? (
              <dl className="grid grid-cols-3 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="col-span-2">
                  <PlanBadge plan={store.subscription.plan} />
                </dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="col-span-2">
                  <SubStatusBadge status={store.subscription.status} />
                </dd>
                <Field
                  label="Renews"
                  value={format(
                    new Date(store.subscription.currentPeriodEnd),
                    'dd MMM yyyy',
                  )}
                />
                <Field label="Gateway" value={store.subscription.gateway} />
              </dl>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No active subscription</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This store is on the free trial.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Delivery boys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Delivery Boys ({store.boyCount} active)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {store.deliveryBoys.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No delivery boys yet.
              </p>
            ) : (
              <ul className="divide-y">
                {store.deliveryBoys.map((boy) => (
                  <li
                    key={boy.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{boy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {boy.phone ?? 'No phone'}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        boy.isActive
                          ? 'border-transparent bg-green-100 text-green-700'
                          : 'border-transparent bg-slate-100 text-slate-600'
                      }
                    >
                      {boy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {store.recentSessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No delivery sessions yet.
              </p>
            ) : (
              <ul className="divide-y">
                {store.recentSessions.slice(0, 5).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{session.boy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.date), 'dd MMM yyyy')} ·{' '}
                        {session.packageCount} packages
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {session.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend confirmation */}
      <Dialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {store.name}?</DialogTitle>
            <DialogDescription>
              The store owner and their delivery boys will lose access until the
              store is reactivated. You can activate it again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSuspend(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate({ status: 'suspended' })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Suspending…' : 'Suspend store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/stores"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to stores
    </Link>
  );
}

/** A labelled read-only field in a 3-column definition list. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{value}</dd>
    </>
  );
}
