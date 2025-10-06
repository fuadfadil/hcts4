import { NextRequest, NextResponse } from 'next/server';
import { SecurityMiddleware } from '@/lib/security-middleware';

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();

  // Apply security headers based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  const config = isDevelopment
    ? SecurityMiddleware.getDevelopmentConfig()
    : SecurityMiddleware.getProductionConfig();

  return SecurityMiddleware.applySecurityHeaders(response, config);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};