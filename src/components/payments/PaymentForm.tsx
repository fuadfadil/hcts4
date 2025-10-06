"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommissionCalculator } from "@/lib/commission-calculator";
import { useTranslation, Language } from "@/lib/translations";

interface PaymentFormProps {
  amount: number;
  transactionId: string;
  onPaymentInitiate: (paymentData: any) => void;
  onPaymentProcess: (paymentData: any) => void;
  lang?: Language;
}

const paymentMethods = [
  { value: "onepay", label: "OnePay" },
  { value: "lypay", label: "LyPay" },
  { value: "credit_card", label: "Credit/Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export function PaymentForm({ amount, transactionId, onPaymentInitiate, onPaymentProcess, lang = 'en' }: PaymentFormProps) {
  const { t } = useTranslation(lang);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const commission = CommissionCalculator.calculateCommission(amount);
  const netAmount = CommissionCalculator.calculateNetAmount(amount);

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleInitiatePayment = async () => {
    setIsProcessing(true);
    try {
      const paymentData = {
        transactionId,
        amount,
        commission,
        netAmount,
        method: selectedMethod,
        ...(selectedMethod === "credit_card" && { cardDetails }),
      };

      await onPaymentInitiate(paymentData);
    } catch (error) {
      console.error("Payment initiation failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    try {
      const paymentData = {
        transactionId,
        method: selectedMethod,
        ...(selectedMethod === "credit_card" && { cardDetails }),
      };

      await onPaymentProcess(paymentData);
    } catch (error) {
      console.error("Payment processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentMethodForm = () => {
    switch (selectedMethod) {
      case "credit_card":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={cardDetails.cardholderName}
                onChange={(e) => handleCardInputChange("cardholderName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={(e) => handleCardInputChange("cardNumber", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => handleCardInputChange("expiry", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  type="password"
                  value={cardDetails.cvv}
                  onChange={(e) => handleCardInputChange("cvv", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case "bank_transfer":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Bank Transfer Details</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Please transfer the amount to the following account:
              </p>
              <div className="space-y-1 text-sm">
                <p><strong>Account Number:</strong> 1234567890</p>
                <p><strong>Bank Name:</strong> Libyan Central Bank</p>
                <p><strong>SWIFT Code:</strong> LYCB001</p>
                <p><strong>Reference:</strong> {transactionId}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              After completing the transfer, click "Process Payment" to confirm.
            </p>
          </div>
        );

      case "onepay":
      case "lypay":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Redirect to {selectedMethod === "onepay" ? "OnePay" : "LyPay"}</h4>
              <p className="text-sm text-muted-foreground">
                You will be redirected to {selectedMethod === "onepay" ? "OnePay" : "LyPay"} to complete your payment securely.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle>{t('payment.title')}</CardTitle>
        <CardDescription>
          {t('payment.description')} #{transactionId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-sm font-medium">{t('payment.totalAmount')}</Label>
            <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">{t('payment.platformFee')}</Label>
            <p className="text-lg">${commission.toFixed(2)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">{t('payment.netAmount')}</Label>
            <p className="text-lg">${netAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <Label htmlFor="payment-method">{t('payment.method')}</Label>
          <Select value={selectedMethod} onValueChange={handleMethodChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('payment.selectMethod')} />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {t(`payment.methods.${method.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method Specific Form */}
        {selectedMethod && renderPaymentMethodForm()}

        {/* Action Buttons */}
        {selectedMethod && (
          <div className="flex gap-4">
            <Button
              onClick={handleInitiatePayment}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? t('payment.processing') : t('payment.initiatePayment')}
            </Button>
            {(selectedMethod === "bank_transfer" || selectedMethod === "credit_card") && (
              <Button
                onClick={handleProcessPayment}
                disabled={isProcessing}
                variant="outline"
                className="flex-1"
              >
                {isProcessing ? t('payment.processing') : t('payment.processPayment')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}