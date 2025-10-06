import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ComplianceManager } from '@/lib/compliance-manager';
import { RateLimiter } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';

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
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get security statistics
    const stats = await ComplianceManager.getComplianceStatistics();

    // Get rate limit status for current user
    const rateLimitStatus = await RateLimiter.getRateLimitStatus(session.user.id);

    // Check system health indicators
    const healthCheck = {
      database: true, // Assume healthy if we reach this point
      authentication: !!session,
      rateLimiting: true,
      encryption: true, // Assume healthy
      timestamp: new Date().toISOString(),
    };

    // Audit the status check
    await AuditLogger.logSecurity(session.user.id, 'security_status_check', 'low', {
      endpoint: '/api/security/status',
    });

    return new NextResponse(JSON.stringify({
      success: true,
      data: {
        health: healthCheck,
        compliance: stats,
        rateLimit: rateLimitStatus,
        user: {
          id: session.user.id,
          email: session.user.email,
          lastActivity: new Date().toISOString(),
        },
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': healthCheck.database && healthCheck.authentication ? 'healthy' : 'unhealthy',
      },
    });

  } catch (error) {
    console.error('Error fetching security status:', error);

    // Return degraded status
    return new NextResponse(JSON.stringify({
      success: false,
      error: 'Security status check failed',
      data: {
        health: {
          database: false,
          authentication: false,
          rateLimiting: false,
          encryption: false,
          timestamp: new Date().toISOString(),
        },
      },
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Check': 'unhealthy',
      },
    });
  }
}