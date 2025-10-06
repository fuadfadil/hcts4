"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { useTranslation, Language } from "@/lib/translations";

interface PaymentStatusProps {
  transactionId: string;
  status: "pending" | "completed" | "failed" | "refunded";
  amount: number;
  commission: number;
  paymentMethod: string;
  gatewayResponse?: any;
  createdAt: string;
  updatedAt: string;
  lang?: Language;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
    progress: 50,
  },
  completed: {
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    progress: 100,
  },
  failed: {
    icon: XCircle,
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    progress: 0,
  },
  refunded: {
    icon: AlertCircle,
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    progress: 100,
  },
};

export function PaymentStatus({
  transactionId,
  status,
  amount,
  commission,
  paymentMethod,
  gatewayResponse,
  createdAt,
  updatedAt,
  lang = 'en',
}: PaymentStatusProps) {
  const { t } = useTranslation(lang);
  const config = statusConfig[status];
  const statusLabel = t(`payment.status.${status}`);
  const Icon = config.icon;
  const netAmount = amount - commission;

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      onepay: "OnePay",
      lypay: "LyPay",
      credit_card: "Credit/Debit Card",
      bank_transfer: "Bank Transfer",
      paypal: "PayPal",
      crypto: "Cryptocurrency",
    };
    return methodMap[method] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              Payment Status
            </CardTitle>
            <CardDescription>
              Transaction #{transactionId}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={`${config.bgColor} ${config.textColor} border-0`}
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Payment Progress</span>
            <span>{config.progress}%</span>
          </div>
          <Progress value={config.progress} className="h-2" />
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
              <p className="font-medium">{formatPaymentMethod(paymentMethod)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
              <p className="text-lg font-bold">${amount.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Platform Commission (1%)</Label>
              <p className="text-sm">${commission.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Net Amount</Label>
              <p className="text-sm">${netAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p className="text-sm">{formatDate(createdAt)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
              <p className="text-sm">{formatDate(updatedAt)}</p>
            </div>
            {gatewayResponse && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Gateway Response</Label>
                <div className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  {JSON.stringify(gatewayResponse, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status-specific messages */}
        {status === "pending" && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                {t('payment.status.pendingMessage')}
              </p>
            </div>
          </div>
        )}

        {status === "completed" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">
                {t('payment.status.completedMessage')}
              </p>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">
                {t('payment.status.failedMessage')}
              </p>
            </div>
          </div>
        )}

        {status === "refunded" && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                {t('payment.status.refundedMessage')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for labels (since we don't have it imported)
function Label({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`} {...props}>
      {children}
    </label>
  );
}