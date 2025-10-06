# Marketplace & Trading

## Feature Overview

The Marketplace & Trading system enables healthcare service trading between verified providers and insurance companies/intermediaries. It provides a comprehensive e-commerce platform with advanced search, filtering, shopping cart functionality, and secure checkout processes. The marketplace supports bulk purchasing with dynamic pricing, service categorization by ICD11 codes, and comprehensive transaction management.

## Key Components

### Frontend Components
- **ServiceMarketplace.tsx** - Main marketplace interface with search and filtering
- **ServiceCard.tsx** - Individual service display with add-to-cart functionality
- **ShoppingCart.tsx** - Cart management with quantity controls and checkout
- **CheckoutFlow.tsx** - Multi-step checkout process with payment integration

### API Endpoints
- `GET /api/marketplace/services` - Service browsing with advanced filtering
- `POST /api/cart/add` - Add services to shopping cart
- `GET /api/cart/[userId]` - Retrieve user's shopping cart
- `DELETE /api/cart/[userId]` - Remove items or clear cart

### Backend Logic
- **Marketplace Engine** - Service discovery and recommendation system
- **Cart Management** - Shopping cart persistence and state management
- **Pricing Engine** - Dynamic pricing with bulk discounts
- **Transaction Processing** - Secure checkout and payment handling

## API Endpoints

### Get Marketplace Services
```
GET /api/marketplace/services
```
**Query Parameters:**
- `search` (optional): Search term for service name or description
- `icd11_code` (optional): Filter by ICD11 classification code
- `provider_id` (optional): Filter by specific provider
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter
- `service_type` (optional): Filter by service type (individual/package/composite)
- `sort_by` (optional): Sort field (created_at, price, name)
- `sort_order` (optional): Sort order (asc, desc)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

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
      "base_price": 150.00,
      "discount_tiers": { "50-99": 5, "100+": 10 },
      "quantity_available": 0,
      "specifications": { "duration": "30 minutes" },
      "created_at": "2024-01-01T00:00:00.000Z",
      "provider": {
        "id": 1,
        "organization_name": "City Medical Center"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "message": "Services retrieved successfully"
}
```

### Add to Cart
```
POST /api/cart/add
```
**Request Body:**
```json
{
  "userId": 123,
  "serviceId": 456,
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 789,
    "user_id": 123,
    "service_id": 456,
    "quantity": 2,
    "added_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Service added to cart successfully"
}
```

### Get Cart
```
GET /api/cart/{userId}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 789,
        "quantity": 2,
        "added_at": "2024-01-01T00:00:00.000Z",
        "service": {
          "id": 456,
          "name": "Cardiology Consultation",
          "icd11_code": "BA00",
          "base_price": 150.00,
          "discount_tiers": { "50-99": 5, "100+": 10 }
        },
        "provider": {
          "id": 1,
          "organization_name": "City Medical Center"
        },
        "itemTotal": 300.00,
        "discountedPrice": 285.00
      }
    ],
    "summary": {
      "totalItems": 2,
      "totalPrice": 285.00,
      "currency": "USD"
    }
  },
  "message": "Cart retrieved successfully"
}
```

### Remove from Cart
```
DELETE /api/cart/{userId}?serviceId={serviceId}
```
**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

### Clear Cart
```
DELETE /api/cart/{userId}
```
**Response:**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

## Database Tables

### cart
Shopping cart persistence for marketplace users.
```sql
CREATE TABLE cart (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX cart_user_id_idx ON (user_id),
  INDEX cart_service_id_idx ON (service_id),
  INDEX cart_user_service_idx ON (user_id, service_id)
);
```

### transactions
Completed marketplace transactions.
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX transactions_buyer_id_idx ON (buyer_id),
  INDEX transactions_seller_id_idx ON (seller_id),
  INDEX transactions_service_id_idx ON (service_id),
  INDEX transactions_status_idx ON (status),
  INDEX transactions_created_at_idx ON (created_at)
);
```

## Usage Examples

### Marketplace Browsing with Filters
```typescript
// Advanced marketplace search and filtering
function MarketplaceBrowser() {
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    icd11Code: "",
    serviceType: "",
    priceRange: { min: 0, max: 1000 },
    sortBy: "created_at",
    sortOrder: "desc"
  });

  const searchServices = async () => {
    const params = new URLSearchParams({
      search: filters.search,
      icd11_code: filters.icd11Code,
      service_type: filters.serviceType,
      min_price: filters.priceRange.min.toString(),
      max_price: filters.priceRange.max.toString(),
      sort_by: filters.sortBy,
      sort_order: filters.sortOrder,
      page: "1",
      limit: "20"
    });

    const response = await fetch(`/api/marketplace/services?${params}`);
    const data = await response.json();

    if (data.success) {
      setServices(data.data);
    }
  };

  return (
    <div>
      {/* Search and Filter Controls */}
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
          value={filters.serviceType}
          onValueChange={(value) => setFilters(prev => ({
            ...prev,
            serviceType: value
          }))}
        >
          <SelectItem value="">All Types</SelectItem>
          <SelectItem value="individual">Individual</SelectItem>
          <SelectItem value="package">Package</SelectItem>
          <SelectItem value="composite">Composite</SelectItem>
        </Select>
        <Button onClick={searchServices}>Search</Button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
```

### Shopping Cart Management
```typescript
// Comprehensive cart management
function CartManager({ userId }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    const response = await fetch(`/api/cart/${userId}`);
    const data = await response.json();
    if (data.success) {
      setCart(data.data);
    }
  };

  const addToCart = async (serviceId, quantity) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, serviceId, quantity })
      });

      if (response.ok) {
        fetchCart(); // Refresh cart
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (serviceId, newQuantity) => {
    if (newQuantity < 1) return;

    // Remove and re-add with new quantity
    await addToCart(serviceId, newQuantity - currentQuantity);
  };

  const removeFromCart = async (serviceId) => {
    const response = await fetch(`/api/cart/${userId}?serviceId=${serviceId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      fetchCart();
    }
  };

  const clearCart = async () => {
    const response = await fetch(`/api/cart/${userId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      fetchCart();
    }
  };

  return (
    <div>
      {cart?.items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-4 border">
          <div>
            <h4>{item.service.name}</h4>
            <p>{item.provider.organization_name}</p>
            <p>${item.service.base_price} each</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded">
              <Button onClick={() => updateQuantity(item.service.id, item.quantity - 1)}>
                -
              </Button>
              <span className="px-4">{item.quantity}</span>
              <Button onClick={() => updateQuantity(item.service.id, item.quantity + 1)}>
                +
              </Button>
            </div>

            <div className="text-right">
              <div className="font-semibold">${item.itemTotal}</div>
              {item.discountedPrice !== item.itemTotal && (
                <div className="text-sm text-green-600">
                  Save ${(item.itemTotal - item.discountedPrice).toFixed(2)}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => removeFromCart(item.service.id)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      <div className="mt-6 flex justify-between items-center">
        <div>
          <strong>Total: ${cart?.summary.totalPrice}</strong>
          <p>{cart?.summary.totalItems} items</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={clearCart}>
            Clear Cart
          </Button>
          <Button onClick={() => proceedToCheckout()}>
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Bulk Purchasing with Discounts
```typescript
// Bulk purchase with automatic discount application
function BulkPurchaseCalculator() {
  const [quantities, setQuantities] = useState({
    cardiology: 0,
    radiology: 0,
    lab: 0
  });

  const [pricing, setPricing] = useState({
    cardiology: { basePrice: 150, discountTiers: { "50-99": 5, "100+": 10 } },
    radiology: { basePrice: 200, discountTiers: { "50-99": 7, "100+": 12 } },
    lab: { basePrice: 75, discountTiers: { "50-99": 3, "100+": 8 } }
  });

  const calculateTotal = () => {
    let total = 0;
    let totalQuantity = 0;

    Object.entries(quantities).forEach(([service, qty]) => {
      const servicePricing = pricing[service];
      const basePrice = servicePricing.basePrice;
      totalQuantity += qty;

      // Apply bulk discount
      let discount = 0;
      if (totalQuantity >= 100) {
        discount = servicePricing.discountTiers["100+"];
      } else if (totalQuantity >= 50) {
        discount = servicePricing.discountTiers["50-99"];
      }

      const discountedPrice = basePrice * (1 - discount / 100);
      total += discountedPrice * qty;
    });

    return {
      total,
      totalQuantity,
      discountApplied: totalQuantity >= 50
    };
  };

  const { total, totalQuantity, discountApplied } = calculateTotal();

  return (
    <div className="space-y-4">
      {Object.entries(quantities).map(([service, qty]) => (
        <div key={service} className="flex items-center justify-between">
          <div>
            <h4 className="capitalize">{service}</h4>
            <p>${pricing[service].basePrice} each</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setQuantities(prev => ({
                ...prev,
                [service]: Math.max(0, qty - 10)
              }))}
            >
              -10
            </Button>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQuantities(prev => ({
                ...prev,
                [service]: parseInt(e.target.value) || 0
              }))}
              className="w-20"
            />
            <Button
              onClick={() => setQuantities(prev => ({
                ...prev,
                [service]: qty + 10
              }))}
            >
              +10
            </Button>
          </div>
        </div>
      ))}

      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-semibold">
              Total: ${total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              {totalQuantity} services
            </p>
          </div>

          {discountApplied && (
            <Badge className="bg-green-100 text-green-800">
              Bulk discount applied!
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Service Recommendation Engine
```typescript
// AI-powered service recommendations
function ServiceRecommendations({ userId, currentServices }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, currentServices]);

  const fetchRecommendations = async () => {
    // Analyze user's purchase history and preferences
    const userHistory = await fetchUserPurchaseHistory(userId);
    const preferences = analyzePreferences(userHistory);

    // Find complementary services
    const recommended = await findComplementaryServices(
      currentServices,
      preferences
    );

    setRecommendations(recommended);
  };

  const analyzePreferences = (history) => {
    const specialtyCounts = {};
    const icd11Counts = {};

    history.forEach(purchase => {
      specialtyCounts[purchase.service.specialty] =
        (specialtyCounts[purchase.service.specialty] || 0) + 1;
      icd11Counts[purchase.service.icd11_code] =
        (icd11Counts[purchase.service.icd11_code] || 0) + 1;
    });

    return { specialtyCounts, icd11Counts };
  };

  const findComplementaryServices = async (current, preferences) => {
    // Find services that complement current cart
    const complementary = [];

    for (const service of current) {
      const related = await searchRelatedServices(service.icd11_code);
      complementary.push(...related.slice(0, 3));
    }

    // Remove duplicates and already selected services
    return [...new Set(complementary)]
      .filter(service => !current.find(s => s.id === service.id))
      .slice(0, 6);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Recommended for You</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            showRecommendationBadge={true}
          />
        ))}
      </div>
    </div>
  );
}
```

## Configuration

### Environment Variables
```env
# Marketplace Configuration
MARKETPLACE_ITEMS_PER_PAGE=20
MAX_CART_ITEMS=100
CART_EXPIRY_HOURS=72

# Pricing Configuration
BULK_DISCOUNT_TIERS='{"50-99": 5, "100+": 10}'
MIN_DISCOUNT_PERCENTAGE=0
MAX_DISCOUNT_PERCENTAGE=50

# Search Configuration
SEARCH_INDEX_UPDATE_INTERVAL=3600000  # 1 hour
SEARCH_RESULT_LIMIT=1000

# Recommendation Engine
ENABLE_RECOMMENDATIONS=true
RECOMMENDATION_CACHE_TTL=1800  # 30 minutes
```

### Marketplace Settings
```typescript
// Marketplace configuration
export const marketplaceConfig = {
  itemsPerPage: parseInt(process.env.MARKETPLACE_ITEMS_PER_PAGE || '20'),
  maxCartItems: parseInt(process.env.MAX_CART_ITEMS || '100'),
  cartExpiryHours: parseInt(process.env.CART_EXPIRY_HOURS || '72'),

  pricing: {
    bulkDiscountTiers: JSON.parse(process.env.BULK_DISCOUNT_TIERS || '{"50-99": 5, "100+": 10}'),
    minDiscount: parseInt(process.env.MIN_DISCOUNT_PERCENTAGE || '0'),
    maxDiscount: parseInt(process.env.MAX_DISCOUNT_PERCENTAGE || '50')
  },

  search: {
    indexUpdateInterval: parseInt(process.env.SEARCH_INDEX_UPDATE_INTERVAL || '3600000'),
    resultLimit: parseInt(process.env.SEARCH_RESULT_LIMIT || '1000')
  },

  recommendations: {
    enabled: process.env.ENABLE_RECOMMENDATIONS === 'true',
    cacheTtl: parseInt(process.env.RECOMMENDATION_CACHE_TTL || '1800')
  }
};
```

## Security Considerations

### Access Control
- **Role-Based Access**: Only insurance companies and intermediaries can access marketplace
- **Service Visibility**: Only active services from verified providers are visible
- **Cart Ownership**: Users can only access their own shopping carts
- **Purchase Authorization**: Proper authentication required for all transactions

### Data Protection
- **Price Information**: Service pricing visible only to authorized users
- **Purchase History**: Transaction data encrypted and access-controlled
- **Cart Persistence**: Shopping cart data stored securely with user association
- **Audit Logging**: All marketplace activities logged for compliance

### Transaction Security
- **Quantity Validation**: Stock levels checked before adding to cart
- **Price Consistency**: Prices locked at time of adding to cart
- **Fraud Prevention**: Rate limiting and suspicious activity detection
- **Secure Checkout**: Encrypted payment processing integration

### Performance Security
- **Query Optimization**: Database queries optimized to prevent slow operations
- **Caching Strategy**: Marketplace data cached to reduce database load
- **Rate Limiting**: API endpoints protected against excessive requests
- **Input Validation**: All search and filter inputs validated and sanitized

## Implementation Notes

### Marketplace Architecture
1. **Service Indexing**: Regular indexing of services for fast search
2. **Cart Management**: Persistent cart storage with session management
3. **Pricing Engine**: Real-time price calculation with discount application
4. **Recommendation System**: ML-based service recommendations
5. **Checkout Flow**: Multi-step secure checkout process

### Performance Optimizations
- **Database Indexing**: Optimized indexes on search and filter fields
- **Caching Layer**: Redis caching for popular services and search results
- **Pagination**: Efficient pagination for large result sets
- **Lazy Loading**: Service details loaded on demand

### Scalability Features
- **Horizontal Scaling**: Stateless marketplace operations support multiple instances
- **Database Sharding**: Services and carts can be sharded by region or provider
- **CDN Integration**: Service images and assets served via CDN
- **Background Processing**: Search indexing and recommendations run asynchronously

### Integration Points
- **Service Management**: Provider service catalog integration
- **ICD11 System**: Medical classification-based filtering
- **Payment System**: Secure payment processing for transactions
- **Certificate System**: Service completion verification
- **Analytics**: Marketplace performance and user behavior tracking

### Future Enhancements
- **Advanced Search**: AI-powered semantic search capabilities
- **Dynamic Pricing**: Real-time price optimization based on demand
- **Service Bundles**: Automated service package recommendations
- **Market Analytics**: Advanced marketplace insights and reporting
- **Mobile App**: Native mobile marketplace application
- **Multi-currency**: Support for multiple currencies and exchange rates