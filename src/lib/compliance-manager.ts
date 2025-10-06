import { db } from "./db";
import { userConsents, dataProcessingRecords, securityIncidents, auditLogs, users } from "./schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { AuditLogger } from "./audit-logger";
import { DataEncryptor } from "./data-encryptor";

export interface ConsentRequest {
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'cookies';
  consented: boolean;
  details?: Record<string, any>;
}

export interface DataDeletionRequest {
  userId: string;
  reason: string;
  requestedBy: string;
  details?: Record<string, any>;
}

export interface ComplianceReport {
  userId: string;
  dataProcessingRecords: any[];
  consents: any[];
  auditLogs: any[];
  dataRetentionStatus: 'compliant' | 'non_compliant' | 'pending_review';
  lastActivity: Date | null;
}

export class ComplianceManager {
  /**
   * Record user consent
   */
  static async recordConsent(request: ConsentRequest): Promise<void> {
    try {
      await db.insert(userConsents).values({
        user_id: request.userId,
        consent_type: request.consentType,
        consented: request.consented,
        consent_date: new Date(),
        details: request.details ? JSON.stringify(request.details) : null,
      });

      // Audit log
      await AuditLogger.logCompliance(request.userId, `consent.${request.consentType}`, {
        consented: request.consented,
        ...request.details,
      });
    } catch (error) {
      console.error('Failed to record consent:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Get user consents
   */
  static async getUserConsents(userId: string): Promise<any[]> {
    try {
      const consents = await db
        .select()
        .from(userConsents)
        .where(eq(userConsents.user_id, userId))
        .orderBy(desc(userConsents.consent_date));

      return consents.map(consent => ({
        ...consent,
        details: consent.details ? JSON.parse(consent.details as string) : null,
      }));
    } catch (error) {
      console.error('Failed to get user consents:', error);
      throw new Error('Failed to get user consents');
    }
  }

  /**
   * Check if user has valid consent for a specific type
   */
  static async hasValidConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      const consents = await db
        .select()
        .from(userConsents)
        .where(
          and(
            eq(userConsents.user_id, userId),
            eq(userConsents.consent_type, consentType),
            eq(userConsents.consented, true)
          )
        )
        .orderBy(desc(userConsents.consent_date))
        .limit(1);

      if (consents.length === 0) return false;

      const consent = consents[0];

      // Check if consent has expired
      if (consent.consent_expiry && consent.consent_expiry < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check consent validity:', error);
      return false;
    }
  }

  /**
   * Withdraw user consent
   */
  static async withdrawConsent(userId: string, consentType: string): Promise<void> {
    try {
      await db
        .update(userConsents)
        .set({
          consented: false,
        })
        .where(
          and(
            eq(userConsents.user_id, userId),
            eq(userConsents.consent_type, consentType)
          )
        );

      // Audit log
      await AuditLogger.logCompliance(userId, `consent.withdrawn.${consentType}`);
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      throw new Error('Failed to withdraw consent');
    }
  }

  /**
   * Record data processing activity
   */
  static async recordDataProcessing(
    userId: string,
    dataType: 'personal' | 'health' | 'financial' | 'contact',
    purpose: string,
    legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation' | 'public_task' | 'vital_interests',
    dataLocation?: string,
    retentionPeriod?: number,
    processedBy?: string
  ): Promise<void> {
    try {
      // Check if user has consent for this type of processing
      if (legalBasis === 'consent') {
        const hasConsent = await this.hasValidConsent(userId, 'data_processing');
        if (!hasConsent) {
          throw new Error('User has not consented to data processing');
        }
      }

      await db.insert(dataProcessingRecords).values({
        user_id: userId,
        data_type: dataType,
        processing_purpose: purpose,
        legal_basis: legalBasis,
        data_location: dataLocation,
        retention_period: retentionPeriod,
        processed_at: new Date(),
        processed_by: processedBy,
        encrypted: false, // Will be updated if data is encrypted
      });

      // Audit log
      await AuditLogger.logCompliance(userId, 'data_processing.recorded', {
        dataType,
        purpose,
        legalBasis,
        dataLocation,
        retentionPeriod,
      });
    } catch (error) {
      console.error('Failed to record data processing:', error);
      throw new Error('Failed to record data processing');
    }
  }

  /**
   * Get data processing records for a user
   */
  static async getDataProcessingRecords(userId: string): Promise<any[]> {
    try {
      const records = await db
        .select()
        .from(dataProcessingRecords)
        .where(eq(dataProcessingRecords.user_id, userId))
        .orderBy(desc(dataProcessingRecords.processed_at));

      return records;
    } catch (error) {
      console.error('Failed to get data processing records:', error);
      throw new Error('Failed to get data processing records');
    }
  }

  /**
   * Process GDPR data deletion request
   */
  static async processDataDeletion(request: DataDeletionRequest): Promise<{
    deletedRecords: number;
    anonymizedRecords: number;
    retainedRecords: number;
    reason: string;
  }> {
    try {
      const { userId, reason, requestedBy } = request;

      // Audit log the deletion request
      await AuditLogger.logCompliance(userId, 'gdpr.deletion_requested', {
        reason,
        requestedBy,
      });

      let deletedRecords = 0;
      let anonymizedRecords = 0;
      let retainedRecords = 0;

      // Delete user consents (except for legal retention requirements)
      // First count records to be deleted
      const consentCount = await db
        .select({ count: userConsents.id })
        .from(userConsents)
        .where(eq(userConsents.user_id, userId));

      deletedRecords += consentCount.length;

      // Then delete them
      await db
        .delete(userConsents)
        .where(eq(userConsents.user_id, userId));

      // Anonymize data processing records (don't delete for audit purposes)
      await db
        .update(dataProcessingRecords)
        .set({
          user_id: `anonymized_${Date.now()}`, // Anonymize user reference
        })
        .where(eq(dataProcessingRecords.user_id, userId));
      anonymizedRecords += 1; // Approximate count

      // Delete audit logs older than retention period (keep recent ones for legal purposes)
      const retentionCutoff = new Date();
      retentionCutoff.setFullYear(retentionCutoff.getFullYear() - 7); // GDPR requires 7 years retention for some data

      // Count audit logs to be deleted
      const auditCount = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.user_id, userId),
            lte(auditLogs.timestamp, retentionCutoff)
          )
        );

      deletedRecords += auditCount.length;

      // Then delete them
      await db
        .delete(auditLogs)
        .where(
          and(
            eq(auditLogs.user_id, userId),
            lte(auditLogs.timestamp, retentionCutoff)
          )
        );

      // Note: Some records may be retained for legal/compliance reasons
      retainedRecords = 1; // Audit logs within retention period

      // Log the completion
      await AuditLogger.logCompliance(userId, 'gdpr.deletion_completed', {
        deletedRecords,
        anonymizedRecords,
        retainedRecords,
        reason,
      });

      return {
        deletedRecords,
        anonymizedRecords,
        retainedRecords,
        reason,
      };
    } catch (error) {
      console.error('Failed to process data deletion:', error);
      throw new Error('Failed to process data deletion');
    }
  }

  /**
   * Generate GDPR compliance report for a user
   */
  static async generateComplianceReport(userId: string): Promise<ComplianceReport> {
    try {
      // Get user's data processing records
      const dataProcessingRecords_result = await this.getDataProcessingRecords(userId);

      // Get user's consents
      const consents = await this.getUserConsents(userId);

      // Get user's audit logs (last 90 days for compliance report)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const auditLogs_result = await AuditLogger.getLogs({
        userId,
        startDate: ninetyDaysAgo,
        limit: 100,
      });

      // Determine data retention status
      const hasRecentActivity = auditLogs_result.length > 0;
      const lastActivity = hasRecentActivity ? auditLogs_result[0].timestamp : null;

      // Check for data retention compliance
      let dataRetentionStatus: 'compliant' | 'non_compliant' | 'pending_review' = 'compliant';

      // Check if data processing has proper legal basis
      const hasInvalidProcessing = dataProcessingRecords_result.some(record => {
        if (record.legal_basis === 'consent') {
          // For consent-based processing, check if consent is still valid
          return !consents.some(consent =>
            consent.consent_type === 'data_processing' &&
            consent.consented &&
            (!consent.consent_expiry || consent.consent_expiry > new Date())
          );
        }
        return false;
      });

      if (hasInvalidProcessing) {
        dataRetentionStatus = 'non_compliant';
      }

      return {
        userId,
        dataProcessingRecords: dataProcessingRecords_result,
        consents,
        auditLogs: auditLogs_result,
        dataRetentionStatus,
        lastActivity,
      };
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Check HIPAA compliance for healthcare data
   */
  static async checkHIPAACompliance(userId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check data processing records for health data
      const healthRecords = await db
        .select()
        .from(dataProcessingRecords)
        .where(
          and(
            eq(dataProcessingRecords.user_id, userId),
            eq(dataProcessingRecords.data_type, 'health')
          )
        );

      if (healthRecords.length > 0) {
        // Check if health data is encrypted
        const unencryptedHealthData = healthRecords.filter(record => !record.encrypted);
        if (unencryptedHealthData.length > 0) {
          issues.push('Unencrypted health data found');
          recommendations.push('Encrypt all health data at rest and in transit');
        }

        // Check legal basis for processing health data
        const invalidHealthProcessing = healthRecords.filter(record =>
          !['legal_obligation', 'vital_interests', 'consent'].includes(record.legal_basis)
        );
        if (invalidHealthProcessing.length > 0) {
          issues.push('Health data processing without proper legal basis');
          recommendations.push('Ensure health data processing has explicit consent or legal obligation');
        }

        // Check data retention periods
        const longRetentionHealthData = healthRecords.filter(record =>
          record.retention_period && record.retention_period > 365 * 7 // 7 years
        );
        if (longRetentionHealthData.length > 0) {
          issues.push('Health data retained longer than necessary');
          recommendations.push('Implement automatic deletion of health data after required retention period');
        }
      }

      return {
        compliant: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to check HIPAA compliance:', error);
      throw new Error('Failed to check HIPAA compliance');
    }
  }

  /**
   * Report security incident
   */
  static async reportSecurityIncident(
    incidentType: 'breach' | 'unauthorized_access' | 'data_leak' | 'malware' | 'other',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    affectedUsers?: number,
    reportedBy?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(securityIncidents).values({
        incident_type: incidentType,
        severity,
        description,
        affected_users: affectedUsers,
        reported_by: reportedBy,
        reported_at: new Date(),
        status: 'open',
        details: details ? JSON.stringify(details) : null,
      });

      // Audit log
      await AuditLogger.logSecurity(reportedBy, 'incident_reported', severity, {
        incidentType,
        description,
        affectedUsers,
        ...details,
      });
    } catch (error) {
      console.error('Failed to report security incident:', error);
      throw new Error('Failed to report security incident');
    }
  }

  /**
   * Get security incidents
   */
  static async getSecurityIncidents(
    status?: 'open' | 'investigating' | 'resolved' | 'closed',
    limit: number = 50
  ): Promise<any[]> {
    try {
      const conditions = status ? [eq(securityIncidents.status, status)] : [];

      const incidents = await db
        .select()
        .from(securityIncidents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityIncidents.reported_at))
        .limit(limit);

      return incidents.map(incident => ({
        ...incident,
        details: incident.details ? JSON.parse(incident.details as string) : null,
      }));
    } catch (error) {
      console.error('Failed to get security incidents:', error);
      throw new Error('Failed to get security incidents');
    }
  }

  /**
   * Clean up expired consents
   */
  static async cleanupExpiredConsents(): Promise<number> {
    try {
      // First count records to be deleted
      const countResult = await db
        .select({ count: userConsents.id })
        .from(userConsents)
        .where(
          and(
            eq(userConsents.consented, false),
            lte(userConsents.consent_expiry, new Date())
          )
        );

      const count = countResult.length;

      // Then delete them
      await db
        .delete(userConsents)
        .where(
          and(
            eq(userConsents.consented, false),
            lte(userConsents.consent_expiry, new Date())
          )
        );

      return count;
    } catch (error) {
      console.error('Failed to cleanup expired consents:', error);
      throw new Error('Failed to cleanup expired consents');
    }
  }

  /**
   * Get compliance statistics
   */
  static async getComplianceStatistics(): Promise<{
    totalUsers: number;
    usersWithValidConsents: number;
    pendingDataDeletionRequests: number;
    openSecurityIncidents: number;
    dataProcessingRecordsCount: number;
  }> {
    try {
      // This would require more complex queries in a real implementation
      // For now, return basic stats
      const totalUsers = await db.select({ count: users.id }).from(users);
      const usersWithValidConsents = await db
        .select({ count: userConsents.user_id })
        .from(userConsents)
        .where(eq(userConsents.consented, true));

      const openSecurityIncidents = await db
        .select({ count: securityIncidents.id })
        .from(securityIncidents)
        .where(eq(securityIncidents.status, 'open'));

      const dataProcessingRecordsCount = await db
        .select({ count: dataProcessingRecords.id })
        .from(dataProcessingRecords);

      return {
        totalUsers: totalUsers.length,
        usersWithValidConsents: usersWithValidConsents.length,
        pendingDataDeletionRequests: 0, // Would need a separate table for deletion requests
        openSecurityIncidents: openSecurityIncidents.length,
        dataProcessingRecordsCount: dataProcessingRecordsCount.length,
      };
    } catch (error) {
      console.error('Failed to get compliance statistics:', error);
      throw new Error('Failed to get compliance statistics');
    }
  }
}