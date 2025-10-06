// Simple translation system for payment components
export const translations = {
  en: {
    payment: {
      title: "Payment Details",
      description: "Complete your payment for healthcare service transaction",
      method: "Payment Method",
      selectMethod: "Select payment method",
      totalAmount: "Total Amount",
      platformFee: "Platform Fee (1%)",
      netAmount: "Net Amount",
      initiatePayment: "Initiate Payment",
      processPayment: "Process Payment",
      processing: "Processing...",
      cardholderName: "Cardholder Name",
      cardNumber: "Card Number",
      expiryDate: "Expiry Date",
      cvv: "CVV",
      bankTransferDetails: "Bank Transfer Details",
      transferInstructions: "Please transfer the amount to the following account:",
      accountNumber: "Account Number",
      bankName: "Bank Name",
      swiftCode: "SWIFT Code",
      reference: "Reference",
      awaitingConfirmation: "After completing the transfer, click 'Process Payment' to confirm.",
      redirectMessage: "You will be redirected to complete your payment securely.",
      status: {
        pending: "Pending",
        completed: "Completed",
        failed: "Failed",
        refunded: "Refunded",
        pendingMessage: "Your payment is being processed. This may take a few minutes.",
        completedMessage: "Payment completed successfully! Your certificate will be generated shortly.",
        failedMessage: "Payment failed. Please try again or contact support.",
        refundedMessage: "Payment has been refunded. The amount will be credited back to your account.",
      },
      methods: {
        onepay: "OnePay",
        lypay: "LyPay",
        credit_card: "Credit/Debit Card",
        bank_transfer: "Bank Transfer",
        paypal: "PayPal",
        crypto: "Cryptocurrency",
      },
    },
  },
  ar: {
    payment: {
      title: "تفاصيل الدفع",
      description: "أكمل دفعك لمعاملة خدمة الرعاية الصحية",
      method: "طريقة الدفع",
      selectMethod: "اختر طريقة الدفع",
      totalAmount: "المبلغ الإجمالي",
      platformFee: "رسوم المنصة (1%)",
      netAmount: "صافي المبلغ",
      initiatePayment: "بدء الدفع",
      processPayment: "معالجة الدفع",
      processing: "جارٍ المعالجة...",
      cardholderName: "اسم حامل البطاقة",
      cardNumber: "رقم البطاقة",
      expiryDate: "تاريخ الانتهاء",
      cvv: "رمز CVV",
      bankTransferDetails: "تفاصيل التحويل البنكي",
      transferInstructions: "يرجى تحويل المبلغ إلى الحساب التالي:",
      accountNumber: "رقم الحساب",
      bankName: "اسم البنك",
      swiftCode: "رمز SWIFT",
      reference: "المرجع",
      awaitingConfirmation: "بعد إتمام التحويل، انقر على 'معالجة الدفع' للتأكيد.",
      redirectMessage: "سيتم توجيهك لإتمام الدفع بشكل آمن.",
      status: {
        pending: "قيد الانتظار",
        completed: "مكتمل",
        failed: "فاشل",
        refunded: "مسترد",
        pendingMessage: "دفعك قيد المعالجة. قد يستغرق هذا بضع دقائق.",
        completedMessage: "تم الدفع بنجاح! سيتم إنشاء شهادتك قريباً.",
        failedMessage: "فشل الدفع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.",
        refundedMessage: "تم استرداد الدفع. سيتم إعادة المبلغ إلى حسابك.",
      },
      methods: {
        onepay: "ون باي",
        lypay: "لي باي",
        credit_card: "بطاقة الائتمان/الخصم",
        bank_transfer: "التحويل البنكي",
        paypal: "باي بال",
        crypto: "العملات الرقمية",
      },
    },
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en.payment;

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
}

// Hook for using translations (can be expanded later)
export function useTranslation(lang: Language = 'en') {
  return {
    t: (key: string) => getTranslation(lang, key),
  };
}