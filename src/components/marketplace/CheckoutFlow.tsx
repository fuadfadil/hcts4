"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PaymentForm } from "@/components/payments/PaymentForm";
import {
  CreditCard,
  Truck,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  DollarSign
} from "lucide-react";

interface CartItem {
  id: number;
  quantity: number;
  service: {
    id: number;
    name: string;
    icd11_code: string;
    service_type: string;
    base_price: number;
  };
  provider: {
    id: number;
    organization_name: string;
  };
  itemTotal: number;
}

interface CheckoutFlowProps {
  cartItems: CartItem[];
  totalAmount: number;
  userId: number;
  onClose: () => void;
  onSuccess: () => void;
}

type CheckoutStep = "review" | "payment" | "confirmation";

export function CheckoutFlow({
  cartItems,
  totalAmount,
  userId,
  onClose,
  onSuccess
}: CheckoutFlowProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("review");
  const [loading, setLoading] = useState(false);
  const [transactionIds, setTransactionIds] = useState<number[]>([]);
  const [paymentId, setPaymentId] = useState<string>("");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const handleInitiatePurchase = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/purchase/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          serviceIds: cartItems.map(item => item.service.id),
          quantities: cartItems.map(item => item.quantity),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransactionIds(data.data.transactionIds);
        setCurrentStep("payment");
      } else {
        console.error("Failed to initiate purchase:", data.error);
      }
    } catch (error) {
      console.error("Error initiating purchase:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      setLoading(true);
      const response = await fetch("/api/purchase/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionIds,
          paymentMethod: paymentData.method,
          paymentDetails: paymentData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentId(data.data.paymentId);
        setCurrentStep("confirmation");
      } else {
        console.error("Failed to complete purchase:", data.error);
      }
    } catch (error) {
      console.error("Error completing purchase:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "review", label: "Review Order", icon: Truck },
      { key: "payment", label: "Payment", icon: CreditCard },
      { key: "confirmation", label: "Confirmation", icon: CheckCircle },
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;

          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground text-muted-foreground"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  isCompleted ? "bg-green-500" : "bg-muted-foreground"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
        <div className="space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{item.service.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{item.service.icd11_code}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.provider.organization_name}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {item.quantity} × {formatPrice(item.service.base_price)}
                  </div>
                  <div className="font-semibold">
                    {formatPrice(item.itemTotal)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-center text-lg font-semibold">
        <span>Total Amount</span>
        <span>{formatPrice(totalAmount)}</span>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Button>
        <Button onClick={handleInitiatePurchase} disabled={loading} className="flex-1">
          {loading ? "Processing..." : "Continue to Payment"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
        <p className="text-muted-foreground">
          Complete your payment to finalize the purchase
        </p>
      </div>

      <PaymentForm
        amount={totalAmount}
        transactionId={transactionIds[0]?.toString() || "temp"}
        onPaymentInitiate={() => {}}
        onPaymentProcess={handlePaymentSuccess}
      />

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep("review")}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Purchase Successful!</h3>
        <p className="text-muted-foreground">
          Your healthcare services have been purchased successfully.
          Certificates will be generated and sent to your email.
        </p>
      </div>

      <Card className="p-4 bg-muted">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>Payment ID:</span>
            <span className="font-mono">{paymentId}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-semibold">{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Items Purchased:</span>
            <span>{cartItems.length}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Continue Shopping
        </Button>
        <Button onClick={onSuccess} className="flex-1">
          View Purchase History
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        {currentStep === "review" && renderReviewStep()}
        {currentStep === "payment" && renderPaymentStep()}
        {currentStep === "confirmation" && renderConfirmationStep()}
      </DialogContent>
    </Dialog>
  );
}