import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { Header } from '@/components/layout/Header';

/**
 * Store-owner dashboard shell: sidebar + header around the page content.
 * Middleware already blocks unauthenticated access; here we additionally send
 * super admins to their own panel so the dashboard stays store_owner-scoped.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }
  if (session.user.role === 'super_admin') {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <Header title="Store Dashboard" />
        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
