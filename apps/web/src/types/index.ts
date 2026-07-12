/**
 * Client-side mirrors of the API entities. The source of truth is the backend
 * Prisma schema; these stay loose (string unions) so the web app doesn't need
 * to import from the API package.
 */

export type Role = 'super_admin' | 'store_owner' | 'delivery_boy';

export interface AuthUser {
  id: string;
  role: Role;
  storeId: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
}
