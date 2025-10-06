# Dashboard System

## Feature Overview

The Dashboard System provides role-based, comprehensive analytics and management interfaces for all HCTS platform users. It offers tailored dashboards for Healthcare Providers, Insurance Companies, and Intermediaries with real-time metrics, transaction tracking, service management, and performance analytics. The system supports multi-language interfaces and responsive design for optimal user experience across devices.

## Key Components

### Frontend Components
- **DashboardLayout.tsx** - Unified layout with role-based navigation
- **ProviderDashboard.tsx** - Healthcare provider management interface
- **InsuranceDashboard.tsx** - Insurance company marketplace and certificate management
- **IntermediaryDashboard.tsx** - Intermediary transaction and commission tracking
- **MetricsCard.tsx** - Reusable metric display component

### API Endpoints
- `GET /api/dashboard/provider/[id]` - Provider dashboard data and analytics
- `GET /api/dashboard/insurance/[id]` - Insurance company dashboard data
- `GET /api/dashboard/intermediary/[id]` - Intermediary dashboard data

### Backend Logic
- **Role-Based Access Control** - User role determination and access management
- **Real-time Analytics** - Live data aggregation and metric calculation
- **Performance Monitoring** - Service and transaction performance tracking
- **Multi-language Support** - Localized dashboard interfaces

## API Endpoints

### Provider Dashboard
```
GET /api/dashboard/provider/{userId}
```
**Response:**
```json
{
  "activeServices": 15,
  "totalSales": 12500.50,
  "totalTransactions": 89,
  "pendingOrders": 3,
  "recentTransactions": [
    {
      "id": 123,
      "quantity": 2,
      "total_price": 300.00,
      "status": "completed",
      "created_at": "2024-01-01T00:00:00.000Z",
      "service_name": "Cardiology Consultation",
      "buyer_name": "Libya Health Insurance"
    }
  ],
  "serviceMetrics": [
    {
      "service_id": 456,
      "service_name": "Cardiology Consultation",
      "views": 150,
      "purchases": 12,
      "rating": 4.5
    }
  ]
}
```

### Insurance Dashboard
```
GET /api/dashboard/insurance/{userId}
```
**Response:**
```json
{
  "totalPurchases": 25000.00,
  "activeCertificates": 45,
  "pendingVerifications": 2,
  "recentPurchases": [
    {
      "id": 789,
      "serviceName": "Dental Care Package",
      "providerName": "City Dental Clinic",
      "amount": 500.00,
      "status": "completed",
      "purchaseDate": "2024-01-01T00:00:00.000Z"
    }
  ],
  "certificateStats": {
    "valid": 42,
    "expired": 2,
    "revoked": 1
  }
}
```

### Intermediary Dashboard
```
GET /api/dashboard/intermediary/{userId}
```
**Response:**
```json
{
  "totalCommissions": 1250.00,
  "activeClients": 15,
  "pendingTransactions": 5,
  "monthlyRevenue": 2100.00,
  "recentCommissions": [
    {
      "id": 101,
      "clientName": "ABC Insurance",
      "serviceName": "Medical Consultation",
      "commissionAmount": 25.00,
      "transactionDate": "2024-01-01T00:00:00.000Z"
    }
  ],
  "clientMetrics": [
    {
      "clientId": 202,
      "clientName": "XYZ Healthcare",
      "totalTransactions": 25,
      "totalCommission": 625.00
    }
  ]
}
```

## Usage Examples

### Provider Dashboard Implementation
```typescript
// Provider dashboard with service management
function ProviderDashboardView() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const response = await fetch(`/api/dashboard/provider/${session.user.id}`);
      const data = await response.json();
      setDashboardData(data);
    };

    fetchDashboard();
  }, [session]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricsCard
          title="Active Services"
          value={dashboardData?.activeServices || 0}
          description="Currently available"
          icon={Package}
        />

        <MetricsCard
          title="Total Sales"
          value={`$${dashboardData?.totalSales?.toFixed(2) || '0.00'}`}
          description="Revenue generated"
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />

        <MetricsCard
          title="Total Transactions"
          value={dashboardData?.totalTransactions || 0}
          description="Completed orders"
          icon={ShoppingCart}
        />

        <MetricsCard
          title="Pending Orders"
          value={dashboardData?.pendingOrders || 0}
          description="Awaiting completion"
          icon={Clock}
        />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.recentTransactions?.map(transaction => (
              <div key={transaction.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{transaction.service_name}</p>
                  <p className="text-sm text-gray-600">
                    {transaction.buyer_name} • {transaction.quantity} units
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${transaction.total_price.toFixed(2)}</p>
                  <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Service Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.serviceMetrics?.map(metric => (
              <div key={metric.service_id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{metric.service_name}</span>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {metric.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="h-4 w-4" />
                      {metric.purchases}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {metric.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Progress
                  value={(metric.purchases / Math.max(metric.views, 1)) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Role-Based Navigation
```typescript
// Dynamic navigation based on user role
function DashboardNavigation({ userRole }) {
  const navigationConfig = {
    provider: [
      { href: '/dashboard/provider', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/provider/services', label: 'Services', icon: Package },
      { href: '/dashboard/provider/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/provider/transactions', label: 'Transactions', icon: Receipt }
    ],
    insurance: [
      { href: '/dashboard/insurance', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/insurance/marketplace', label: 'Marketplace', icon: ShoppingCart },
      { href: '/dashboard/insurance/certificates', label: 'Certificates', icon: FileText },
      { href: '/dashboard/insurance/analytics', label: 'Analytics', icon: TrendingUp }
    ],
    intermediary: [
      { href: '/dashboard/intermediary', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/intermediary/market', label: 'Market Analysis', icon: Activity },
      { href: '/dashboard/intermediary/transactions', label: 'Transactions', icon: Receipt },
      { href: '/dashboard/intermediary/commissions', label: 'Commissions', icon: DollarSign },
      { href: '/dashboard/intermediary/clients', label: 'Clients', icon: Users }
    ]
  };

  const menuItems = navigationConfig[userRole] || navigationConfig.provider;

  return (
    <nav className="space-y-2">
      {menuItems.map(item => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

### Real-time Dashboard Updates
```typescript
// Live dashboard with real-time updates
function LiveDashboard({ userId, userRole }) {
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();

    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds

    // WebSocket connection for instant updates (future enhancement)
    // const ws = new WebSocket(`ws://localhost:8080/dashboard/${userId}`);
    // ws.onmessage = (event) => {
    //   const update = JSON.parse(event.data);
    //   setData(prev => ({ ...prev, ...update }));
    //   setLastUpdate(new Date());
    // };

    return () => {
      clearInterval(interval);
      // ws.close();
    };
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/dashboard/${userRole}/${userId}`);
      const newData = await response.json();
      setData(newData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Dashboard content based on role */}
      {userRole === 'provider' && <ProviderDashboardContent data={data} />}
      {userRole === 'insurance' && <InsuranceDashboardContent data={data} />}
      {userRole === 'intermediary' && <IntermediaryDashboardContent data={data} />}
    </div>
  );
}
```

### Custom Metrics and KPIs
```typescript
// Configurable dashboard metrics
const dashboardMetrics = {
  provider: [
    {
      key: 'activeServices',
      title: 'Active Services',
      icon: Package,
      format: (value) => value.toString(),
      description: 'Currently available services'
    },
    {
      key: 'totalSales',
      title: 'Total Sales',
      icon: DollarSign,
      format: (value) => `$${value.toFixed(2)}`,
      description: 'Revenue generated',
      trend: true
    },
    {
      key: 'totalTransactions',
      title: 'Total Transactions',
      icon: ShoppingCart,
      format: (value) => value.toString(),
      description: 'Completed orders'
    },
    {
      key: 'averageRating',
      title: 'Average Rating',
      icon: Star,
      format: (value) => `${value.toFixed(1)}/5`,
      description: 'Customer satisfaction'
    }
  ],
  insurance: [
    {
      key: 'totalPurchases',
      title: 'Total Purchases',
      icon: DollarSign,
      format: (value) => `$${value.toFixed(2)}`,
      description: 'Amount spent on services'
    },
    {
      key: 'activeCertificates',
      title: 'Active Certificates',
      icon: FileText,
      format: (value) => value.toString(),
      description: 'Valid service certificates'
    },
    {
      key: 'utilizationRate',
      title: 'Utilization Rate',
      icon: TrendingUp,
      format: (value) => `${value.toFixed(1)}%`,
      description: 'Certificate usage rate'
    }
  ],
  intermediary: [
    {
      key: 'totalCommissions',
      title: 'Total Commissions',
      icon: DollarSign,
      format: (value) => `$${value.toFixed(2)}`,
      description: 'Commission earnings'
    },
    {
      key: 'activeClients',
      title: 'Active Clients',
      icon: Users,
      format: (value) => value.toString(),
      description: 'Current client count'
    },
    {
      key: 'successRate',
      title: 'Success Rate',
      icon: CheckCircle,
      format: (value) => `${value.toFixed(1)}%`,
      description: 'Transaction success rate'
    }
  ]
};

function MetricsGrid({ userRole, data }) {
  const metrics = dashboardMetrics[userRole] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map(metric => {
        const Icon = metric.icon;
        const value = data[metric.key];
        const formattedValue = metric.format(value);

        return (
          <MetricsCard
            key={metric.key}
            title={metric.title}
            value={formattedValue}
            description={metric.description}
            icon={Icon}
            trend={metric.trend ? calculateTrend(metric.key, data) : undefined}
          />
        );
      })}
    </div>
  );
}
```

## Configuration

### Environment Variables
```env
# Dashboard Configuration
DASHBOARD_UPDATE_INTERVAL=30000
DASHBOARD_CACHE_TTL=300
DASHBOARD_MAX_METRICS=20

# Analytics Configuration
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_UPDATE_FREQUENCY=3600000

# Real-time Updates
WEBSOCKET_ENABLED=true
WEBSOCKET_URL=ws://localhost:8080

# UI Configuration
DASHBOARD_THEME=dark
DASHBOARD_LANGUAGE=en
```

### Dashboard Settings
```typescript
// Dashboard configuration
export const dashboardConfig = {
  updateInterval: parseInt(process.env.DASHBOARD_UPDATE_INTERVAL || '30000'),
  cacheTtl: parseInt(process.env.DASHBOARD_CACHE_TTL || '300'),
  maxMetrics: parseInt(process.env.DASHBOARD_MAX_METRICS || '20'),

  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90'),
    updateFrequency: parseInt(process.env.ANALYTICS_UPDATE_FREQUENCY || '3600000')
  },

  realtime: {
    websocketEnabled: process.env.WEBSOCKET_ENABLED === 'true',
    websocketUrl: process.env.WEBSOCKET_URL
  },

  ui: {
    theme: process.env.DASHBOARD_THEME || 'light',
    language: process.env.DASHBOARD_LANGUAGE || 'en',
    compactMode: process.env.DASHBOARD_COMPACT_MODE === 'true'
  },

  roleBasedFeatures: {
    provider: {
      showServiceMetrics: true,
      showTransactionHistory: true,
      showAnalytics: true,
      showQuickActions: true
    },
    insurance: {
      showMarketplaceAccess: true,
      showCertificateManagement: true,
      showPurchaseHistory: true,
      showComplianceReports: true
    },
    intermediary: {
      showCommissionTracking: true,
      showClientManagement: true,
      showMarketAnalysis: true,
      showPerformanceMetrics: true
    }
  }
};
```

## Security Considerations

### Access Control
- **Role-Based Dashboards**: Users only see interfaces appropriate to their role
- **Data Isolation**: Dashboard data filtered by user ownership and permissions
- **Session Management**: Secure session handling with automatic timeouts
- **Audit Logging**: All dashboard access and actions logged for security

### Data Protection
- **Sensitive Data Masking**: Financial data and PII appropriately masked
- **Encryption**: Dashboard data encrypted in transit and at rest
- **Rate Limiting**: API calls limited to prevent abuse
- **Input Validation**: All dashboard inputs validated and sanitized

### Performance Security
- **Query Optimization**: Database queries optimized to prevent slow operations
- **Caching**: Dashboard data cached to reduce database load
- **Resource Limits**: Memory and CPU limits on dashboard operations
- **Timeout Handling**: Automatic cleanup of long-running operations

### Compliance Features
- **GDPR Compliance**: User data handling follows privacy regulations
- **HIPAA Compliance**: Healthcare data protected according to standards
- **Audit Trails**: Complete activity logs for regulatory compliance
- **Data Retention**: Configurable data retention policies

## Implementation Notes

### Dashboard Architecture
1. **Role Detection**: User role determined on login and cached
2. **Data Aggregation**: Real-time data collection from multiple sources
3. **Metric Calculation**: KPI computation with caching and optimization
4. **UI Rendering**: Responsive design with role-specific components
5. **Real-time Updates**: WebSocket or polling-based live updates

### Performance Optimizations
- **Data Caching**: Dashboard metrics cached with Redis
- **Lazy Loading**: Components loaded on demand
- **Pagination**: Large datasets paginated for performance
- **Background Updates**: Non-blocking data refresh operations

### Scalability Features
- **Horizontal Scaling**: Dashboard services can scale independently
- **Database Sharding**: User data partitioned across multiple databases
- **CDN Integration**: Static assets served globally
- **Microservices**: Dashboard broken into independent services

### Integration Points
- **Authentication System**: User role and permission management
- **Analytics Engine**: Data aggregation and metric calculation
- **Notification System**: Real-time alerts and updates
- **Audit System**: Activity logging and compliance reporting

### Future Enhancements
- **Advanced Analytics**: Machine learning-powered insights
- **Custom Dashboards**: User-configurable dashboard layouts
- **Mobile App**: Native mobile dashboard applications
- **Real-time Collaboration**: Multi-user dashboard sharing
- **Predictive Analytics**: AI-powered trend forecasting
- **API Integration**: Third-party dashboard integrations