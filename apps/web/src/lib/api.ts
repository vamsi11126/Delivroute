import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

/**
 * Browser-side API client for the Express backend.
 *
 * Request interceptor: pulls the access token from the NextAuth session and
 * attaches it as a Bearer header. Token refresh itself is handled inside the
 * NextAuth jwt callback (see src/lib/auth.ts), so getSession() always returns a
 * fresh access token here.
 *
 * Response interceptor: a 401 means the session is no longer valid on the API
 * (refresh already failed upstream) — sign the user out so they re-authenticate.
 *
 * This is for Client Components only. Server Components/route handlers should
 * read the token from getServerSession(authOptions) directly.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(error);
  },
);
