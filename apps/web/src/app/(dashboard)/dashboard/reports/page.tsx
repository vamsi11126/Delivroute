'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
} from 'date-fns';
import { Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchDailyReport } from '@/lib/store-queries';

interface BoyBreakdown {
  boyId: string;
  name: string;
  delivered: number;
  failed: number;
  total: number;
}

interface AggregatedReport {
  totalPackages: number;
  delivered: number;
  failed: number;
  boysActive: number;
  perBoy: BoyBreakdown[];
}

function successRate(delivered: number, failed: number): number {
  const attempts = delivered + failed;
  return attempts === 0 ? 0 : Math.round((delivered / attempts) * 100);
}

/**
 * Fetch one daily report per day in [from, to] and fold them into a single
 * store-wide summary plus a per-boy breakdown.
 */
async function fetchRangeReport(
  from: string,
  to: string,
): Promise<AggregatedReport> {
  const days = eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  const reports = await Promise.all(days.map((d) => fetchDailyReport(d)));

  const perBoy = new Map<string, BoyBreakdown>();
  let delivered = 0;
  let failed = 0;
  let totalPackages = 0;

  for (const report of reports) {
    for (const boy of report.perBoy) {
      const entry =
        perBoy.get(boy.boyId) ??
        { boyId: boy.boyId, name: boy.name, delivered: 0, failed: 0, total: 0 };
      entry.delivered += boy.delivered;
      entry.failed += boy.failed;
      entry.total += boy.total;
      perBoy.set(boy.boyId, entry);

      delivered += boy.delivered;
      failed += boy.failed;
      totalPackages += boy.total;
    }
  }

  return {
    totalPackages,
    delivered,
    failed,
    boysActive: perBoy.size,
    perBoy: Array.from(perBoy.values()).sort(
      (a, b) => b.delivered - a.delivered,
    ),
  };
}

/** Build and trigger download of a CSV from the per-boy breakdown. */
function exportCsv(report: AggregatedReport, from: string, to: string): void {
  const header = ['Delivery Boy', 'Delivered', 'Failed', 'Total', 'Success %'];
  const lines = report.perBoy.map((b) =>
    [
      `"${b.name.replace(/"/g, '""')}"`,
      b.delivered,
      b.failed,
      b.total,
      successRate(b.delivered, b.failed),
    ].join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `delivroute-report_${from}_to_${to}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(() => format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [to, setTo] = useState(today);

  const rangeValid = from <= to;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store', 'reports', 'range', from, to],
    queryFn: () => fetchRangeReport(from, to),
    enabled: rangeValid,
  });

  const summary = useMemo(
    () => [
      { label: 'Total Packages', value: data?.totalPackages ?? 0 },
      {
        label: 'Success Rate',
        value:
          data === undefined
            ? '—'
            : `${successRate(data.delivered, data.failed)}%`,
      },
      { label: 'Boys Active', value: data?.boysActive ?? 0 },
      {
        label: 'Avg Packages / Boy',
        value:
          data && data.boysActive > 0
            ? Math.round(data.totalPackages / data.boysActive)
            : 0,
      },
    ],
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Delivery performance over a date range.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => data && exportCsv(data, from, to)}
            disabled={!data || data.perBoy.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {!rangeValid && (
        <p className="text-sm text-red-600">
          The start date must be on or before the end date.
        </p>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className="text-3xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-boy breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-Boy Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-red-600">
              Failed to load the report. Try a smaller date range.
            </p>
          ) : (data?.perBoy.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No delivery activity in this range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Boy</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.perBoy.map((boy) => (
                  <TableRow key={boy.boyId}>
                    <TableCell className="font-medium">{boy.name}</TableCell>
                    <TableCell className="text-right text-green-700">
                      {boy.delivered}
                    </TableCell>
                    <TableCell className="text-right text-red-700">
                      {boy.failed}
                    </TableCell>
                    <TableCell className="text-right">
                      {successRate(boy.delivered, boy.failed)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
