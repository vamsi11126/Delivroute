import { Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * Subscription overview. Plan details are static placeholders for now —
 * Razorpay billing and plan upgrades land in a later prompt (Prompt 17).
 */
export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Your current plan and billing details.
        </p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <CardDescription>Your active DelivRoute plan.</CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="border-transparent bg-green-100 text-green-700"
            >
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Detail label="Plan" value="Starter" />
            <Detail label="Max Delivery Boys" value="5" />
            <Detail label="Status" value="Active" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Need more delivery boys? Upgrade to Growth or Enterprise.
            </p>
            {/* Disabled buttons don't emit hover events, so the title lives on
                the wrapping span to still surface the "Coming soon" tooltip. */}
            <span title="Coming soon" className="inline-block">
              <Button disabled>Upgrade Plan</Button>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Billing info placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing</CardTitle>
          <CardDescription>
            Invoices and payment method will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No billing information yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Online payments via Razorpay are coming soon. You&apos;re currently
              on the free trial.
            </p>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Up to 5 active delivery boys
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Live fleet tracking &amp; route optimization
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Delivery reports &amp; analytics
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/** A labelled read-only value used in the plan summary grid. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
