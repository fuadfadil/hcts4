# Payment Processing

## Feature Overview

The Payment Processing system handles secure financial transactions within the HCTS platform, supporting multiple Libyan payment gateways including OnePay and LyPay. The system implements a 1% platform commission, supports various payment methods (credit cards, bank transfers, digital wallets), and ensures PCI DSS compliance for card payments. All transactions are tracked with comprehensive audit trails and support for refunds and dispute resolution.

## Key Components

### Frontend Components
- **PaymentForm.tsx** - Multi-method payment form with commission display
- **PaymentStatus.tsx** - Real-time payment status tracking and display

### API Endpoints
- `POST /api/payments/initiate` - Initialize payment with gateway
- `POST /api/payments/process` - Process payment through gateway
- `GET /api/payments/status/[id]` - Check payment status
- `POST /api/payments/webhook` - Handle gateway webhooks
- `GET /api/payments/history/[userId]` - User payment history

### Backend Logic
- **Commission Calculator** - Platform fee calculation (1% of transaction)
- **Payment Gateway** - Abstract gateway interface with multiple implementations
- **Transaction Processing** - Secure payment flow with status tracking
- **Webhook Handler** - Automated payment status updates

## API Endpoints

### Initiate Payment
```
POST /api/payments/initiate
```
**Request Body:**
```json
{
  "transactionId": "123",
  "amount": 150.00,
  "paymentMethod": "onepay",
  "userId": "456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 789,
      "transaction_id": 123,
      "amount": "150.00",
      "commission_amount": "1.50",
      "payment_method": "onepay",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "gatewayResponse": {
      "paymentUrl": "https://onepay.ly/pay/123",
      "commission": 1.50,
      "netAmount": 148.50
    }
  },
  "message": "Payment initiated successfully"
}
```

### Process Payment
```
POST /api/payments/process
```
**Request Body:**
```json
{
  "paymentId": "789",
  "paymentData": {
    "cardNumber": "4111111111111111",
    "expiry": "12/25",
    "cvv": "123",
    "cardholderName": "John Doe"
  },
  "userId": "456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 789,
      "status": "completed",
      "gateway_response": {
        "processed": true,
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    },
    "gatewayResponse": {
      "success": true,
      "transactionId": "123",
      "status": "completed"
    }
  },
  "message": "Payment processed successfully"
}
```

### Payment Status
```
GET /api/payments/status/{paymentId}?userId={userId}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 789,
      "transactionId": 123,
      "amount": 150.00,
      "commissionAmount": 1.50,
      "paymentMethod": "onepay",
      "status": "completed",
      "gatewayResponse": {
        "processed": true,
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "gatewayStatus": {
      "success": true,
      "status": "completed",
      "lastChecked": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Payment History
```
GET /api/payments/history/{userId}?page=1&limit=20
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "transactionId": 123,
      "amount": 150.00,
      "commissionAmount": 1.50,
      "paymentMethod": "onepay",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "service": {
        "name": "Cardiology Consultation",
        "provider": "City Medical Center"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "totalCount": 100
  }
}
```

## Database Tables

### payments
Payment transaction records with gateway integration.
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  payment_method VARCHAR NOT NULL CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal', 'crypto', 'onepay', 'lypay')),
  gateway_response JSON,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX payments_transaction_id_idx ON (transaction_id),
  INDEX payments_status_idx ON (status)
);
```

## Usage Examples

### Payment Form Integration
```typescript
// Complete payment flow in checkout
function CheckoutProcess({ cartItems, totalAmount, userId }) {
  const [paymentMethod, setPaymentMethod] = useState('onepay');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Step 1: Create transaction
      const transactionResponse = await fetch('/api/purchase/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, userId })
      });

      const { transactionId } = await transactionResponse.json();

      // Step 2: Initiate payment
      const paymentResponse = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          amount: totalAmount,
          paymentMethod,
          userId
        })
      });

      const { data } = await paymentResponse.json();

      // Step 3: Redirect to gateway or process inline
      if (paymentMethod === 'onepay' || paymentMethod === 'lypay') {
        window.location.href = data.gatewayResponse.paymentUrl;
      } else {
        // Handle inline processing for credit cards
        await processInlinePayment(data.payment.id);
      }

    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PaymentForm
      amount={totalAmount}
      transactionId={transactionId}
      onPaymentInitiate={handlePayment}
      onPaymentProcess={processInlinePayment}
    />
  );
}
```

### Commission Calculation
```typescript
// Commission calculator usage
import { CommissionCalculator } from '@/lib/commission-calculator';

function PaymentSummary({ amount }) {
  const commission = CommissionCalculator.calculateCommission(amount);
  const netAmount = CommissionCalculator.calculateNetAmount(amount);
  const breakdown = CommissionCalculator.getCommissionBreakdown(amount);

  return (
    <div className="payment-summary">
      <div className="amount-breakdown">
        <div>Service Amount: ${amount.toFixed(2)}</div>
        <div>Platform Fee (1%): ${commission.toFixed(2)}</div>
        <div>Net Amount: ${netAmount.toFixed(2)}</div>
      </div>

      <div className="commission-details">
        <p>Commission Rate: {(breakdown.commissionRate * 100)}%</p>
        <p>Commission Amount: ${breakdown.commissionAmount.toFixed(2)}</p>
        <p>You Receive: ${breakdown.netAmount.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

### Payment Gateway Integration
```typescript
// Custom payment gateway implementation
import { PaymentGateway, PaymentData, PaymentResponse } from '@/lib/payment-gateway';

class CustomGateway extends PaymentGateway {
  async initiatePayment(data: PaymentData): Promise<PaymentResponse> {
    // Custom gateway logic
    const commission = this.calculateCommission(data.amount);

    try {
      const response = await fetch(`${this.config.baseUrl}/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: data.amount - commission, // Net amount to gateway
          currency: data.currency,
          description: data.description,
          customerEmail: data.customerEmail,
          transactionId: data.transactionId
        })
      });

      const gatewayData = await response.json();

      return {
        success: true,
        transactionId: data.transactionId,
        gatewayTransactionId: gatewayData.transactionId,
        status: 'pending',
        gatewayResponse: gatewayData
      };
    } catch (error) {
      return {
        success: false,
        transactionId: data.transactionId,
        status: 'failed',
        error: error.message
      };
    }
  }

  async processPayment(transactionId: string, paymentData: any): Promise<PaymentResponse> {
    // Process payment logic
    const response = await fetch(`${this.config.baseUrl}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId,
        ...paymentData
      })
    });

    const result = await response.json();

    return {
      success: result.success,
      transactionId,
      status: result.status,
      gatewayResponse: result
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResponse> {
    const response = await fetch(`${this.config.baseUrl}/status/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    const status = await response.json();

    return {
      success: true,
      transactionId,
      status: status.status,
      gatewayResponse: status
    };
  }

  async handleWebhook(data: any): Promise<PaymentResponse> {
    // Verify webhook signature
    const isValid = this.verifyWebhookSignature(data);

    if (!isValid) {
      return {
        success: false,
        transactionId: data.transactionId,
        status: 'failed',
        error: 'Invalid webhook signature'
      };
    }

    return {
      success: true,
      transactionId: data.transactionId,
      status: data.status,
      gatewayResponse: data
    };
  }

  private verifyWebhookSignature(data: any): boolean {
    // Implement webhook signature verification
    return true; // Placeholder
  }
}
```

### Payment Status Monitoring
```typescript
// Real-time payment status monitoring
function PaymentStatusMonitor({ paymentId, userId }) {
  const [status, setStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    fetchStatus();
    startPolling();
  }, [paymentId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/payments/status/${paymentId}?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);

        // Stop polling if payment is completed or failed
        if (['completed', 'failed', 'refunded'].includes(data.data.payment.status)) {
          stopPolling();
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
    }
  };

  const startPolling = () => {
    setIsPolling(true);
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  };

  const stopPolling = () => {
    setIsPolling(false);
  };

  if (!status) return <div>Loading payment status...</div>;

  return (
    <PaymentStatus
      transactionId={status.payment.transactionId}
      status={status.payment.status}
      amount={status.payment.amount}
      commission={status.payment.commissionAmount}
      paymentMethod={status.payment.paymentMethod}
      gatewayResponse={status.payment.gatewayResponse}
      createdAt={status.payment.createdAt}
      updatedAt={status.payment.updatedAt}
    />
  );
}
```

### Webhook Handler Implementation
```typescript
// Payment webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-webhook-signature');

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process webhook based on gateway
    const gateway = createPaymentGateway(body.gateway);
    const result = await gateway.handleWebhook(body);

    if (result.success) {
      // Update payment status in database
      await updatePaymentStatus(result.transactionId, result.status, result.gatewayResponse);

      // Trigger post-payment actions
      if (result.status === 'completed') {
        await handlePaymentCompletion(result.transactionId);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handlePaymentCompletion(transactionId: string) {
  // Update transaction status
  await db.update(transactions)
    .set({ status: 'completed' })
    .where(eq(transactions.id, parseInt(transactionId)));

  // Generate certificate
  await generateServiceCertificate(transactionId);

  // Send notifications
  await sendPaymentConfirmation(transactionId);

  // Update analytics
  await updatePaymentAnalytics(transactionId);
}
```

## Configuration

### Environment Variables
```env
# Payment Gateway Configuration
ONEPAY_API_KEY=your_onepay_api_key
ONEPAY_API_SECRET=your_onepay_secret
ONEPAY_BASE_URL=https://api.onepay.ly

LYPAY_API_KEY=your_lypay_api_key
LYPAY_API_SECRET=your_lypay_secret
LYPAY_BASE_URL=https://api.lypay.ly

# Commission Configuration
PLATFORM_COMMISSION_RATE=0.01  # 1%
MIN_COMMISSION_AMOUNT=0.50
MAX_COMMISSION_AMOUNT=50.00

# Payment Limits
MIN_PAYMENT_AMOUNT=1.00
MAX_PAYMENT_AMOUNT=10000.00

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_TIMEOUT=30000  # 30 seconds

# PCI Compliance
PCI_ENVIRONMENT=production
PCI_LOGGING_ENABLED=true
```

### Gateway Configuration
```typescript
// Payment gateway configuration
export const paymentConfig = {
  gateways: {
    onepay: {
      apiKey: process.env.ONEPAY_API_KEY,
      apiSecret: process.env.ONEPAY_API_SECRET,
      baseUrl: process.env.ONEPAY_BASE_URL,
      webhookUrl: `${process.env.BASE_URL}/api/payments/webhook`
    },
    lypay: {
      apiKey: process.env.LYPAY_API_KEY,
      apiSecret: process.env.LYPAY_API_SECRET,
      baseUrl: process.env.LYPAY_BASE_URL,
      webhookUrl: `${process.env.BASE_URL}/api/payments/webhook`
    }
  },

  commission: {
    rate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.01'),
    minAmount: parseFloat(process.env.MIN_COMMISSION_AMOUNT || '0.50'),
    maxAmount: parseFloat(process.env.MAX_COMMISSION_AMOUNT || '50.00')
  },

  limits: {
    minAmount: parseFloat(process.env.MIN_PAYMENT_AMOUNT || '1.00'),
    maxAmount: parseFloat(process.env.MAX_PAYMENT_AMOUNT || '10000.00')
  },

  security: {
    webhookSecret: process.env.WEBHOOK_SECRET,
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000'),
    pciCompliant: process.env.PCI_ENVIRONMENT === 'production'
  }
};
```

## Security Considerations

### Payment Security
- **PCI DSS Compliance**: Card data never stored on platform servers
- **Tokenization**: Sensitive payment data replaced with secure tokens
- **Encryption**: All payment communications use TLS 1.3
- **Signature Verification**: Webhook signatures validated before processing

### Transaction Security
- **Amount Validation**: Payment amounts verified against cart totals
- **User Authorization**: Payments can only be initiated by transaction owners
- **Fraud Detection**: Suspicious transaction patterns flagged for review
- **Rate Limiting**: Payment attempts limited per user per time period

### Data Protection
- **Minimal Data Retention**: Payment data retained only as required by regulations
- **Secure Logging**: Payment logs encrypted and access-controlled
- **Audit Trails**: Complete transaction history with tamper-proof records
- **GDPR Compliance**: User payment data handled according to privacy regulations

### Gateway Security
- **API Key Protection**: Gateway credentials stored securely and rotated regularly
- **Request Signing**: All gateway requests signed for authenticity
- **Response Validation**: Gateway responses validated for integrity
- **Failover Support**: Multiple gateway support for redundancy

## Implementation Notes

### Payment Flow Architecture
1. **Cart Creation**: User adds services to cart with pricing calculation
2. **Transaction Initiation**: Transaction record created with pending status
3. **Payment Setup**: Payment record created and gateway communication initiated
4. **Gateway Processing**: User redirected to gateway or payment processed inline
5. **Status Updates**: Payment status updated via polling or webhooks
6. **Completion**: Transaction marked complete and certificate generation triggered

### Commission Structure
- **Platform Fee**: 1% of total transaction amount
- **Provider Payment**: Net amount after commission deduction
- **Fee Distribution**: Commission used for platform operations and development
- **Transparent Pricing**: All fees clearly displayed to users

### Multi-Gateway Support
- **OnePay Integration**: Primary Libyan payment gateway
- **LyPay Integration**: Alternative digital payment solution
- **Credit Card Processing**: International card acceptance
- **Bank Transfer**: Manual transfer processing for large amounts

### Error Handling
- **Gateway Failures**: Automatic retry with exponential backoff
- **Network Issues**: Offline payment queuing and processing
- **Invalid Payments**: Clear error messages and recovery options
- **Timeout Handling**: Payment session timeouts with cleanup

### Performance Optimizations
- **Async Processing**: Payment operations run asynchronously
- **Caching**: Payment status cached to reduce gateway calls
- **Batch Processing**: Multiple payments processed efficiently
- **Connection Pooling**: Database connections optimized for high throughput

### Scalability Features
- **Horizontal Scaling**: Payment services can scale independently
- **Load Balancing**: Payment requests distributed across multiple instances
- **Database Sharding**: Payment data can be partitioned by date or region
- **CDN Integration**: Payment assets served globally for fast loading

### Integration Points
- **Marketplace**: Payment initiation from service purchases
- **Certificate System**: Automatic certificate generation on payment completion
- **Notification System**: Payment confirmations and status updates
- **Analytics**: Payment metrics and revenue tracking

### Future Enhancements
- **Cryptocurrency Payments**: Blockchain-based payment options
- **Installment Plans**: Payment splitting for large transactions
- **Subscription Billing**: Recurring payment processing
- **International Payments**: Multi-currency support and conversion
- **Advanced Fraud Detection**: AI-powered fraud prevention
- **Mobile Payments**: NFC and mobile wallet integration