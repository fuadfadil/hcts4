import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, transactions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createPaymentGateway } from "@/lib/payment-gateway";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, paymentData, userId } = body;

    if (!paymentId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get payment details
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parseInt(paymentId)))
      .limit(1);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify user owns this payment through transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, payment.transaction_id))
      .limit(1);

    if (!transaction || transaction.buyer_id !== parseInt(userId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if payment is already completed
    if (payment.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Payment already completed" },
        { status: 409 }
      );
    }

    // Create payment gateway instance
    const gateway = createPaymentGateway(payment.payment_method);

    // Process payment with gateway
    const gatewayResponse = await gateway.processPayment(
      payment.transaction_id.toString(),
      paymentData || {}
    );

    // Update payment status in database
    const updateData: any = {
      status: gatewayResponse.status as any,
      gateway_response: {
        ...(payment.gateway_response || {}),
        ...gatewayResponse.gatewayResponse,
        processed_at: new Date().toISOString(),
      },
    };

    const [updatedPayment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, parseInt(paymentId)))
      .returning();

    // If payment completed, update transaction status and trigger certificate generation
    if (gatewayResponse.status === "completed") {
      await db
        .update(transactions)
        .set({ status: "completed" as any })
        .where(eq(transactions.id, payment.transaction_id));

      // TODO: Trigger certificate generation here
      // This would typically call a certificate generation service
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: updatedPayment,
        gatewayResponse: gatewayResponse,
      },
      message: "Payment processed successfully"
    });

  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process payment" },
      { status: 500 }
    );
  }
}