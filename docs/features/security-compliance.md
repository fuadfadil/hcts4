# Security & Compliance

## Feature Overview

The Security & Compliance system provides comprehensive protection for the HCTS platform, implementing enterprise-grade security measures, regulatory compliance frameworks, and comprehensive audit capabilities. The system ensures GDPR and HIPAA compliance for healthcare data, implements role-based access control (RBAC), and provides real-time security monitoring and incident response.

## Key Components

### Frontend Components
- **Security Headers** - HTTP security headers middleware
- **Access Control** - Role-based UI component visibility
- **Audit Logging** - User activity tracking and reporting

### API Endpoints
- `POST /api/gdpr/delete` - GDPR data deletion requests
- `GET /api/security/status` - Security system health check
- `POST /api/security/report` - Security incident reporting
- `GET /api/audit/logs` - Audit log retrieval

### Backend Logic
- **Security Middleware** - HTTP security headers and request protection
- **Compliance Manager** - GDPR/HIPAA compliance enforcement
- **RBAC System** - Role-based access control and permissions
- **Audit Logger** - Comprehensive activity logging
- **Rate Limiter** - API abuse prevention
- **Data Encryption** - Sensitive data protection

## API Endpoints

### GDPR Data Deletion
```
POST /api/gdpr/delete
```
**Request Body:**
```json
{
  "userId": "user_123",
  "reason": "User requested account deletion",
  "requestedBy": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedRecords": 15,
    "anonymizedRecords": 3,
    "retainedRecords": 2,
    "reason": "User requested account deletion"
  },
  "message": "Data deletion request processed successfully"
}
```

### Security Status
```
GET /api/security/status
```
**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "encryption": "healthy",
    "audit_logs": "healthy",
    "rate_limiting": "healthy",
    "rbac": "healthy"
  },
  "lastChecked": "2024-01-01T00:00:00.000Z",
  "incidents": {
    "open": 0,
    "critical": 0,
    "high": 0
  }
}
```

### Security Incident Report
```
POST /api/security/report
```
**Request Body:**
```json
{
  "incidentType": "unauthorized_access",
  "severity": "high",
  "description": "Multiple failed login attempts detected",
  "affectedUsers": 1,
  "reportedBy": "system_monitor",
  "details": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "attempts": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "incidentId": 123,
  "message": "Security incident reported successfully"
}
```

### Audit Logs
```
GET /api/audit/logs?userId=user_123&startDate=2024-01-01&limit=50
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "userId": "user_123",
      "action": "login",
      "details": {
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      },
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "totalCount": 250
  }
}
```

## Database Tables

### user_consents
GDPR consent management and tracking.
```sql
CREATE TABLE user_consents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consented BOOLEAN NOT NULL,
  consent_date TIMESTAMP DEFAULT NOW(),
  consent_expiry TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON,
  INDEX user_consents_user_id_idx ON (user_id),
  INDEX user_consents_consent_type_idx ON (consent_type),
  INDEX user_consents_consented_idx ON (consented),
  INDEX user_consents_consent_date_idx ON (consent_date)
);
```

### data_processing_records
GDPR data processing activity tracking.
```sql
CREATE TABLE data_processing_records (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  processing_purpose TEXT NOT NULL,
  legal_basis VARCHAR(50) NOT NULL,
  data_location VARCHAR(100),
  retention_period INTEGER,
  processed_at TIMESTAMP DEFAULT NOW(),
  processed_by TEXT REFERENCES user(id),
  encrypted BOOLEAN DEFAULT FALSE,
  consent_id INTEGER REFERENCES user_consents(id),
  INDEX data_processing_records_user_id_idx ON (user_id),
  INDEX data_processing_records_data_type_idx ON (data_type),
  INDEX data_processing_records_legal_basis_idx ON (legal_basis),
  INDEX data_processing_records_processed_at_idx ON (processed_at)
);
```

### security_incidents
Security incident tracking and management.
```sql
CREATE TABLE security_incidents (
  id SERIAL PRIMARY KEY,
  incident_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  affected_users INTEGER,
  reported_by TEXT REFERENCES user(id),
  reported_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMP,
  resolved_by TEXT REFERENCES user(id),
  details JSON,
  INDEX security_incidents_incident_type_idx ON (incident_type),
  INDEX security_incidents_severity_idx ON (severity),
  INDEX security_incidents_status_idx ON (status),
  INDEX security_incidents_reported_at_idx ON (reported_at)
);
```

### roles_permissions
RBAC permissions management.
```sql
CREATE TABLE roles_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  INDEX roles_permissions_role_idx ON (role),
  INDEX roles_permissions_permission_idx ON (permission),
  INDEX roles_permissions_resource_idx ON (resource)
);
```

### audit_logs
Comprehensive audit logging.
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSON,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX audit_logs_user_id_idx ON (user_id),
  INDEX audit_logs_action_idx ON (action),
  INDEX audit_logs_timestamp_idx ON (timestamp)
);
```

### security_events
Security event monitoring.
```sql
CREATE TABLE security_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON,
  timestamp TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by TEXT REFERENCES user(id),
  INDEX security_events_user_id_idx ON (user_id),
  INDEX security_events_event_type_idx ON (event_type),
  INDEX security_events_severity_idx ON (severity),
  INDEX security_events_timestamp_idx ON (timestamp),
  INDEX security_events_resolved_idx ON (resolved)
);
```

### rate_limit_records
API rate limiting tracking.
```sql
CREATE TABLE rate_limit_records (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMP,
  INDEX rate_limit_records_identifier_idx ON (identifier),
  INDEX rate_limit_records_endpoint_idx ON (endpoint),
  INDEX rate_limit_records_window_start_idx ON (window_start),
  INDEX rate_limit_records_blocked_idx ON (blocked)
);
```

## Usage Examples

### Security Headers Implementation
```typescript
// Apply security headers to all responses
import { SecurityMiddleware } from '@/lib/security-middleware';

export default function middleware(request: NextRequest) {
  // Apply security headers based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const config = isProduction
    ? SecurityMiddleware.getProductionConfig()
    : SecurityMiddleware.getDevelopmentConfig();

  return SecurityMiddleware.applySecurityHeaders(
    NextResponse.next(),
    config
  );
}
```

### RBAC Permission Checking
```typescript
// Protect API routes with RBAC
import { RBAC } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('user-id');

  // Check if user can read audit logs
  const hasPermission = await RBAC.hasPermission(
    userId,
    'read',
    'audit_logs'
  );

  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // Proceed with protected operation
  const auditLogs = await getAuditLogs();
  return NextResponse.json({ data: auditLogs });
}
```

### GDPR Compliance Management
```typescript
// Handle GDPR data deletion requests
import { ComplianceManager } from '@/lib/compliance-manager';

export async function POST(request: NextRequest) {
  const { userId, reason, requestedBy } = await request.json();

  try {
    // Process data deletion
    const result = await ComplianceManager.processDataDeletion({
      userId,
      reason,
      requestedBy
    });

    // Send confirmation email
    await sendDeletionConfirmationEmail(userId, result);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}
```

### Audit Logging
```typescript
// Comprehensive audit logging
import { AuditLogger } from '@/lib/audit-logger';

export async function userLogin(userId: string, ipAddress: string, userAgent: string) {
  await AuditLogger.logAuth(userId, 'login', {
    ipAddress,
    userAgent,
    success: true
  });
}

export async function dataAccess(userId: string, resource: string, action: string) {
  await AuditLogger.logDataAccess(userId, action, resource, {
    timestamp: new Date().toISOString(),
    source: 'api'
  });
}
```

### Rate Limiting
```typescript
// API rate limiting implementation
import { RateLimiter } from '@/lib/rate-limiter';

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  keyGenerator: (req) => req.headers.get('user-id') || req.ip
});

export async function GET(request: NextRequest) {
  // Check rate limit
  const isAllowed = await limiter.checkLimit(request);

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Proceed with request
  return NextResponse.json({ data: 'Success' });
}
```

### Data Encryption
```typescript
// Encrypt sensitive data
import { DataEncryptor } from '@/lib/data-encryptor';

export async function storeSensitiveData(userId: string, data: any) {
  // Encrypt data before storage
  const encryptedData = await DataEncryptor.encrypt(
    JSON.stringify(data),
    userId // Use user ID as encryption key context
  );

  // Store encrypted data
  await saveToDatabase(userId, encryptedData);

  // Log encryption event
  await AuditLogger.logSecurity(userId, 'data_encrypted', 'low', {
    dataType: 'sensitive',
    operation: 'store'
  });
}

export async function retrieveSensitiveData(userId: string) {
  // Retrieve encrypted data
  const encryptedData = await getFromDatabase(userId);

  // Decrypt data
  const decryptedData = await DataEncryptor.decrypt(
    encryptedData,
    userId
  );

  return JSON.parse(decryptedData);
}
```

### Security Incident Response
```typescript
// Automated security incident handling
import { ComplianceManager } from '@/lib/compliance-manager';

export async function handleFailedLogin(
  userId: string,
  ipAddress: string,
  attempts: number
) {
  // Check if this constitutes a security incident
  if (attempts >= 5) {
    await ComplianceManager.reportSecurityIncident(
      'unauthorized_access',
      'medium',
      `Multiple failed login attempts: ${attempts} from IP ${ipAddress}`,
      1, // affected users
      'system', // reported by
      {
        userId,
        ipAddress,
        attempts,
        timestamp: new Date().toISOString()
      }
    );

    // Implement additional security measures
    await temporarilyBlockIP(ipAddress);
    await notifySecurityTeam(userId, attempts);
  }

  // Log the security event
  await AuditLogger.logSecurity(userId, 'failed_login_attempt', 'low', {
    ipAddress,
    attempts
  });
}
```

### Compliance Reporting
```typescript
// Generate compliance reports
import { ComplianceManager } from '@/lib/compliance-manager';

export async function generateComplianceReport(userId: string) {
  const report = await ComplianceManager.generateComplianceReport(userId);

  // Check HIPAA compliance
  const hipaaCheck = await ComplianceManager.checkHIPAACompliance(userId);

  return {
    userId,
    gdprCompliance: report.dataRetentionStatus,
    hipaaCompliance: hipaaCheck.compliant,
    issues: hipaaCheck.issues,
    recommendations: hipaaCheck.recommendations,
    lastActivity: report.lastActivity,
    dataProcessingRecords: report.dataProcessingRecords.length,
    consents: report.consents.length
  };
}
```

## Configuration

### Environment Variables
```env
# Security Configuration
NODE_ENV=production
ENCRYPTION_KEY=your-256-bit-encryption-key
JWT_SECRET=your-jwt-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_BLOCK_DURATION=3600000

# Audit Logging
AUDIT_LOG_RETENTION_DAYS=2555
AUDIT_LOG_ENCRYPTION=true

# GDPR Compliance
GDPR_DATA_RETENTION_YEARS=7
GDPR_CONSENT_EXPIRY_DAYS=365

# HIPAA Compliance
HIPAA_ENCRYPTION_REQUIRED=true
HIPAA_AUDIT_LOGGING=true

# RBAC Configuration
RBAC_CACHE_TTL=300
RBAC_ADMIN_ROLE=admin
```

### Security Settings
```typescript
// Security configuration
export const securityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16
  },

  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || '3600000'),
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  audit: {
    retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555'),
    encryption: process.env.AUDIT_LOG_ENCRYPTION === 'true',
    sensitiveFields: ['password', 'ssn', 'credit_card'],
    logLevels: ['error', 'warn', 'info', 'debug']
  },

  compliance: {
    gdpr: {
      dataRetentionYears: parseInt(process.env.GDPR_DATA_RETENTION_YEARS || '7'),
      consentExpiryDays: parseInt(process.env.GDPR_CONSENT_EXPIRY_DAYS || '365'),
      autoDeleteExpiredData: true
    },
    hipaa: {
      encryptionRequired: process.env.HIPAA_ENCRYPTION_REQUIRED === 'true',
      auditLogging: process.env.HIPAA_AUDIT_LOGGING === 'true',
      breachNotificationHours: 60
    }
  },

  rbac: {
    cacheTtl: parseInt(process.env.RBAC_CACHE_TTL || '300'),
    adminRole: process.env.RBAC_ADMIN_ROLE || 'admin',
    defaultPermissions: {
      provider: ['read:own_data', 'write:own_data', 'read:services'],
      insurance: ['read:own_data', 'read:services', 'write:transactions'],
      intermediary: ['read:own_data', 'read:marketplace', 'write:marketplace']
    }
  },

  headers: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    frameOptions: 'DENY',
    xssProtection: true
  }
};
```

## Security Considerations

### Authentication & Authorization
- **Multi-factor Authentication**: Required for admin and sensitive operations
- **Session Management**: Secure session handling with automatic expiration
- **Password Policies**: Strong password requirements and regular rotation
- **API Key Management**: Secure API key generation and rotation

### Data Protection
- **Encryption at Rest**: All sensitive data encrypted using AES-256
- **Encryption in Transit**: TLS 1.3 required for all communications
- **Data Masking**: Sensitive data masked in logs and UI
- **Secure Deletion**: Cryptographic erasure of deleted data

### Network Security
- **Firewall Configuration**: Restrictive firewall rules
- **DDoS Protection**: Rate limiting and traffic filtering
- **IP Whitelisting**: Restricted access to admin functions
- **VPN Requirements**: Encrypted access for internal systems

### Compliance Frameworks
- **GDPR Compliance**: EU data protection regulation adherence
- **HIPAA Compliance**: Healthcare data protection standards
- **PCI DSS**: Payment card industry security standards
- **ISO 27001**: Information security management systems

### Incident Response
- **Automated Detection**: Real-time security incident identification
- **Escalation Procedures**: Defined incident response workflows
- **Forensic Analysis**: Detailed incident investigation capabilities
- **Recovery Procedures**: Business continuity and disaster recovery

## Implementation Notes

### Security Architecture
1. **Defense in Depth**: Multiple security layers and controls
2. **Zero Trust Model**: Never trust, always verify approach
3. **Least Privilege**: Minimum required permissions principle
4. **Fail-Safe Defaults**: Secure defaults with explicit allow rules

### Compliance Automation
- **Automated Audits**: Regular compliance checks and reporting
- **Policy Enforcement**: Automated policy implementation
- **Consent Management**: User consent tracking and validation
- **Data Mapping**: Comprehensive data inventory and classification

### Performance Security
- **Efficient Encryption**: Optimized encryption algorithms
- **Caching Security**: Secure caching with proper invalidation
- **Rate Limit Optimization**: Smart rate limiting algorithms
- **Audit Log Performance**: High-performance logging systems

### Scalability Security
- **Distributed Security**: Security controls scale with system growth
- **Microservice Security**: Independent service security boundaries
- **Global Compliance**: Multi-region compliance support
- **Automated Updates**: Security patch management and updates

### Integration Points
- **Identity Providers**: External authentication system integration
- **SIEM Systems**: Security information and event management
- **Compliance Tools**: Automated compliance monitoring tools
- **Threat Intelligence**: External threat intelligence feeds

### Future Enhancements
- **AI Security**: Machine learning-based threat detection
- **Blockchain Audit**: Immutable audit trails using blockchain
- **Zero-Knowledge Proofs**: Privacy-preserving verification systems
- **Quantum-Resistant Crypto**: Post-quantum cryptographic algorithms
- **Automated Compliance**: AI-powered compliance automation
- **Advanced Forensics**: Enhanced security incident investigation tools