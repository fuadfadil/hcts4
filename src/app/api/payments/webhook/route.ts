import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, transactions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createPaymentGateway } from "@/lib/payment-gateway";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gateway, transactionId, status, gatewayData } = body;

    // Basic validation
    if (!gateway || !transactionId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required webhook data" },
        { status: 400 }
      );
    }

    // Find payment by transaction ID
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.transaction_id, parseInt(transactionId)))
      .limit(1);

    if (!payment) {
      console.warn(`Webhook received for unknown transaction: ${transactionId}`);
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Create gateway instance to validate webhook
    const gatewayInstance = createPaymentGateway(payment.payment_method);

    // Handle webhook through gateway
    const webhookResponse = await gatewayInstance.handleWebhook({
      gateway,
      transactionId,
      status,
      ...gatewayData,
    });

    if (!webhookResponse.success) {
      console.error("Webhook validation failed:", webhookResponse.error);
      return NextResponse.json(
        { success: false, error: "Webhook validation failed" },
        { status: 400 }
      );
    }

    // Update payment status based on webhook
    const updateData: any = {
      status: webhookResponse.status as any,
      gateway_response: {
        ...(payment.gateway_response || {}),
        webhook_received: true,
        webhook_data: gatewayData,
        webhook_processed_at: new Date().toISOString(),
      },
    };

    const [updatedPayment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.transaction_id, parseInt(transactionId)))
      .returning();

    // If payment completed, update transaction and trigger certificate generation
    if (webhookResponse.status === "completed") {
      await db
        .update(transactions)
        .set({ status: "completed" as any })
        .where(eq(transactions.id, payment.transaction_id));

      // TODO: Trigger certificate generation
      console.log(`Payment completed for transaction ${transactionId} - triggering certificate generation`);
    }

    // Log webhook event
    console.log(`Webhook processed for transaction ${transactionId}: ${status}`);

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
      }
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Support for different content types (some gateways send form data)
export async function PUT(request: NextRequest) {
  // Some gateways use PUT instead of POST
  return POST(request);
}