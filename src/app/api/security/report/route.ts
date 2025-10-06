import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ComplianceManager } from '@/lib/compliance-manager';
import { AuditLogger } from '@/lib/audit-logger';
import { RateLimiter } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - allow incident reports but limit frequency
    const rateLimitResult = await RateLimiter.checkRateLimit(req, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 reports per hour
    });

    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many incident reports. Please try again later.',
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
      await AuditLogger.logSecurity(undefined, 'unauthorized_access', 'high', {
        endpoint: '/api/security/report',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const {
      incidentType,
      severity,
      description,
      affectedUsers,
      details
    } = body;

    // Validate required fields
    if (!incidentType || !description) {
      return new NextResponse(JSON.stringify({
        error: 'Incident type and description are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate incident type
    const validTypes = ['breach', 'unauthorized_access', 'data_leak', 'malware', 'other'];
    if (!validTypes.includes(incidentType)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid incident type'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const finalSeverity = severity && validSeverities.includes(severity) ? severity : 'medium';

    // Report the security incident
    await ComplianceManager.reportSecurityIncident(
      incidentType,
      finalSeverity as 'low' | 'medium' | 'high' | 'critical',
      description,
      affectedUsers,
      session.user.id,
      {
        ...details,
        reportedBy: session.user.email,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent'),
      }
    );

    // Log the incident report
    await AuditLogger.logSecurity(session.user.id, 'incident_reported_by_user', finalSeverity as any, {
      incidentType,
      description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
    });

    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Security incident reported successfully',
      data: {
        incidentType,
        severity: finalSeverity,
        reportedAt: new Date().toISOString(),
        reportedBy: session.user.id,
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error reporting security incident:', error);

    // Log the error
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session) {
        await AuditLogger.logSecurity(session.user.id, 'incident_report_error', 'medium', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log incident report error:', logError);
    }

    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Authorization - only admins can view incidents
    const isAdmin = session.user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      await AuditLogger.logSecurity(session.user.id, 'insufficient_permissions', 'medium', {
        endpoint: '/api/security/report',
        requiredRole: 'admin',
      });
      return new NextResponse(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as 'open' | 'investigating' | 'resolved' | 'closed' | null;
    const limit = url.searchParams.get('limit');

    // Get security incidents
    const incidents = await ComplianceManager.getSecurityIncidents(
      status || undefined,
      limit ? parseInt(limit) : 50
    );

    // Audit the access
    await AuditLogger.logDataAccess(session.user.id, 'view', 'security_incidents', 'system', {
      status,
      resultCount: incidents.length,
    });

    return new NextResponse(JSON.stringify({
      success: true,
      data: incidents,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching security incidents:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}