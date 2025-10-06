import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, transactions, services, users } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Build the query to get payments for user's transactions
    const whereConditions = [eq(transactions.buyer_id, parseInt(userId))];

    if (status) {
      whereConditions.push(eq(payments.status, status as any));
    }

    const paymentHistory = await db
      .select({
        payment: payments,
        transaction: transactions,
        service: services,
        provider: users,
      })
      .from(payments)
      .innerJoin(transactions, eq(payments.transaction_id, transactions.id))
      .innerJoin(services, eq(transactions.service_id, services.id))
      .innerJoin(users, eq(services.provider_id, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(payments.created_at))
      .limit(limit)
      .offset(offset);

    // Transform the data for frontend consumption
    const formattedHistory = paymentHistory.map((item) => ({
      id: item.payment.id,
      transactionId: item.transaction.id,
      serviceName: item.service.name,
      providerName: item.provider.email, // TODO: Add proper name field
      amount: parseFloat(item.payment.amount),
      commissionAmount: parseFloat(item.payment.commission_amount || "0"),
      netAmount: parseFloat(item.payment.amount) - parseFloat(item.payment.commission_amount || "0"),
      paymentMethod: item.payment.payment_method,
      status: item.payment.status,
      transactionDate: item.transaction.created_at,
      paymentDate: item.payment.created_at,
      gatewayResponse: item.payment.gateway_response,
    }));

    // Get total count for pagination
    const totalQuery = await db
      .select()
      .from(payments)
      .innerJoin(transactions, eq(payments.transaction_id, transactions.id))
      .where(eq(transactions.buyer_id, parseInt(userId)));

    const totalCount = totalQuery.length;

    return NextResponse.json({
      success: true,
      data: {
        payments: formattedHistory,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      }
    });

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}