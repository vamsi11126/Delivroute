import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Entry point: route users to the right surface based on their session/role.
 * Unauthenticated → login; super_admin → admin panel; everyone else → dashboard.
 */
export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }
  if (session.user.role === 'super_admin') {
    redirect('/admin');
  }
  redirect('/dashboard');
}
