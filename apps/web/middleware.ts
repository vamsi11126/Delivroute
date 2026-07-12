import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

/**
 * Route protection:
 *  - /dashboard/*  → any authenticated user
 *  - /admin/*      → authenticated AND role === 'super_admin'
 *  - everything else (/, /login, /register, /api/*) is public
 *
 * withAuth runs the `authorized` callback to decide access; when it returns
 * false NextAuth redirects to the `signIn` page (/login). The middleware body
 * additionally bounces non-admins away from /admin even if authenticated.
 */
export default withAuth(
  function middleware(req) {
    const { token, nextUrl } = { token: req.nextauth.token, nextUrl: req.nextUrl };

    // Authenticated but wrong role for the admin panel → send to the dashboard.
    if (nextUrl.pathname.startsWith('/admin') && token?.user?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: '/login' },
  },
);

// Only guard the two protected areas; public routes are never matched so they
// stay reachable without a session.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
