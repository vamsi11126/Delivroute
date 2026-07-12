import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthUser, Role } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

/** Standard backend envelope. */
interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

interface LoginData {
  user: {
    id: string;
    role: Role;
    storeId: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Decode a JWT's `exp` (Unix seconds) without verifying the signature — we only
 * need the expiry to decide when to refresh. Verification happens server-side
 * on the API. Falls back to a 15-minute window if the token can't be decoded.
 */
function getAccessTokenExpiry(accessToken: string): number {
  try {
    const [, payload] = accessToken.split('.');
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf8'),
    ) as { exp?: number };
    if (decoded.exp) return decoded.exp * 1000;
  } catch {
    // fall through to default
  }
  return Date.now() + 15 * 60 * 1000;
}

/**
 * Exchange the refresh token for a fresh access/refresh pair via the API's
 * rotating-refresh endpoint. On failure, flags the token so the client can
 * force a re-login.
 */
async function refreshAccessToken(token: {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  user: AuthUser;
}) {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    const body = (await res.json()) as Envelope<{
      accessToken: string;
      refreshToken: string;
    }>;

    if (!res.ok || !body.success) {
      throw new Error(body.error?.message ?? 'Refresh failed');
    }

    return {
      ...token,
      accessToken: body.data.accessToken,
      // Rotation: the API issues a new refresh token; fall back to the old one
      // if the endpoint ever omits it.
      refreshToken: body.data.refreshToken ?? token.refreshToken,
      accessTokenExpires: getAccessTokenExpiry(body.data.accessToken),
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' as const };
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
          }),
        });

        const body = (await res.json()) as Envelope<LoginData>;

        if (!res.ok || !body.success) {
          // Returning null surfaces NextAuth's generic CredentialsSignin error.
          return null;
        }

        const { user, accessToken, refreshToken } = body.data;
        // The object returned here becomes the `user` arg to the jwt callback.
        return {
          id: user.id,
          role: user.role,
          storeId: user.storeId,
          name: user.name,
          email: user.email ?? null,
          phone: user.phone ?? null,
          accessToken,
          refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: seed the token from the authorize() result.
      if (user) {
        return {
          ...token,
          user: {
            id: user.id,
            role: user.role,
            storeId: user.storeId,
            name: user.name,
            email: user.email ?? null,
            phone: user.phone ?? null,
          },
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: getAccessTokenExpiry(user.accessToken),
        };
      }

      // Subsequent calls: return the token while the access token is still
      // valid (60s early to avoid races), otherwise rotate via /auth/refresh.
      if (Date.now() < token.accessTokenExpires - 60 * 1000) {
        return token;
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = { ...session.user, ...token.user };
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
