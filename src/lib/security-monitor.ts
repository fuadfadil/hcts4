import { db } from "./db";
import { securityEvents, users } from "./schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { AuditLogger } from "./audit-logger";

export interface SuspiciousActivityPattern {
  type: 'failed_logins' | 'unusual_location' | 'unusual_time' | 'brute_force' | 'data_export' | 'admin_access';
  threshold: number;
  timeWindow: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export class SecurityMonitor {
  private static readonly PATTERNS: SuspiciousActivityPattern[] = [
    {
      type: 'failed_logins',
      threshold: 5,
      timeWindow: 15, // 15 minutes
      severity: 'medium',
    },
    {
      type: 'brute_force',
      threshold: 10,
      timeWindow: 60, // 1 hour
      severity: 'high',
    },
    {
      type: 'unusual_time',
      threshold: 1,
      timeWindow: 1440, // 24 hours
      severity: 'low',
    },
  ];

  /**
   * Track failed login attempt
   */
  static async trackFailedLogin(
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    reason: string = 'invalid_credentials'
  ): Promise<void> {
    try {
      await db.insert(securityEvents).values({
        user_id: userId || undefined,
        event_type: 'failed_login',
        severity: 'low',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: JSON.stringify({
          reason,
          timestamp: new Date().toISOString(),
        }),
        timestamp: new Date(),
        resolved: false,
      });

      // Check for suspicious patterns
      await this.checkForSuspiciousActivity(userId, ipAddress, 'failed_login');
    } catch (error) {
      console.error('Failed to track failed login:', error);
    }
  }

  /**
   * Track successful login
   */
  static async trackSuccessfulLogin(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await db.insert(securityEvents).values({
        user_id: userId,
        event_type: 'successful_login',
        severity: 'low',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
        timestamp: new Date(),
        resolved: true, // Successful logins are not concerning
      });
    } catch (error) {
      console.error('Failed to track successful login:', error);
    }
  }

  /**
   * Track suspicious activity
   */
  static async trackSuspiciousActivity(
    userId: string | undefined,
    activityType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(securityEvents).values({
        user_id: userId || undefined,
        event_type: 'suspicious_activity',
        severity,
        ip_address: details.ipAddress,
        user_agent: details.userAgent,
        details: JSON.stringify({
          activityType,
          ...details,
          timestamp: new Date().toISOString(),
        }),
        timestamp: new Date(),
        resolved: false,
      });

      // Log security alert
      await AuditLogger.logSecurity(userId, 'suspicious_activity_detected', severity, {
        activityType,
        ...details,
      });
    } catch (error) {
      console.error('Failed to track suspicious activity:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private static async checkForSuspiciousActivity(
    userId: string | undefined,
    ipAddress: string,
    eventType: string
  ): Promise<void> {
    try {
      for (const pattern of this.PATTERNS) {
        if (eventType === pattern.type || (eventType === 'failed_login' && pattern.type === 'failed_logins')) {
          const timeWindow = new Date();
          timeWindow.setMinutes(timeWindow.getMinutes() - pattern.timeWindow);

          let conditions = [
            eq(securityEvents.event_type, eventType),
            gte(securityEvents.timestamp, timeWindow),
          ];

          if (userId) {
            conditions.push(eq(securityEvents.user_id, userId));
          } else {
            // For IP-based tracking when no user ID
            conditions.push(sql`${securityEvents.ip_address} = ${ipAddress}`);
          }

          const recentEvents = await db
            .select({ count: sql<number>`count(*)` })
            .from(securityEvents)
            .where(and(...conditions));

          const eventCount = recentEvents[0]?.count || 0;

          if (eventCount >= pattern.threshold) {
            // Create security alert
            await this.createSecurityAlert({
              type: pattern.type,
              severity: pattern.severity,
              message: `Suspicious activity detected: ${pattern.type} threshold exceeded (${eventCount} events in ${pattern.timeWindow} minutes)`,
              userId,
              details: {
                pattern,
                eventCount,
                ipAddress,
                timeWindow: pattern.timeWindow,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for suspicious activity:', error);
    }
  }

  /**
   * Create security alert
   */
  private static async createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      // In a real system, this would send notifications, emails, etc.
      console.warn(`SECURITY ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, alert);

      // Log the alert
      await AuditLogger.logSecurity(alert.userId, 'security_alert_created', alert.severity, {
        alertType: alert.type,
        message: alert.message,
        ...alert.details,
      });

      // Here you could integrate with external monitoring systems
      // - Send email notifications
      // - Send SMS alerts
      // - Integration with SIEM systems
      // - Trigger automated responses

    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  /**
   * Detect unusual login times
   */
  static async detectUnusualLoginTime(userId: string, currentHour: number): Promise<boolean> {
    try {
      // Get user's login history for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const loginHistory = await db
        .select({
          hour: sql<number>`EXTRACT(hour FROM ${securityEvents.timestamp})`,
          count: sql<number>`count(*)`,
        })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.user_id, userId),
            eq(securityEvents.event_type, 'successful_login'),
            gte(securityEvents.timestamp, thirtyDaysAgo)
          )
        )
        .groupBy(sql`EXTRACT(hour FROM ${securityEvents.timestamp})`);

      if (loginHistory.length === 0) {
        return false; // No history to compare against
      }

      // Check if current hour is unusual (not in top 3 most common hours)
      const sortedHours = loginHistory
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(h => h.hour);

      return !sortedHours.includes(currentHour);
    } catch (error) {
      console.error('Failed to detect unusual login time:', error);
      return false;
    }
  }

  /**
   * Detect unusual login locations (basic IP-based)
   */
  static async detectUnusualLocation(userId: string, currentIP: string): Promise<boolean> {
    try {
      // Get user's recent login IPs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentIPs = await db
        .select({ ip_address: securityEvents.ip_address })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.user_id, userId),
            eq(securityEvents.event_type, 'successful_login'),
            gte(securityEvents.timestamp, sevenDaysAgo)
          )
        )
        .groupBy(securityEvents.ip_address);

      const knownIPs = recentIPs.map(record => record.ip_address).filter(Boolean);

      // Simple check: if IP is not in recent login history
      return !knownIPs.includes(currentIP);
    } catch (error) {
      console.error('Failed to detect unusual location:', error);
      return false;
    }
  }

  /**
   * Get security events for a user
   */
  static async getUserSecurityEvents(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const events = await db
        .select()
        .from(securityEvents)
        .where(eq(securityEvents.user_id, userId))
        .orderBy(desc(securityEvents.timestamp))
        .limit(limit);

      return events.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details as string) : null,
      }));
    } catch (error) {
      console.error('Failed to get user security events:', error);
      return [];
    }
  }

  /**
   * Get security statistics
   */
  static async getSecurityStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
    resolvedEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
  }> {
    try {
      const timeRangeMap = {
        hour: 1,
        day: 24,
        week: 168,
        month: 720,
      };

      const hours = timeRangeMap[timeRange];
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const events = await db
        .select()
        .from(securityEvents)
        .where(gte(securityEvents.timestamp, since));

      const stats = {
        totalEvents: events.length,
        failedLogins: events.filter(e => e.event_type === 'failed_login').length,
        suspiciousActivities: events.filter(e => e.event_type === 'suspicious_activity').length,
        resolvedEvents: events.filter(e => e.resolved).length,
        eventsBySeverity: {} as Record<string, number>,
        eventsByType: {} as Record<string, number>,
      };

      events.forEach(event => {
        // Count by severity
        stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;

        // Count by type
        stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get security statistics:', error);
      return {
        totalEvents: 0,
        failedLogins: 0,
        suspiciousActivities: 0,
        resolvedEvents: 0,
        eventsBySeverity: {},
        eventsByType: {},
      };
    }
  }

  /**
   * Clean up old security events
   */
  static async cleanupOldEvents(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // First count records to be deleted
      const countResult = await db
        .select({ count: securityEvents.id })
        .from(securityEvents)
        .where(lte(securityEvents.timestamp, cutoffDate));

      const count = countResult.length;

      // Then delete them
      await db
        .delete(securityEvents)
        .where(lte(securityEvents.timestamp, cutoffDate));

      return count;
    } catch (error) {
      console.error('Failed to cleanup old security events:', error);
      throw new Error('Failed to cleanup old security events');
    }
  }

  /**
   * Analyze security trends
   */
  static async analyzeSecurityTrends(days: number = 30): Promise<{
    trend: 'improving' | 'stable' | 'worsening';
    changePercent: number;
    insights: string[];
  }> {
    try {
      const insights: string[] = [];
      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const halfPoint = new Date(periodStart.getTime() + (now.getTime() - periodStart.getTime()) / 2);

      // Get events for first half and second half of period
      const firstHalfEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(securityEvents)
        .where(
          and(
            gte(securityEvents.timestamp, periodStart),
            lte(securityEvents.timestamp, halfPoint)
          )
        );

      const secondHalfEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(securityEvents)
        .where(
          and(
            gte(securityEvents.timestamp, halfPoint),
            lte(securityEvents.timestamp, now)
          )
        );

      const firstHalf = firstHalfEvents[0]?.count || 0;
      const secondHalf = secondHalfEvents[0]?.count || 0;

      let trend: 'improving' | 'stable' | 'worsening' = 'stable';
      let changePercent = 0;

      if (firstHalf > 0) {
        changePercent = ((secondHalf - firstHalf) / firstHalf) * 100;

        if (changePercent < -20) {
          trend = 'improving';
          insights.push('Security events have decreased significantly');
        } else if (changePercent > 20) {
          trend = 'worsening';
          insights.push('Security events have increased significantly');
        } else {
          trend = 'stable';
          insights.push('Security events are stable');
        }
      }

      return {
        trend,
        changePercent,
        insights,
      };
    } catch (error) {
      console.error('Failed to analyze security trends:', error);
      return {
        trend: 'stable',
        changePercent: 0,
        insights: ['Unable to analyze security trends'],
      };
    }
  }
}