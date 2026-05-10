import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/'];
const loginRoute = '/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing a protected route
  const isProtectedRoute = protectedRoutes.includes(pathname);
  
  // Check for auth cookie
  const authCookie = request.cookies.get('galrs_session');

  if (isProtectedRoute && !authCookie) {
    // Not authenticated and trying to access protected route
    // Redirect to login
    const loginUrl = new URL(loginRoute, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === loginRoute && authCookie) {
    // Already authenticated but going to login page
    // Redirect to dashboard
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login'],
};