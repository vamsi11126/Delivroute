'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Package,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Live Map', href: '/dashboard/map', icon: Map },
  { label: 'Deliveries', href: '/dashboard/deliveries', icon: Package },
  { label: 'Team', href: '/dashboard/team', icon: Users },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-lg font-bold">
          Deliv<span className="text-primary">Route</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          // Exact match for the index route, prefix match for the rest, so a
          // nested page keeps its parent nav item highlighted.
          const active =
            item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
