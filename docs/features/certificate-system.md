# Certificate System

## Feature Overview

The Certificate System provides secure digital certificate generation, verification, and management for healthcare service transactions. It creates tamper-proof certificates with QR codes, digital signatures, and encrypted PDF storage. The system supports real-time verification through QR code scanning and provides comprehensive audit trails for regulatory compliance.

## Key Components

### Frontend Components
- **CertificateViewer.tsx** - Display and download digital certificates
- **CertificateVerifier.tsx** - QR code and certificate number verification

### API Endpoints
- `POST /api/certificates/generate` - Generate new digital certificate
- `GET /api/certificates/[id]` - Retrieve certificate details
- `GET /api/certificates/download/[id]` - Download encrypted certificate PDF
- `GET /api/certificates/user/[userId]` - Get user's certificates
- `GET /api/certificates/verify/[qrCode]` - Verify certificate via QR code

### Backend Logic
- **Certificate Generator** - PDF generation with security features
- **QR Code Generator** - Encrypted QR codes for verification
- **File Encryption** - Secure PDF storage and transmission
- **Digital Signatures** - Cryptographic certificate signing

## API Endpoints

### Generate Certificate
```
POST /api/certificates/generate
```
**Request Body:**
```json
{
  "transactionId": 123
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "certificateId": 456,
    "certificateNumber": "CERT-123-1640995200000",
    "verificationHash": "a1b2c3d4...",
    "issuedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Certificate generated successfully"
}
```

### Get Certificate
```
GET /api/certificates/{id}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "certificateNumber": "CERT-123-1640995200000",
    "status": "valid",
    "issuedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "qrCodeData": "data:image/png;base64,...",
    "verificationHash": "a1b2c3d4...",
    "service": {
      "name": "Cardiology Consultation",
      "icd11Code": "BA00"
    },
    "transaction": {
      "quantity": 2,
      "unitPrice": 150.00,
      "totalPrice": 300.00,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "buyer": {
      "organizationName": "Libya Health Insurance"
    },
    "seller": {
      "organizationName": "City Medical Center"
    }
  }
}
```

### Download Certificate
```
GET /api/certificates/download/{id}
```
**Response:** Encrypted PDF file download

### Verify Certificate
```
GET /api/certificates/verify/{qrCode}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "certificateNumber": "CERT-123-1640995200000",
    "status": "valid",
    "isValid": true,
    "statusMessage": "Certificate is valid",
    "issuedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "service": {
      "name": "Cardiology Consultation",
      "icd11Code": "BA00"
    },
    "transaction": {
      "quantity": 2,
      "totalPrice": "300.00",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "buyer": {
      "organizationName": "Libya Health Insurance"
    },
    "seller": {
      "organizationName": "City Medical Center"
    },
    "verification": {
      "hash": "a1b2c3d4...",
      "signature": "present",
      "qrValid": true
    }
  }
}
```

### Get User Certificates
```
GET /api/certificates/user/{userId}?page=1&limit=20
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "certificateNumber": "CERT-123-1640995200000",
      "status": "valid",
      "issuedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2025-01-01T00:00:00.000Z",
      "serviceName": "Cardiology Consultation",
      "totalPrice": 300.00
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 3,
    "totalCount": 50
  }
}
```

## Database Tables

### certificates
Digital certificate storage with security features.
```sql
CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  qr_code_data TEXT NOT NULL,
  encrypted_pdf_path TEXT NOT NULL,
  pdf_hash VARCHAR(64) NOT NULL,
  verification_hash VARCHAR(64) NOT NULL,
  digital_signature TEXT,
  status VARCHAR NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'revoked', 'suspended')),
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revocation_reason TEXT,
  metadata JSON,
  INDEX certificates_transaction_id_idx ON (transaction_id),
  INDEX certificates_certificate_number_idx ON (certificate_number),
  INDEX certificates_status_idx ON (status),
  INDEX certificates_issued_at_idx ON (issued_at),
  INDEX certificates_expires_at_idx ON (expires_at),
  INDEX certificates_verification_hash_idx ON (verification_hash)
);
```

## Usage Examples

### Certificate Generation Flow
```typescript
// Automatic certificate generation after payment completion
async function handlePaymentCompletion(transactionId: number) {
  try {
    // Generate certificate
    const response = await fetch('/api/certificates/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId })
    });

    const result = await response.json();

    if (result.success) {
      // Send certificate to buyer
      await sendCertificateEmail(result.data, buyerEmail);

      // Log certificate generation
      await logAuditEvent('certificate_generated', {
        transactionId,
        certificateId: result.data.certificateId
      });
    }
  } catch (error) {
    console.error('Certificate generation failed:', error);
    // Handle error - could retry or notify admin
  }
}
```

### Certificate Verification
```typescript
// QR code scanning verification
function QRCodeScanner() {
  const [scannedData, setScannedData] = useState('');

  const handleScan = async (qrData: string) => {
    try {
      const response = await fetch(`/api/certificates/verify/${encodeURIComponent(qrData)}`);
      const result = await response.json();

      if (result.success) {
        // Display verification result
        setVerificationResult(result.data);

        // Log verification attempt
        await logVerificationAttempt(result.data.certificateNumber, 'qr_scan');
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  return (
    <div>
      <QRCodeScanner onScan={handleScan} />
      {verificationResult && (
        <CertificateVerificationResult result={verificationResult} />
      )}
    </div>
  );
}
```

### Certificate Viewer with Download
```typescript
// Certificate display and download
function CertificateDashboard({ userId }) {
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    fetchUserCertificates();
  }, [userId]);

  const fetchUserCertificates = async () => {
    const response = await fetch(`/api/certificates/user/${userId}`);
    const data = await response.json();
    setCertificates(data.data);
  };

  const handleDownload = async (certificateId) => {
    // Trigger download
    const link = document.createElement('a');
    link.href = `/api/certificates/download/${certificateId}`;
    link.download = `certificate-${certificateId}.pdf`;
    link.click();

    // Log download event
    await logAuditEvent('certificate_downloaded', { certificateId, userId });
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificates.map(cert => (
          <Card key={cert.id} className="cursor-pointer" onClick={() => setSelectedCertificate(cert)}>
            <CardContent className="p-4">
              <h3 className="font-semibold">{cert.serviceName}</h3>
              <p className="text-sm text-gray-600">#{cert.certificateNumber}</p>
              <p className="text-sm text-gray-600">${cert.totalPrice}</p>
              <Badge variant={cert.status === 'valid' ? 'default' : 'secondary'}>
                {cert.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCertificate && (
        <CertificateViewer
          certificateId={selectedCertificate.id}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
```

### Certificate Revocation
```typescript
// Certificate revocation for compliance
async function revokeCertificate(certificateId: number, reason: string, adminUserId: number) {
  try {
    // Update certificate status
    const response = await fetch(`/api/certificates/${certificateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revocationReason: reason
      })
    });

    if (response.ok) {
      // Notify affected parties
      await notifyCertificateRevocation(certificateId, reason);

      // Log revocation event
      await logAuditEvent('certificate_revoked', {
        certificateId,
        reason,
        adminUserId
      });
    }
  } catch (error) {
    console.error('Certificate revocation failed:', error);
  }
}
```

### Bulk Certificate Operations
```typescript
// Bulk certificate generation for multiple transactions
async function generateBulkCertificates(transactionIds: number[]) {
  const results = [];

  for (const transactionId of transactionIds) {
    try {
      const response = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });

      const result = await response.json();
      results.push({
        transactionId,
        success: result.success,
        certificateId: result.success ? result.data.certificateId : null,
        error: result.success ? null : result.error
      });

      // Add delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      results.push({
        transactionId,
        success: false,
        certificateId: null,
        error: error.message
      });
    }
  }

  // Log bulk operation results
  await logBulkOperation('certificate_generation', results);

  return results;
}
```

## Configuration

### Environment Variables
```env
# Certificate Configuration
CERTIFICATE_EXPIRY_YEARS=1
CERTIFICATE_STORAGE_PATH=/certificates
CERTIFICATE_ENCRYPTION_KEY=your-encryption-key

# QR Code Configuration
QR_CODE_SIZE=256
QR_CODE_ERROR_CORRECTION=HIGH

# Digital Signature Configuration
SIGNATURE_PRIVATE_KEY=your-private-key
SIGNATURE_ALGORITHM=RS256

# Verification Configuration
VERIFICATION_CACHE_TTL=300
VERIFICATION_RATE_LIMIT=100

# PDF Generation Configuration
PDF_TEMPLATE_PATH=/templates/certificate.html
PDF_FONT_PATH=/fonts
```

### Certificate Settings
```typescript
// Certificate configuration
export const certificateConfig = {
  expiry: {
    years: parseInt(process.env.CERTIFICATE_EXPIRY_YEARS || '1')
  },

  storage: {
    path: process.env.CERTIFICATE_STORAGE_PATH || '/certificates',
    encryptionKey: process.env.CERTIFICATE_ENCRYPTION_KEY
  },

  qrCode: {
    size: parseInt(process.env.QR_CODE_SIZE || '256'),
    errorCorrection: process.env.QR_CODE_ERROR_CORRECTION || 'HIGH'
  },

  security: {
    privateKey: process.env.SIGNATURE_PRIVATE_KEY,
    algorithm: process.env.SIGNATURE_ALGORITHM || 'RS256'
  },

  verification: {
    cacheTtl: parseInt(process.env.VERIFICATION_CACHE_TTL || '300'),
    rateLimit: parseInt(process.env.VERIFICATION_RATE_LIMIT || '100')
  },

  pdf: {
    templatePath: process.env.PDF_TEMPLATE_PATH,
    fontPath: process.env.PDF_FONT_PATH
  }
};
```

## Security Considerations

### Certificate Security
- **Digital Signatures**: RSA-based cryptographic signing of certificates
- **Hash Verification**: SHA-256 hashes for integrity verification
- **Encryption**: AES-256 encryption for PDF storage and transmission
- **QR Code Security**: Encrypted QR codes with tamper detection

### Access Control
- **Owner Access**: Certificate owners can view and download their certificates
- **Public Verification**: QR codes allow public verification without authentication
- **Admin Controls**: Administrators can revoke certificates for compliance
- **Audit Logging**: All certificate operations are logged for security

### Data Protection
- **Encrypted Storage**: Certificates stored encrypted at rest
- **Secure Transmission**: HTTPS required for all certificate operations
- **Data Minimization**: Only necessary data included in certificates
- **Retention Policies**: Configurable certificate retention periods

### Verification Security
- **Hash Validation**: Certificate integrity verified through cryptographic hashes
- **Expiry Checking**: Automatic expiry status updates and enforcement
- **Revocation Checking**: Real-time revocation status verification
- **Rate Limiting**: Protection against verification abuse

## Implementation Notes

### Certificate Generation Process
1. **Transaction Validation**: Verify transaction completion and payment status
2. **Data Collection**: Gather service, buyer, and seller information
3. **PDF Generation**: Create certificate PDF with security features
4. **QR Code Creation**: Generate encrypted QR code with verification data
5. **Digital Signing**: Apply cryptographic signature to certificate
6. **Encryption**: Encrypt PDF for secure storage
7. **Database Storage**: Store certificate metadata and file paths
8. **Notification**: Send certificate to buyer via email/SMS

### Verification Process
1. **QR Code Scanning**: Decode encrypted QR code data
2. **Data Extraction**: Extract certificate number and verification hash
3. **Database Lookup**: Find certificate by number
4. **Status Checking**: Verify expiry and revocation status
5. **Hash Verification**: Validate certificate integrity
6. **Result Display**: Show verification status and certificate details

### File Storage Architecture
- **Encrypted PDFs**: All certificates stored encrypted on disk
- **Secure Paths**: File paths not predictable or guessable
- **Access Control**: File system permissions restrict access
- **Backup Strategy**: Encrypted certificates included in backups

### Performance Optimizations
- **Caching**: Certificate verification results cached for performance
- **Lazy Loading**: Certificate details loaded on demand
- **Batch Operations**: Bulk certificate generation support
- **CDN Integration**: QR code images served via CDN

### Scalability Features
- **Horizontal Scaling**: Certificate generation can scale across multiple servers
- **Database Sharding**: Certificates can be partitioned by date or region
- **Async Processing**: Certificate generation runs asynchronously
- **Queue System**: Background processing for bulk operations

### Integration Points
- **Payment System**: Automatic certificate generation on payment completion
- **Notification System**: Certificate delivery via email and SMS
- **Audit System**: Comprehensive logging of certificate operations
- **Analytics**: Certificate usage and verification statistics

### Future Enhancements
- **Blockchain Integration**: Immutable certificate storage on blockchain
- **Mobile Verification**: Native mobile apps for certificate verification
- **Multi-language Support**: Certificates in multiple languages
- **Advanced Security**: Hardware security modules for key storage
- **API Integration**: Third-party system certificate verification
- **Bulk Verification**: Verify multiple certificates simultaneously