import { CommissionCalculator } from './commission-calculator';

export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  transactionId: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  gatewayResponse?: any;
  error?: string;
}

export interface GatewayConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  webhookUrl?: string;
}

export abstract class PaymentGateway {
  protected config: GatewayConfig;

  constructor(config: GatewayConfig = {}) {
    this.config = config;
  }

  abstract initiatePayment(data: PaymentData): Promise<PaymentResponse>;
  abstract processPayment(transactionId: string, paymentData: any): Promise<PaymentResponse>;
  abstract checkStatus(transactionId: string): Promise<PaymentResponse>;
  abstract handleWebhook(data: any): Promise<PaymentResponse>;

  protected calculateCommission(amount: number): number {
    return CommissionCalculator.calculateCommission(amount);
  }
}

// Mock OnePay Gateway Implementation
export class OnePayGateway extends PaymentGateway {
  async initiatePayment(data: PaymentData): Promise<PaymentResponse> {
    // Simulate API call to OnePay
    const commission = this.calculateCommission(data.amount);
    const netAmount = data.amount - commission;

    // Mock successful initiation
    return {
      success: true,
      transactionId: data.transactionId,
      gatewayTransactionId: `onepay_${Date.now()}`,
      status: 'pending',
      gatewayResponse: {
        paymentUrl: `https://onepay.ly/pay/${data.transactionId}`,
        commission,
        netAmount
      }
    };
  }

  async processPayment(transactionId: string, paymentData: any): Promise<PaymentResponse> {
    // Simulate payment processing
    return {
      success: true,
      transactionId,
      gatewayTransactionId: `onepay_${Date.now()}`,
      status: 'completed',
      gatewayResponse: {
        processed: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResponse> {
    // Simulate status check
    return {
      success: true,
      transactionId,
      status: 'completed',
      gatewayResponse: {
        status: 'completed',
        lastChecked: new Date().toISOString()
      }
    };
  }

  async handleWebhook(data: any): Promise<PaymentResponse> {
    // Simulate webhook handling
    return {
      success: true,
      transactionId: data.transactionId,
      status: 'completed',
      gatewayResponse: data
    };
  }
}

// Mock LyPay Gateway Implementation
export class LyPayGateway extends PaymentGateway {
  async initiatePayment(data: PaymentData): Promise<PaymentResponse> {
    const commission = this.calculateCommission(data.amount);
    const netAmount = data.amount - commission;

    return {
      success: true,
      transactionId: data.transactionId,
      gatewayTransactionId: `lypay_${Date.now()}`,
      status: 'pending',
      gatewayResponse: {
        paymentUrl: `https://lypay.ly/pay/${data.transactionId}`,
        commission,
        netAmount
      }
    };
  }

  async processPayment(transactionId: string, paymentData: any): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      gatewayTransactionId: `lypay_${Date.now()}`,
      status: 'completed',
      gatewayResponse: {
        processed: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      status: 'completed',
      gatewayResponse: {
        status: 'completed',
        lastChecked: new Date().toISOString()
      }
    };
  }

  async handleWebhook(data: any): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId: data.transactionId,
      status: 'completed',
      gatewayResponse: data
    };
  }
}

// Mock Credit Card Gateway
export class CreditCardGateway extends PaymentGateway {
  async initiatePayment(data: PaymentData): Promise<PaymentResponse> {
    const commission = this.calculateCommission(data.amount);
    const netAmount = data.amount - commission;

    return {
      success: true,
      transactionId: data.transactionId,
      gatewayTransactionId: `cc_${Date.now()}`,
      status: 'pending',
      gatewayResponse: {
        requiresCardDetails: true,
        commission,
        netAmount
      }
    };
  }

  async processPayment(transactionId: string, paymentData: any): Promise<PaymentResponse> {
    // Validate card details (mock)
    if (!paymentData.cardNumber || !paymentData.expiry || !paymentData.cvv) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        error: 'Invalid card details'
      };
    }

    return {
      success: true,
      transactionId,
      gatewayTransactionId: `cc_${Date.now()}`,
      status: 'completed',
      gatewayResponse: {
        processed: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      status: 'completed',
      gatewayResponse: {
        status: 'completed',
        lastChecked: new Date().toISOString()
      }
    };
  }

  async handleWebhook(data: any): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId: data.transactionId,
      status: 'completed',
      gatewayResponse: data
    };
  }
}

// Mock Bank Transfer Gateway
export class BankTransferGateway extends PaymentGateway {
  async initiatePayment(data: PaymentData): Promise<PaymentResponse> {
    const commission = this.calculateCommission(data.amount);
    const netAmount = data.amount - commission;

    return {
      success: true,
      transactionId: data.transactionId,
      gatewayTransactionId: `bt_${Date.now()}`,
      status: 'pending',
      gatewayResponse: {
        bankDetails: {
          accountNumber: '1234567890',
          bankName: 'Libyan Central Bank',
          swiftCode: 'LYCB001'
        },
        commission,
        netAmount
      }
    };
  }

  async processPayment(transactionId: string, paymentData: any): Promise<PaymentResponse> {
    // Bank transfers are manual, so status remains pending until confirmed
    return {
      success: true,
      transactionId,
      status: 'pending',
      gatewayResponse: {
        awaitingConfirmation: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      status: 'pending',
      gatewayResponse: {
        status: 'pending',
        lastChecked: new Date().toISOString()
      }
    };
  }

  async handleWebhook(data: any): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId: data.transactionId,
      status: 'completed',
      gatewayResponse: data
    };
  }
}

// Factory function to create gateway instances
export function createPaymentGateway(method: string, config: GatewayConfig = {}): PaymentGateway {
  switch (method) {
    case 'onepay':
      return new OnePayGateway(config);
    case 'lypay':
      return new LyPayGateway(config);
    case 'credit_card':
      return new CreditCardGateway(config);
    case 'bank_transfer':
      return new BankTransferGateway(config);
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}