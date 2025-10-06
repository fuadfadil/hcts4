# User Registration System

## Feature Overview

The User Registration System enables multi-role registration for healthcare stakeholders in the HCTS platform. It supports three distinct user roles: Healthcare Providers, Insurance Companies, and Intermediaries (brokers/consultants). The system implements a comprehensive verification process including document uploads, license validation, and guarantor information collection to ensure regulatory compliance.

## Key Components

### Frontend Components
- **ProviderRegistrationForm.tsx** - Multi-step form for healthcare provider registration
- **InsuranceRegistrationForm.tsx** - Multi-step form for insurance company registration
- **IntermediaryRegistrationForm.tsx** - Multi-step form for intermediary registration
- **register/page.tsx** - Role selection and registration flow orchestration

### API Endpoints
- `POST /api/register/provider` - Provider registration endpoint
- `POST /api/register/insurance` - Insurance company registration endpoint
- `POST /api/register/intermediary` - Intermediary registration endpoint
- `GET /api/verification/status` - Verification status checking

### Backend Logic
- **Registration Routes** - Handle form submissions and data validation
- **Verification System** - License and document verification workflow
- **User Creation** - Account setup with role-based permissions

## API Endpoints

### Provider Registration
```
POST /api/register/provider
```
**Request Body:**
```json
{
  "organizationName": "string",
  "registrationNumber": "string",
  "taxId": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "country": "string"
  },
  "licenseNumber": "string",
  "licenseType": "string",
  "issuingAuthority": "string",
  "expiryDate": "string",
  "licenseDocument": "File",
  "guarantorName": "string",
  "guarantorEmail": "string",
  "guarantorPhone": "string",
  "guaranteeAmount": "string",
  "guarantorDocument": "File",
  "icd11Codes": ["string"],
  "specialties": ["string"],
  "serviceDescription": "string",
  "password": "string"
}
```

### Insurance Registration
```
POST /api/register/insurance
```
**Request Body:**
```json
{
  "companyName": "string",
  "registrationNumber": "string",
  "taxId": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "address": { /* same structure */ },
  "licenseNumber": "string",
  "licenseType": "string",
  "issuingAuthority": "string",
  "expiryDate": "string",
  "licenseDocument": "File",
  "coverageTypes": ["string"],
  "maxCoverageAmount": "string",
  "guarantorName": "string",
  "guarantorEmail": "string",
  "guarantorPhone": "string",
  "guaranteeAmount": "string",
  "guarantorDocument": "File",
  "password": "string"
}
```

### Intermediary Registration
```
POST /api/register/intermediary
```
**Request Body:**
```json
{
  "isCompany": "boolean",
  "companyName": "string",
  "fullName": "string",
  "registrationNumber": "string",
  "taxId": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "address": { /* same structure */ },
  "licenseNumber": "string",
  "licenseType": "string",
  "issuingAuthority": "string",
  "expiryDate": "string",
  "licenseDocument": "File",
  "activityType": "string",
  "serviceDescription": "string",
  "experienceYears": "string",
  "password": "string"
}
```

### Verification Status
```
GET /api/verification/status?userId={id}
```
**Response:**
```json
{
  "userId": 123,
  "emailVerified": true,
  "licenseStatus": "verified|pending|rejected",
  "overallStatus": "verified|pending|rejected",
  "licenses": [
    {
      "id": 1,
      "type": "medical_practice",
      "status": "verified",
      "expiryDate": "2024-12-31T00:00:00.000Z"
    }
  ],
  "message": "Your account has been verified and is ready to use."
}
```

## Database Tables

### users
Primary user table with authentication and role information.
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES user(id) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('provider', 'insurance', 'intermediary')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT
);
```

### profiles
Extended user profile information.
```sql
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  contact_info JSON NOT NULL,
  address JSON NOT NULL,
  license_info JSON,
  guarantor_info JSON
);
```

### licenses
License document storage and verification status.
```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  document_path TEXT NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  verification_status VARCHAR DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired'))
);
```

### guarantors
Financial guarantor information for providers and insurance companies.
```sql
CREATE TABLE guarantors (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_info JSON NOT NULL,
  guarantee_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);
```

## Usage Examples

### Provider Registration Flow
```typescript
// Frontend registration submission
const handleProviderRegistration = async (formData: ProviderFormData) => {
  const response = await fetch('/api/register/provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      icd11Codes: formData.icd11Codes.split(',').map(code => code.trim()),
      specialties: formData.specialties.split(',').map(spec => spec.trim())
    })
  });

  if (response.ok) {
    const result = await response.json();
    // Handle success - redirect to verification status page
    router.push(`/verification?userId=${result.userId}`);
  }
};
```

### Verification Status Check
```typescript
// Check verification status
const checkVerificationStatus = async (userId: string) => {
  const response = await fetch(`/api/verification/status?userId=${userId}`);
  const status = await response.json();

  if (status.overallStatus === 'verified') {
    // User can access full platform features
    router.push('/dashboard');
  } else {
    // Show verification pending message
    setVerificationMessage(status.message);
  }
};
```

### Multi-step Form Implementation
```typescript
// Form step management
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState({});

const steps = [
  { id: 1, title: "Organization Details", component: OrganizationStep },
  { id: 2, title: "License & Certification", component: LicenseStep },
  { id: 3, title: "Guarantor Information", component: GuarantorStep },
  { id: 4, title: "Service Classification", component: ServicesStep },
  { id: 5, title: "Review & Submit", component: ReviewStep }
];
```

## Configuration

### Environment Variables
```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/hcts

# File Upload Configuration
UPLOAD_PATH=/uploads/licenses
MAX_FILE_SIZE=10485760  # 10MB

# Email Configuration (for verification emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password

# Security Configuration
BCRYPT_ROUNDS=12
JWT_SECRET=your-secret-key
```

### Validation Rules
- **Email**: Must be valid email format, unique across all users
- **Phone**: Minimum 10 digits, international format supported
- **Password**: Minimum 8 characters, hashed with bcrypt
- **License Documents**: PDF, JPG, PNG up to 10MB
- **ICD11 Codes**: Must exist in icd11_categories table
- **Guarantee Amount**: Numeric value in Libyan Dinars (LYD)

## Security Considerations

### Data Protection
- Passwords hashed using bcrypt with 12 rounds
- Sensitive documents encrypted at rest
- File uploads validated for type and size
- Input sanitization and validation on all endpoints

### Access Control
- Role-based registration forms (provider, insurance, intermediary)
- Verification required before full platform access
- License expiry monitoring and automatic status updates

### Compliance Features
- **GDPR/HIPAA Compliance**: User consent tracking, data processing records
- **Audit Logging**: All registration attempts logged
- **Document Verification**: Manual review process for licenses
- **Data Retention**: Configurable retention periods for user data

### Security Monitoring
- Failed registration attempts tracked
- Suspicious activity detection
- Rate limiting on registration endpoints
- Security incident reporting system

## Implementation Notes

### Registration Flow
1. **Role Selection**: User chooses provider, insurance, or intermediary
2. **Multi-step Form**: Progressive disclosure of required information
3. **Document Upload**: Secure file handling with validation
4. **Data Validation**: Client and server-side validation
5. **Account Creation**: User account with pending verification status
6. **Verification Process**: Manual review of documents and licenses
7. **Account Activation**: Full access granted upon verification

### Error Handling
- Comprehensive error messages for validation failures
- Graceful handling of file upload errors
- Database transaction rollback on registration failures
- User-friendly error states in forms

### Performance Considerations
- File uploads processed asynchronously
- Database indexes on frequently queried fields
- Caching for ICD11 category lookups
- Rate limiting to prevent abuse

### Scalability Features
- Horizontal scaling support through stateless design
- CDN integration for document storage
- Database connection pooling
- Background job processing for verification workflows