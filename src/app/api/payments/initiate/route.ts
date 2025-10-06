import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, transactions, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createPaymentGateway } from "@/lib/payment-gateway";
import { CommissionCalculator } from "@/lib/commission-calculator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, amount, paymentMethod, userId } = body;

    if (!transactionId || !amount || !paymentMethod || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify transaction exists and belongs to user
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, parseInt(transactionId)))
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.buyer_id !== parseInt(userId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if payment already exists
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.transaction_id, parseInt(transactionId)))
      .limit(1);

    if (existingPayment.length > 0) {
      return NextResponse.json(
        { success: false, error: "Payment already initiated for this transaction" },
        { status: 409 }
      );
    }

    // Calculate commission
    const commission = CommissionCalculator.calculateCommission(amount);

    // Create payment gateway instance
    const gateway = createPaymentGateway(paymentMethod);

    // Get user details for gateway
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    // Initiate payment with gateway
    const paymentData = {
      amount,
      currency: "LYD", // Libyan Dinar
      description: `Healthcare service payment - Transaction #${transactionId}`,
      customerEmail: user.email,
      customerName: user.email, // TODO: Add proper name field
      transactionId: transactionId.toString(),
    };

    const gatewayResponse = await gateway.initiatePayment(paymentData);

    if (!gatewayResponse.success) {
      return NextResponse.json(
        { success: false, error: gatewayResponse.error || "Gateway initiation failed" },
        { status: 500 }
      );
    }

    // Create payment record in database
    const [payment] = await db.insert(payments).values({
      transaction_id: parseInt(transactionId),
      amount: amount.toString(),
      commission_amount: commission.toString(),
      payment_method: paymentMethod as any,
      gateway_response: gatewayResponse.gatewayResponse,
      status: gatewayResponse.status as any,
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        payment: payment,
        gatewayResponse: gatewayResponse,
      },
      message: "Payment initiated successfully"
    });

  } catch (error) {
    console.error("Error initiating payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}