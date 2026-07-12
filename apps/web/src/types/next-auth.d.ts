import type { DefaultSession } from 'next-auth';
import type { AuthUser } from './index';

/**
 * Augment NextAuth's Session/User/JWT with the DelivRoute auth payload so the
 * access/refresh tokens and the typed user object are available on
 * `useSession()` / `getServerSession()` without casts.
 */
declare module 'next-auth' {
  interface Session {
    user: AuthUser & DefaultSession['user'];
    accessToken: string;
    error?: 'RefreshAccessTokenError';
  }

  interface User {
    id: string;
    role: AuthUser['role'];
    storeId: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    /** Unix seconds when the access token expires (decoded from the JWT). */
    accessTokenExpires: number;
    error?: 'RefreshAccessTokenError';
  }
}
