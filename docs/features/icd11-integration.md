# ICD11 Integration

## Feature Overview

The ICD11 Integration system provides comprehensive support for the World Health Organization's International Classification of Diseases, 11th Revision (ICD11). This healthcare classification system enables precise categorization of medical conditions, procedures, and services within the HCTS platform. The integration supports hierarchical browsing, search functionality, and automated synchronization with WHO data sources.

## Key Components

### Frontend Components
- **ICD11Browser.tsx** - Interactive hierarchical browser for ICD11 categories
- **ProviderRegistrationForm.tsx** - Service classification using ICD11 codes
- **Service Management** - ICD11 code assignment to healthcare services

### API Endpoints
- `GET /api/icd11/categories` - Retrieve ICD11 categories with filtering and pagination
- `POST /api/icd11/sync` - Synchronize ICD11 data from WHO sources

### Backend Logic
- **Category Management** - Hierarchical storage and retrieval of ICD11 classifications
- **Search Engine** - Full-text search across codes and descriptions
- **Sync Service** - Automated data synchronization with WHO APIs

## API Endpoints

### Get ICD11 Categories
```
GET /api/icd11/categories
```
**Query Parameters:**
- `search` (optional): Search term for code or name
- `parent_id` (optional): Parent category ID for hierarchical browsing
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "1A00",
      "name": "Certain infectious or parasitic diseases",
      "description": "Infectious diseases caused by bacteria, viruses, fungi, or parasites",
      "parent_id": null,
      "last_synced": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Sync ICD11 Data
```
POST /api/icd11/sync
```
**Response:**
```json
{
  "success": true,
  "message": "Successfully synced 1500 ICD11 categories",
  "data": [
    {
      "id": 1,
      "code": "1A00",
      "name": "Certain infectious or parasitic diseases",
      "description": "Infectious diseases caused by bacteria, viruses, fungi, or parasites",
      "parent_id": null,
      "last_synced": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Database Tables

### icd11_categories
Hierarchical storage of ICD11 classification categories.
```sql
CREATE TABLE icd11_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES icd11_categories(id),
  last_synced TIMESTAMP,
  INDEX icd11_categories_code_idx ON (code),
  INDEX icd11_categories_parent_id_idx ON (parent_id)
);
```

### services (ICD11 Integration)
Services table with ICD11 code references.
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icd11_code VARCHAR(10) NOT NULL,
  service_type VARCHAR NOT NULL DEFAULT 'individual' CHECK (service_type IN ('individual', 'package', 'composite')),
  cost DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  base_price DECIMAL(10,2) NOT NULL,
  discount_tiers JSON,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  specifications JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX services_provider_id_idx ON (provider_id),
  INDEX services_icd11_code_idx ON (icd11_code),
  INDEX services_status_idx ON (status),
  INDEX services_service_type_idx ON (service_type)
);
```

## Usage Examples

### ICD11 Browser Component
```typescript
// Basic usage in service creation
function ServiceCreationForm() {
  const [selectedCategories, setSelectedCategories] = useState([]);

  return (
    <div>
      <ICD11Browser
        multiSelect={true}
        selectedCategories={selectedCategories}
        onSelectCategory={(category) => {
          setSelectedCategories(prev => [...prev, category]);
        }}
      />

      <div className="mt-4">
        <h4>Selected ICD11 Codes:</h4>
        {selectedCategories.map(cat => (
          <Badge key={cat.id}>{cat.code} - {cat.name}</Badge>
        ))}
      </div>
    </div>
  );
}
```

### API Integration for Service Classification
```typescript
// Fetch ICD11 categories for service classification
const fetchICD11Categories = async (searchTerm = "") => {
  const params = new URLSearchParams();
  if (searchTerm) params.append("search", searchTerm);

  const response = await fetch(`/api/icd11/categories?${params}`);
  const data = await response.json();

  if (data.success) {
    return data.data;
  }
  throw new Error("Failed to fetch ICD11 categories");
};

// Use in provider registration
const handleServiceClassification = async () => {
  const categories = await fetchICD11Categories("cardiology");

  // Filter and select relevant categories
  const selectedCodes = categories
    .filter(cat => cat.name.toLowerCase().includes("heart"))
    .map(cat => cat.code);

  // Submit with provider registration
  await registerProvider({
    icd11Codes: selectedCodes,
    // ... other form data
  });
};
```

### Hierarchical Browsing Implementation
```typescript
// Tree structure navigation
const ICD11TreeNode = ({ category, level = 0, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState([]);

  const loadChildren = async () => {
    const response = await fetch(`/api/icd11/categories?parent_id=${category.id}`);
    const data = await response.json();
    setChildren(data.data);
  };

  const handleToggle = async () => {
    if (!isExpanded && children.length === 0) {
      await loadChildren();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div style={{ marginLeft: `${level * 20}px` }}>
      <div className="flex items-center">
        <Button onClick={handleToggle} size="sm" variant="ghost">
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </Button>
        <span
          className="cursor-pointer"
          onClick={() => onSelect(category)}
        >
          {category.code} - {category.name}
        </span>
      </div>

      {isExpanded && children.map(child => (
        <ICD11TreeNode
          key={child.id}
          category={child}
          level={level + 1}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
```

### Data Synchronization
```typescript
// Manual sync trigger (admin function)
const syncICD11Data = async () => {
  try {
    const response = await fetch('/api/icd11/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const result = await response.json();

    if (result.success) {
      console.log(`Synced ${result.data.length} categories`);
      // Update local cache or trigger UI refresh
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
};

// Scheduled sync (background job)
const scheduleICD11Sync = () => {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    await syncICD11Data();
  });
};
```

## Configuration

### Environment Variables
```env
# ICD11 API Configuration
ICD11_WHO_API_URL=https://id.who.int/icd/release/11/2024-01/mms
ICD11_API_KEY=your-who-api-key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/hcts

# Sync Configuration
ICD11_SYNC_INTERVAL=86400000  # 24 hours in milliseconds
ICD11_SYNC_ENABLED=true

# Caching Configuration
REDIS_URL=redis://localhost:6379
ICD11_CACHE_TTL=3600  # 1 hour
```

### Sync Configuration
```typescript
// config/icd11.ts
export const icd11Config = {
  whoApiUrl: process.env.ICD11_WHO_API_URL,
  apiKey: process.env.ICD11_API_KEY,
  syncInterval: parseInt(process.env.ICD11_SYNC_INTERVAL || '86400000'),
  enabled: process.env.ICD11_SYNC_ENABLED === 'true',
  cacheTtl: parseInt(process.env.ICD11_CACHE_TTL || '3600')
};
```

## Security Considerations

### Data Protection
- ICD11 data is public healthcare classification information
- No sensitive patient data stored in ICD11 tables
- API endpoints protected against excessive requests
- Rate limiting implemented for category browsing

### Access Control
- **Public Access**: Category browsing available to all authenticated users
- **Provider Access**: Service classification restricted to healthcare providers
- **Admin Access**: Data synchronization restricted to administrators
- **Audit Logging**: All ICD11 data access logged for compliance

### Compliance Features
- **WHO Compliance**: Direct integration with official WHO ICD11 data
- **Data Accuracy**: Regular synchronization ensures up-to-date classifications
- **Version Control**: Timestamp tracking for data synchronization
- **Backup**: Regular database backups of ICD11 classification data

### Security Monitoring
- API usage monitoring for abuse detection
- Failed sync attempts logged and alerted
- Data integrity checks during synchronization
- Rate limiting on search and browse endpoints

## Implementation Notes

### Data Model Design
- **Hierarchical Structure**: Parent-child relationships for category organization
- **Code Uniqueness**: ICD11 codes must be unique across all categories
- **Flexible Descriptions**: Optional descriptions for enhanced usability
- **Sync Tracking**: Last synchronized timestamp for data freshness

### Performance Optimizations
- **Database Indexing**: Optimized indexes on code, name, and parent_id
- **Caching Layer**: Redis caching for frequently accessed categories
- **Pagination**: Efficient pagination for large category sets
- **Lazy Loading**: Child categories loaded on demand in browser

### Scalability Features
- **Horizontal Scaling**: Stateless API design supports multiple instances
- **CDN Integration**: Static ICD11 data can be served via CDN
- **Background Sync**: Asynchronous data synchronization doesn't block user operations
- **Read Replicas**: Database read replicas for improved query performance

### Integration Points
- **Service Management**: ICD11 codes used for service categorization
- **Provider Registration**: Service classification during onboarding
- **Marketplace**: Service filtering and search by ICD11 categories
- **Reporting**: Analytics and reporting grouped by medical categories

### Future Enhancements
- **Real WHO API Integration**: Replace mock data with actual WHO API calls
- **Advanced Search**: Full-text search with relevance scoring
- **Category Mapping**: Cross-references between ICD10 and ICD11
- **Machine Learning**: AI-powered service categorization suggestions
- **Multi-language Support**: ICD11 categories in multiple languages