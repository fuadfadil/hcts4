import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ComplianceManager } from '@/lib/compliance-manager';
import { AuditLogger } from '@/lib/audit-logger';
import { RateLimiter } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - stricter for data deletion
    const rateLimitResult = await RateLimiter.checkRateLimit(req, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // Only 3 deletion requests per hour
    });

    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many deletion requests. Please try again later.',
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
        endpoint: '/api/gdpr/delete',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Reason for deletion is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process GDPR data deletion
    const deletionRequest = {
      userId: session.user.id,
      reason: reason.trim(),
      requestedBy: session.user.id,
      details: {
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
      },
    };

    const result = await ComplianceManager.processDataDeletion(deletionRequest);

    // Log the successful deletion request
    await AuditLogger.logCompliance(session.user.id, 'gdpr.deletion_completed', {
      result,
      requestedBy: session.user.id,
    });

    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Data deletion request processed successfully',
      data: result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing GDPR deletion:', error);

    // Log the error
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session) {
        await AuditLogger.logSecurity(session.user.id, 'gdpr_deletion_error', 'high', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log GDPR deletion error:', logError);
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

    // Get user's compliance report
    const report = await ComplianceManager.generateComplianceReport(session.user.id);

    return new NextResponse(JSON.stringify({
      success: true,
      data: report,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching GDPR compliance report:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}