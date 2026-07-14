import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Plan, StoreStatus, SubStatus } from '@/types/admin';

const PLAN_STYLES: Record<Plan, string> = {
  starter: 'bg-slate-100 text-slate-700',
  growth: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const STORE_STATUS_STYLES: Record<StoreStatus, string> = {
  trial: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

const SUB_STATUS_STYLES: Record<SubStatus, string> = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

/** Human labels for the underscore-separated subscription statuses. */
const SUB_STATUS_LABELS: Record<SubStatus, string> = {
  active: 'Active',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
};

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-transparent capitalize', PLAN_STYLES[plan])}
    >
      {plan}
    </Badge>
  );
}

export function StoreStatusBadge({ status }: { status: StoreStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-transparent capitalize', STORE_STATUS_STYLES[status])}
    >
      {status}
    </Badge>
  );
}

export function SubStatusBadge({ status }: { status: SubStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-transparent', SUB_STATUS_STYLES[status])}
    >
      {SUB_STATUS_LABELS[status]}
    </Badge>
  );
}
