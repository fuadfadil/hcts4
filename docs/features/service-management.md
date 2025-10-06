# Service Management

## Feature Overview

The Service Management system enables healthcare providers to create, manage, and price their medical services within the HCTS platform. It supports multiple service types (individual, package, composite), dynamic pricing with bulk discounts, ICD11 classification integration, and comprehensive service analytics. The system provides a complete service lifecycle from creation to marketplace publication.

## Key Components

### Frontend Components
- **ServiceCreator.tsx** - Multi-step service creation wizard with ICD11 integration
- **ServiceManager.tsx** - Service dashboard with CRUD operations and analytics
- **PricingCalculator.tsx** - Advanced pricing calculator with profit analysis

### API Endpoints
- `POST /api/services` - Create new service
- `GET /api/services` - List services with filtering
- `GET /api/services/[id]` - Get specific service details
- `PUT /api/services/[id]` - Update service
- `PATCH /api/services/[id]` - Partial service update
- `DELETE /api/services/[id]` - Delete service
- `GET /api/services/provider/[id]` - Get provider's services
- `GET /api/services/stats` - Service statistics and analytics
- `POST /api/services/calculate-price` - Pricing calculations

### Backend Logic
- **Service CRUD Operations** - Complete service lifecycle management
- **Pricing Engine** - Dynamic pricing with bulk discounts and profit calculations
- **Analytics Engine** - Service performance metrics and reporting
- **ICD11 Integration** - Medical classification and categorization

## API Endpoints

### Create Service
```
POST /api/services
```
**Request Body:**
```json
{
  "name": "Cardiology Consultation",
  "description": "Comprehensive heart health assessment and consultation",
  "icd11Code": "BA00",
  "serviceType": "individual",
  "cost": 50.00,
  "profitMargin": 25.0,
  "basePrice": 62.50,
  "discountTiers": {
    "50-99": 5,
    "100+": 10
  },
  "quantityAvailable": 0,
  "specifications": {
    "duration": "30 minutes",
    "includes": ["ECG", "Blood pressure", "Consultation"]
  },
  "componentServices": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Cardiology Consultation",
    "icd11_code": "BA00",
    "service_type": "individual",
    "base_price": 62.50,
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Service created successfully"
}
```

### Get Services
```
GET /api/services?provider_id={id}
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Cardiology Consultation",
      "description": "Comprehensive heart health assessment",
      "icd11_code": "BA00",
      "service_type": "individual",
      "base_price": 62.50,
      "status": "active",
      "quantity_available": 0,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Update Service
```
PUT /api/services/{id}
PATCH /api/services/{id}
```
**Request Body:**
```json
{
  "name": "Updated Service Name",
  "basePrice": 75.00,
  "status": "inactive"
}
```

### Get Provider Services
```
GET /api/services/provider/{providerId}
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Cardiology Consultation",
      "icd11_code": "BA00",
      "base_price": 62.50,
      "status": "active"
    }
  ]
}
```

### Service Statistics
```
GET /api/services/stats?provider_id={id}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalServices": 15,
    "activeServices": 12,
    "totalRevenue": 25000.00,
    "averagePrice": 75.50
  }
}
```

### Price Calculation
```
POST /api/services/calculate-price
```
**Request Body:**
```json
{
  "cost": 50.00,
  "profitMargin": 25.0,
  "basePrice": 62.50,
  "quantity": 100,
  "discountTiers": {
    "50-99": 5,
    "100+": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unitPrice": 56.25,
    "totalRevenue": 5625.00,
    "totalCost": 5000.00,
    "profit": 625.00,
    "profitMargin": 12.5,
    "discountApplied": 10
  }
}
```

## Database Tables

### services
Main service catalog with pricing and classification information.
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

### service_components (for composite services)
Links services that make up composite service packages.
```sql
CREATE TABLE service_components (
  id SERIAL PRIMARY KEY,
  composite_service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  component_service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  INDEX service_components_composite_service_id_idx ON (composite_service_id),
  INDEX service_components_component_service_id_idx ON (component_service_id)
);
```

## Usage Examples

### Service Creation Workflow
```typescript
// Multi-step service creation
function createHealthcareService() {
  const [currentStep, setCurrentStep] = useState(0);
  const [serviceData, setServiceData] = useState({
    name: "",
    icd11Code: "",
    serviceType: "individual",
    basePrice: 0,
    discountTiers: { "50-99": 5, "100+": 10 }
  });

  const steps = [
    { title: "Basic Info", component: BasicInfoStep },
    { title: "Classification", component: ICD11ClassificationStep },
    { title: "Pricing", component: PricingStep },
    { title: "Review", component: ReviewStep }
  ];

  const handleSubmit = async () => {
    const response = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceData)
    });

    if (response.ok) {
      // Handle success
      console.log('Service created successfully');
    }
  };
}
```

### Service Management Dashboard
```typescript
// Provider service dashboard
function ServiceDashboard({ providerId }) {
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchServices();
    fetchStats();
  }, [providerId]);

  const fetchServices = async () => {
    const response = await fetch(`/api/services/provider/${providerId}`);
    const data = await response.json();
    setServices(data.data);
  };

  const fetchStats = async () => {
    const response = await fetch(`/api/services/stats?provider_id=${providerId}`);
    const data = await response.json();
    setStats(data.data);
  };

  const updateServiceStatus = async (serviceId, status) => {
    await fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchServices(); // Refresh list
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats?.totalServices}</div>
            <div className="text-sm text-gray-600">Total Services</div>
          </CardContent>
        </Card>
        {/* ... more stats */}
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            onStatusChange={updateServiceStatus}
          />
        ))}
      </div>
    </div>
  );
}
```

### Pricing Calculator Integration
```typescript
// Advanced pricing calculator
function AdvancedPricingCalculator() {
  const [config, setConfig] = useState({
    cost: 0,
    profitMargin: 20,
    basePrice: 0,
    quantity: 1,
    discountTiers: { "50-99": 5, "100+": 10 }
  });

  const calculatePricing = async () => {
    const response = await fetch('/api/services/calculate-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await response.json();

    return {
      unitPrice: result.data.unitPrice,
      totalRevenue: result.data.totalRevenue,
      profit: result.data.profit,
      profitMargin: result.data.profitMargin
    };
  };

  const getSuggestedPrice = () => {
    if (config.cost && config.profitMargin) {
      return config.cost * (1 + config.profitMargin / 100);
    }
    return 0;
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Input Panel */}
      <div>
        <Input
          label="Cost per Unit"
          type="number"
          value={config.cost}
          onChange={(e) => setConfig(prev => ({
            ...prev,
            cost: parseFloat(e.target.value)
          }))}
        />
        <Input
          label="Profit Margin (%)"
          type="number"
          value={config.profitMargin}
          onChange={(e) => setConfig(prev => ({
            ...prev,
            profitMargin: parseFloat(e.target.value)
          }))}
        />
        <Button onClick={() => setConfig(prev => ({
          ...prev,
          basePrice: getSuggestedPrice()
        }))}>
          Calculate Suggested Price
        </Button>
      </div>

      {/* Results Panel */}
      <PricingResults results={calculatePricing()} />
    </div>
  );
}
```

### Service Filtering and Search
```typescript
// Advanced service filtering
function ServiceFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    icd11Code: "",
    priceRange: { min: 0, max: 1000 }
  });

  const applyFilters = () => {
    const queryParams = new URLSearchParams();

    if (filters.search) queryParams.append("search", filters.search);
    if (filters.status !== "all") queryParams.append("status", filters.status);
    if (filters.type !== "all") queryParams.append("type", filters.type);
    if (filters.icd11Code) queryParams.append("icd11_code", filters.icd11Code);

    onFilterChange(queryParams.toString());
  };

  return (
    <div className="flex gap-4 mb-6">
      <Input
        placeholder="Search services..."
        value={filters.search}
        onChange={(e) => setFilters(prev => ({
          ...prev,
          search: e.target.value
        }))}
      />
      <Select
        value={filters.status}
        onValueChange={(value) => setFilters(prev => ({
          ...prev,
          status: value
        }))}
      >
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </Select>
      <Button onClick={applyFilters}>Apply Filters</Button>
    </div>
  );
}
```

## Configuration

### Environment Variables
```env
# Service Management Configuration
MAX_SERVICES_PER_PROVIDER=1000
DEFAULT_SERVICE_STATUS=active
DEFAULT_PROFIT_MARGIN=20

# Pricing Configuration
MIN_PRICE=0.01
MAX_PRICE=10000.00
MAX_DISCOUNT_PERCENTAGE=50

# Analytics Configuration
STATS_CACHE_TTL=300  # 5 minutes
REVENUE_CALCULATION_PERIOD=30  # days

# File Upload Configuration (for service images/documents)
SERVICE_UPLOAD_PATH=/uploads/services
MAX_SERVICE_FILES=10
SERVICE_FILE_SIZE_LIMIT=5242880  # 5MB
```

### Service Type Configuration
```typescript
// Service type definitions
export const SERVICE_TYPES = {
  individual: {
    name: "Individual Service",
    description: "Single medical service or procedure",
    maxComponents: 1
  },
  package: {
    name: "Service Package",
    description: "Bundled services at discounted rate",
    maxComponents: 1
  },
  composite: {
    name: "Composite Service",
    description: "Complex service combining multiple components",
    maxComponents: 20
  }
};
```

## Security Considerations

### Access Control
- **Provider-Only Operations**: Service creation and management restricted to verified providers
- **Ownership Validation**: Users can only manage their own services
- **Status Permissions**: Only providers can change service status
- **Audit Logging**: All service modifications logged for compliance

### Data Validation
- **Price Limits**: Minimum and maximum price validation
- **ICD11 Validation**: Services must have valid ICD11 classification codes
- **Quantity Validation**: Inventory management with overflow protection
- **Input Sanitization**: All text inputs sanitized for XSS prevention

### Performance Security
- **Rate Limiting**: API endpoints protected against abuse
- **Query Optimization**: Database queries optimized to prevent slow queries
- **Caching**: Service data cached to reduce database load
- **File Upload Security**: Strict file type and size validation

### Compliance Features
- **Medical Data Handling**: Compliant with healthcare data regulations
- **Audit Trails**: Complete audit logs for service changes
- **Data Retention**: Configurable retention policies for service data
- **GDPR Compliance**: User data handling follows privacy regulations

## Implementation Notes

### Service Lifecycle
1. **Creation**: Multi-step wizard with validation
2. **Classification**: ICD11 code assignment and validation
3. **Pricing**: Dynamic pricing with bulk discount configuration
4. **Publication**: Service goes live in marketplace
5. **Management**: Ongoing status and pricing updates
6. **Analytics**: Performance monitoring and reporting
7. **Archival**: Service deactivation and data retention

### Performance Optimizations
- **Database Indexing**: Optimized indexes on frequently queried fields
- **Caching Strategy**: Redis caching for service listings and stats
- **Pagination**: Efficient pagination for large service catalogs
- **Lazy Loading**: Components loaded on demand in composite services

### Scalability Features
- **Horizontal Scaling**: Stateless service operations support multiple instances
- **Database Sharding**: Services can be sharded by provider or region
- **CDN Integration**: Service images and documents served via CDN
- **Background Processing**: Analytics and reporting run asynchronously

### Integration Points
- **Marketplace**: Services published for trading and purchasing
- **ICD11 System**: Medical classification and categorization
- **Payment System**: Pricing and transaction processing
- **Certificate System**: Service completion verification
- **Analytics**: Service performance and revenue tracking

### Future Enhancements
- **AI-Powered Pricing**: Machine learning for optimal price suggestions
- **Dynamic Bundling**: Automated service package recommendations
- **Service Templates**: Pre-configured service templates by specialty
- **Multi-language Support**: Service descriptions in multiple languages
- **Advanced Analytics**: Predictive analytics for service demand
- **Integration APIs**: Third-party system integration capabilities