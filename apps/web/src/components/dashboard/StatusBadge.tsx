import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PackageStatus } from '@/types/store';

/** Tailwind classes per package status — consistent colours across the app. */
const STATUS_STYLES: Record<PackageStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  delivered: 'bg-green-100 text-green-700 hover:bg-green-100',
  failed: 'bg-red-100 text-red-700 hover:bg-red-100',
  skipped: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
};

export function StatusBadge({ status }: { status: PackageStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-transparent capitalize', STATUS_STYLES[status])}
    >
      {status}
    </Badge>
  );
}
