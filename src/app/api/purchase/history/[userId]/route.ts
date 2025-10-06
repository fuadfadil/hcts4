import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, services, users, profiles, certificates, payments } from "@/lib/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists and has proper role
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!["insurance", "intermediary"].includes(user[0].role)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Build where conditions
    const whereConditions = [eq(transactions.buyer_id, userId)];
    if (status) {
      whereConditions.push(eq(transactions.status, status as "pending" | "completed" | "cancelled" | "refunded"));
    }

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0]?.count || 0;

    // Get transactions with related data
    const offset = (page - 1) * limit;
    const purchaseHistory = await db
      .select({
        id: transactions.id,
        quantity: transactions.quantity,
        unit_price: transactions.unit_price,
        total_price: transactions.total_price,
        status: transactions.status,
        created_at: transactions.created_at,
        service: {
          id: services.id,
          name: services.name,
          description: services.description,
          icd11_code: services.icd11_code,
          service_type: services.service_type,
        },
        provider: {
          id: users.id,
          organization_name: profiles.organization_name,
        },
        certificate: {
          id: certificates.id,
          certificate_number: certificates.certificate_number,
          issued_at: certificates.issued_at,
          expires_at: certificates.expires_at,
        },
        payment: {
          id: payments.id,
          amount: payments.amount,
          payment_method: payments.payment_method,
          status: payments.status,
        },
      })
      .from(transactions)
      .leftJoin(services, eq(transactions.service_id, services.id))
      .leftJoin(users, eq(transactions.seller_id, users.id))
      .leftJoin(profiles, eq(users.id, profiles.user_id))
      .leftJoin(certificates, eq(transactions.id, certificates.transaction_id))
      .leftJoin(payments, eq(transactions.id, payments.transaction_id))
      .where(and(...whereConditions))
      .orderBy(desc(transactions.created_at))
      .limit(limit)
      .offset(offset);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: purchaseHistory,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      message: "Purchase history retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase history" },
      { status: 500 }
    );
  }
}