import { db } from "./db";
import { auditLogs } from "./schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogger {
  /**
   * Log a user action
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        user_id: entry.userId,
        action: entry.action,
        details: entry.details ? JSON.stringify(entry.details) : null,
        timestamp: new Date(),
      });

      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[AUDIT] ${entry.userId || "SYSTEM"}: ${entry.action}`, entry.details);
      }
    } catch (error) {
      console.error("Failed to log audit entry:", error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuth(userId: string, action: "login" | "logout" | "failed_login", details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: `auth.${action}`,
      details,
    });
  }

  /**
   * Log data access events
   */
  static async logDataAccess(
    userId: string,
    action: "view" | "create" | "update" | "delete" | "encrypt" | "decrypt",
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: `data.${action}`,
      details: {
        resourceType,
        resourceId,
        ...details,
      },
    });
  }

  /**
   * Log file operations
   */
  static async logFileOperation(
    userId: string,
    action: "upload" | "download" | "delete" | "encrypt" | "decrypt",
    fileName: string,
    fileSize?: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: `file.${action}`,
      details: {
        fileName,
        fileSize,
        ...details,
      },
    });
  }

  /**
   * Log transaction events
   */
  static async logTransaction(
    userId: string,
    action: "initiate" | "complete" | "cancel" | "refund",
    transactionId: string,
    amount?: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: `transaction.${action}`,
      details: {
        transactionId,
        amount,
        ...details,
      },
    });
  }

  /**
   * Log security events
   */
  static async logSecurity(
    userId: string | undefined,
    eventType: string,
    severity: "low" | "medium" | "high" | "critical",
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: `security.${eventType}`,
      details: {
        severity,
        ...details,
      },
    });
  }

  /**
   * Log compliance events
   */
  static async logCompliance(
    userId: string | undefined,
    action: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: `compliance.${action}`,
      details,
    });
  }

  /**
   * Retrieve audit logs with filters
   */
  static async getLogs(filters: AuditLogFilters = {}): Promise<any[]> {
    try {
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(auditLogs.user_id, filters.userId));
      }

      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }

      if (filters.startDate) {
        conditions.push(gte(auditLogs.timestamp, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(auditLogs.timestamp, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.timestamp))
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);

      return result.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details as string) : null,
      }));
    } catch (error) {
      console.error("Failed to retrieve audit logs:", error);
      throw new Error("Failed to retrieve audit logs");
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByUser: Record<string, number>;
    securityEvents: any[];
    dataAccessEvents: any[];
  }> {
    try {
      const logs = await this.getLogs({
        startDate,
        endDate,
        userId,
      });

      const logsByAction: Record<string, number> = {};
      const logsByUser: Record<string, number> = {};
      const securityEvents: any[] = [];
      const dataAccessEvents: any[] = [];

      logs.forEach(log => {
        // Count by action
        logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;

        // Count by user
        if (log.user_id) {
          logsByUser[log.user_id] = (logsByUser[log.user_id] || 0) + 1;
        }

        // Categorize events
        if (log.action.startsWith("security.")) {
          securityEvents.push(log);
        } else if (log.action.startsWith("data.")) {
          dataAccessEvents.push(log);
        }
      });

      return {
        totalLogs: logs.length,
        logsByAction,
        logsByUser,
        securityEvents,
        dataAccessEvents,
      };
    } catch (error) {
      console.error("Failed to generate compliance report:", error);
      throw new Error("Failed to generate compliance report");
    }
  }

  /**
   * Clean up old audit logs (for GDPR compliance)
   */
  static async cleanupOldLogs(retentionDays: number = 2555): Promise<number> { // ~7 years default
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // First count the records to be deleted
      const countResult = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(lte(auditLogs.timestamp, cutoffDate));

      const count = countResult.length;

      // Then delete them
      await db
        .delete(auditLogs)
        .where(lte(auditLogs.timestamp, cutoffDate));

      return count;
    } catch (error) {
      console.error("Failed to cleanup old audit logs:", error);
      throw new Error("Failed to cleanup old audit logs");
    }
  }

  /**
   * Get audit trail for a specific user
   */
  static async getUserAuditTrail(userId: string, limit: number = 100): Promise<any[]> {
    return this.getLogs({
      userId,
      limit,
    });
  }

  /**
   * Get audit trail for a specific resource
   */
  static async getResourceAuditTrail(resourceType: string, resourceId: string, limit: number = 100): Promise<any[]> {
    try {
      const logs = await this.getLogs({ limit: 1000 }); // Get more logs to filter

      return logs
        .filter(log =>
          log.details &&
          log.details.resourceType === resourceType &&
          log.details.resourceId === resourceId
        )
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get resource audit trail:", error);
      throw new Error("Failed to get resource audit trail");
    }
  }
}