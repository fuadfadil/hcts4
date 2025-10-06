import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import { rateLimitRecords } from './schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { AuditLogger } from './audit-logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skip?: (req: NextRequest) => boolean; // Skip rate limiting for certain requests
  message?: string; // Custom error message
  statusCode?: number; // HTTP status code for rate limit exceeded
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: Date;
  totalRequests: number;
}

export class RateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many requests, please try again later.',
    statusCode: 429,
  };

  /**
   * Check if request should be rate limited
   */
  static async checkRateLimit(
    req: NextRequest,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Check if request should be skipped
    if (finalConfig.skip && finalConfig.skip(req)) {
      return {
        success: true,
        remaining: finalConfig.maxRequests,
        resetTime: new Date(Date.now() + finalConfig.windowMs),
        totalRequests: 0,
      };
    }

    // Generate identifier (IP address by default)
    const identifier = finalConfig.keyGenerator
      ? finalConfig.keyGenerator(req)
      : this.getClientIP(req);

    const endpoint = req.nextUrl.pathname;
    const now = new Date();
    const windowStart = new Date(now.getTime() - finalConfig.windowMs);

    try {
      // Get current rate limit record
      const existingRecords = await db
        .select()
        .from(rateLimitRecords)
        .where(
          and(
            eq(rateLimitRecords.identifier, identifier),
            eq(rateLimitRecords.endpoint, endpoint),
            gte(rateLimitRecords.window_start, windowStart),
            lte(rateLimitRecords.window_end, new Date(now.getTime() + finalConfig.windowMs))
          )
        )
        .limit(1);

      let record = existingRecords[0];
      let requestCount = 0;

      if (record) {
        requestCount = record.request_count;

        // Check if blocked
        if (record.blocked) {
          if (record.blocked_until && record.blocked_until > now) {
            return {
              success: false,
              remaining: 0,
              resetTime: record.blocked_until,
              totalRequests: requestCount,
            };
          } else {
            // Unblock if time has passed
            record.blocked = false;
            record.blocked_until = null;
          }
        }
      } else {
        // Create new record
        const windowEnd = new Date(now.getTime() + finalConfig.windowMs);
        await db.insert(rateLimitRecords).values({
          identifier,
          endpoint,
          request_count: 0,
          window_start: windowStart,
          window_end: windowEnd,
          blocked: false,
        });
        record = {
          id: 0,
          identifier,
          endpoint,
          request_count: 0,
          window_start: windowStart,
          window_end: windowEnd,
          blocked: false,
          blocked_until: null,
        };
      }

      requestCount++;

      // Check if limit exceeded
      if (requestCount > finalConfig.maxRequests) {
        const blockedUntil = new Date(now.getTime() + finalConfig.windowMs);

        // Update record to mark as blocked
        await db
          .update(rateLimitRecords)
          .set({
            request_count: requestCount,
            blocked: true,
            blocked_until: blockedUntil,
          })
          .where(eq(rateLimitRecords.id, record.id));

        // Audit log
        await AuditLogger.logSecurity(undefined, 'rate_limit_exceeded', 'high', {
          identifier,
          endpoint,
          requestCount,
          maxRequests: finalConfig.maxRequests,
          windowMs: finalConfig.windowMs,
        });

        return {
          success: false,
          remaining: 0,
          resetTime: blockedUntil,
          totalRequests: requestCount,
        };
      }

      // Update request count
      await db
        .update(rateLimitRecords)
        .set({ request_count: requestCount })
        .where(eq(rateLimitRecords.id, record.id));

      return {
        success: true,
        remaining: Math.max(0, finalConfig.maxRequests - requestCount),
        resetTime: record.window_end,
        totalRequests: requestCount,
      };
    } catch (error) {
      console.error('Rate limiting check failed:', error);
      // Allow request on error to avoid blocking legitimate traffic
      return {
        success: true,
        remaining: finalConfig.maxRequests,
        resetTime: new Date(Date.now() + finalConfig.windowMs),
        totalRequests: 0,
      };
    }
  }

  /**
   * Middleware function for Next.js
   */
  static async middleware(
    req: NextRequest,
    config: Partial<RateLimitConfig> = {}
  ): Promise<NextResponse | null> {
    const result = await this.checkRateLimit(req, config);

    if (!result.success) {
      const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

      return new NextResponse(
        JSON.stringify({
          error: finalConfig.message,
          retryAfter: Math.ceil((result.resetTime.getTime() - Date.now()) / 1000),
          remaining: result.remaining,
        }),
        {
          status: finalConfig.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toISOString(),
            'Retry-After': Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null; // Continue with request
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(req: NextRequest): string {
    // Check various headers for IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const clientIP = req.headers.get('x-client-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIP) return realIP;
    if (clientIP) return clientIP;

    // Fallback to a default identifier
    return 'unknown';
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanupOldRecords(retentionHours: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - retentionHours);

      // First count records to be deleted
      const countResult = await db
        .select({ count: rateLimitRecords.id })
        .from(rateLimitRecords)
        .where(lte(rateLimitRecords.window_end, cutoffDate));

      const count = countResult.length;

      // Then delete them
      await db
        .delete(rateLimitRecords)
        .where(lte(rateLimitRecords.window_end, cutoffDate));

      return count;
    } catch (error) {
      console.error('Failed to cleanup old rate limit records:', error);
      throw new Error('Failed to cleanup old rate limit records');
    }
  }

  /**
   * Get rate limit status for an identifier
   */
  static async getRateLimitStatus(
    identifier: string,
    endpoint?: string
  ): Promise<{
    records: any[];
    totalRequests: number;
    blockedRecords: number;
  }> {
    try {
      const conditions = [eq(rateLimitRecords.identifier, identifier)];

      if (endpoint) {
        conditions.push(eq(rateLimitRecords.endpoint, endpoint));
      }

      const records = await db
        .select()
        .from(rateLimitRecords)
        .where(and(...conditions));

      const totalRequests = records.reduce((sum, record) => sum + record.request_count, 0);
      const blockedRecords = records.filter(record => record.blocked).length;

      return {
        records,
        totalRequests,
        blockedRecords,
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      throw new Error('Failed to get rate limit status');
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  static async resetRateLimit(identifier: string, endpoint?: string): Promise<number> {
    try {
      const conditions = [eq(rateLimitRecords.identifier, identifier)];

      if (endpoint) {
        conditions.push(eq(rateLimitRecords.endpoint, endpoint));
      }

      // First count records to be updated
      const countResult = await db
        .select({ count: rateLimitRecords.id })
        .from(rateLimitRecords)
        .where(and(...conditions));

      const count = countResult.length;

      // Then update them
      await db
        .update(rateLimitRecords)
        .set({
          request_count: 0,
          blocked: false,
          blocked_until: null,
        })
        .where(and(...conditions));

      return count;
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
      throw new Error('Failed to reset rate limit');
    }
  }

  /**
   * Predefined rate limit configurations
   */
  static readonly CONFIGS = {
    // Strict limits for authentication endpoints
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
    },

    // Moderate limits for general API endpoints
    API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per 15 minutes
    },

    // Lenient limits for public endpoints
    PUBLIC: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 1000, // 1000 requests per hour
    },

    // Very strict limits for file uploads
    UPLOAD: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 uploads per hour
    },
  };
}