import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AuditLogger } from '@/lib/audit-logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { SecurityMiddleware } from '@/lib/security-middleware';

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await RateLimiter.checkRateLimit(req, RateLimiter.CONFIGS.API);
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Authentication
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      await AuditLogger.logSecurity(undefined, 'unauthorized_access', 'medium', {
        endpoint: '/api/audit/logs',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });
      const errorResponse = new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
      return SecurityMiddleware.applySecurityHeaders(errorResponse, SecurityMiddleware.getAPIConfig());
    }

    // Authorization - only admins can access audit logs
    // In a real app, you'd check user roles here
    const isAdmin = session.user.email === process.env.ADMIN_EMAIL; // Simple check for demo
    if (!isAdmin) {
      await AuditLogger.logSecurity(session.user.id, 'insufficient_permissions', 'medium', {
        endpoint: '/api/audit/logs',
        requiredRole: 'admin',
      });
      const errorResponse = new NextResponse(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
      return SecurityMiddleware.applySecurityHeaders(errorResponse, SecurityMiddleware.getAPIConfig());
    }

    // Parse query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const filters = {
      userId: userId || undefined,
      action: action || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    };

    // Get audit logs
    const logs = await AuditLogger.getLogs(filters);

    // Audit the access
    await AuditLogger.logDataAccess(session.user.id, 'view', 'audit_logs', 'system', {
      filters,
      resultCount: logs.length,
    });

    const response = new NextResponse(JSON.stringify({
      success: true,
      data: logs,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: logs.length === filters.limit,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Apply security headers
    return SecurityMiddleware.applySecurityHeaders(response, SecurityMiddleware.getAPIConfig());

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    const errorResponse = new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    return SecurityMiddleware.applySecurityHeaders(errorResponse, SecurityMiddleware.getAPIConfig());
  }
}