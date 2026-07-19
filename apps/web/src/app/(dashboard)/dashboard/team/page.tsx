'use client';

import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { format } from 'date-fns';
import { AxiosError } from 'axios';
import { UserPlus, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { fetchDailyReport, fetchTeam } from '@/lib/store-queries';
import type { TeamMember } from '@/types/store';

/** Soft warning threshold — the starter plan caps at 5 active delivery boys. */
const SOFT_LIMIT = 5;

/** Two-letter initials for the avatar fallback. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const teamQuery = useQuery({
    queryKey: ['store', 'team'],
    queryFn: fetchTeam,
  });

  // Today's per-boy delivered counts for the "delivered today" column.
  const reportQuery = useQuery({
    queryKey: ['store', 'report', 'today'],
    queryFn: () => fetchDailyReport(format(new Date(), 'yyyy-MM-dd')),
  });

  const deliveredByBoy = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of reportQuery.data?.perBoy ?? []) {
      map.set(b.boyId, b.delivered);
    }
    return map;
  }, [reportQuery.data]);

  const activeCount = useMemo(
    () => (teamQuery.data ?? []).filter((m) => m.isActive).length,
    [teamQuery.data],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<TeamMember | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/store/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'team'] });
      toast({ title: 'Delivery boy deactivated' });
      setToDeactivate(null);
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Could not deactivate',
        description: apiErrorMessage(err),
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/store/team/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'team'] });
      toast({ title: 'Delivery boy activated' });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Could not activate',
        description: apiErrorMessage(err),
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active delivery {activeCount === 1 ? 'boy' : 'boys'}.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Delivery Boy
        </Button>
      </div>

      {activeCount >= SOFT_LIMIT && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Approaching your plan limit</AlertTitle>
          <AlertDescription>
            You have {activeCount} active delivery boys. Upgrade your plan if you
            need to add more.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Boys</CardTitle>
        </CardHeader>
        <CardContent>
          {teamQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (teamQuery.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No delivery boys yet. Add your first one to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {teamQuery.data!.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-4 py-3"
                >
                  <Avatar>
                    <AvatarFallback className="text-xs font-semibold">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.phone ?? 'No phone'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {deliveredByBoy.get(member.id) ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      delivered today
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      member.isActive
                        ? 'border-transparent bg-green-100 text-green-700'
                        : 'border-transparent bg-slate-100 text-slate-600'
                    }
                  >
                    {member.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {member.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setToDeactivate(member)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                      onClick={() => activateMutation.mutate(member.id)}
                      disabled={activateMutation.isPending}
                    >
                      {activateMutation.isPending &&
                      activateMutation.variables === member.id
                        ? 'Activating…'
                        : 'Activate'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddBoyDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* Deactivate confirmation */}
      <Dialog
        open={!!toDeactivate}
        onOpenChange={(open) => !open && setToDeactivate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate delivery boy?</DialogTitle>
            <DialogDescription>
              {toDeactivate?.name} will no longer be able to run deliveries and
              their slot frees up against your plan limit. You can re-invite them
              later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDeactivate(null)}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                toDeactivate && deactivateMutation.mutate(toDeactivate.id)
              }
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Add-a-delivery-boy dialog: name + +91 phone → POST /store/team. */
function AddBoyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issuedOtp, setIssuedOtp] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setPhone('');
    setIssuedOtp(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const digits = phone.replace(/\D/g, '');
      const res = await api.post<{ data: { sent: boolean; otp?: string } }>(
        '/store/team',
        { name: name.trim(), phone: `+91${digits}` },
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['store', 'team'] });
      if (data.otp) {
        // No SMS provider yet — keep the dialog open and show the OTP so the
        // owner can share it with the delivery boy directly.
        setIssuedOtp(data.otp);
      } else {
        toast({
          title: 'Invite sent',
          description: `An OTP was sent to +91${phone.replace(/\D/g, '')}. Ask ${name.trim()} to enter it in the DelivRoute app.`,
        });
        reset();
        onOpenChange(false);
      }
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Could not add delivery boy',
        description: apiErrorMessage(err),
      });
    },
  });

  const digits = phone.replace(/\D/g, '');
  const canSubmit = name.trim().length > 0 && digits.length === 10;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        {issuedOtp ? (
          <>
            <DialogHeader>
              <DialogTitle>Share this with {name.trim() || 'your delivery boy'}</DialogTitle>
              <DialogDescription>
                Send these steps via WhatsApp or tell them verbally. The code
                expires in 10 minutes — re-invite to get a fresh one.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center rounded-md border bg-muted py-6">
              <span className="font-mono text-4xl font-bold tracking-[0.5em]">
                {issuedOtp}
              </span>
            </div>
            <ol className="list-decimal space-y-1 rounded-md border bg-muted/50 p-4 pl-8 text-sm">
              <li>Download the DelivRoute app</li>
              <li>
                Enter phone:{' '}
                <span className="font-mono font-semibold">+91{phone.replace(/\D/g, '')}</span>
              </li>
              <li>
                Enter OTP: <span className="font-mono font-semibold">{issuedOtp}</span>{' '}
                (valid for 10 minutes)
              </li>
              <li>Complete profile setup</li>
            </ol>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const digits = phone.replace(/\D/g, '');
                  void navigator.clipboard.writeText(
                    `DelivRoute setup:\n1. Download the DelivRoute app\n2. Enter phone: +91${digits}\n3. Enter OTP: ${issuedOtp} (valid for 10 minutes)\n4. Complete profile setup`,
                  );
                  toast({ title: 'Copied', description: 'Instructions copied to clipboard.' });
                }}
              >
                Copy instructions
              </Button>
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add delivery boy</DialogTitle>
              <DialogDescription>
                We&apos;ll generate a one-time code — share it with them to enter
                in the mobile app and join your team.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) mutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ravi Kumar"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +91
                  </span>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    placeholder="98765 43210"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit || mutation.isPending}>
                  {mutation.isPending ? 'Generating…' : 'Generate code'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Pull the API's error message out of an Axios error, with a fallback. */
function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return (
      err.response?.data?.error?.message ??
      err.message ??
      'Something went wrong.'
    );
  }
  return 'Something went wrong.';
}
