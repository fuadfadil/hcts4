import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, transactions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createPaymentGateway } from "@/lib/payment-gateway";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!paymentId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
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

    // For real-time status, optionally check with gateway
    let gatewayStatus = null;
    try {
      const gateway = createPaymentGateway(payment.payment_method);
      const gatewayResponse = await gateway.checkStatus(payment.transaction_id.toString());
      gatewayStatus = gatewayResponse;

      // If gateway status differs, update our database
      if (gatewayResponse.status !== payment.status) {
        await db
          .update(payments)
          .set({
            status: gatewayResponse.status as any,
            gateway_response: {
              ...(payment.gateway_response || {}),
              ...gatewayResponse.gatewayResponse,
              last_checked: new Date().toISOString(),
            },
          })
          .where(eq(payments.id, parseInt(paymentId)));

        // Update payment object with new status
        payment.status = gatewayResponse.status as any;
        payment.gateway_response = {
          ...(payment.gateway_response || {}),
          ...gatewayResponse.gatewayResponse,
          last_checked: new Date().toISOString(),
        };
      }
    } catch (gatewayError) {
      console.warn("Failed to check gateway status:", gatewayError);
      // Continue with database status if gateway check fails
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          transactionId: payment.transaction_id,
          amount: parseFloat(payment.amount),
          commissionAmount: parseFloat(payment.commission_amount || "0"),
          paymentMethod: payment.payment_method,
          status: payment.status,
          gatewayResponse: payment.gateway_response,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at,
        },
        gatewayStatus,
      }
    });

  } catch (error) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment status" },
      { status: 500 }
    );
  }
}