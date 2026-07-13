'use client';

import { LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

/**
 * Store settings. Fields are read-only placeholders sourced from the session —
 * editing is wired up in a later prompt. The logout action is live.
 */
export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your store profile and account.
        </p>
      </div>

      {/* Store profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Store Profile</CardTitle>
          <CardDescription>
            These details identify your store on DelivRoute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="store-name">Store name</Label>
            <Input
              id="store-name"
              value={session?.user.name ?? ''}
              readOnly
              disabled
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact-email">Contact email</Label>
            <Input
              id="contact-email"
              type="email"
              value={session?.user.email ?? '—'}
              readOnly
              disabled
            />
          </div>
          <p className="text-sm text-muted-foreground">Update coming soon.</p>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>Sign out of the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
