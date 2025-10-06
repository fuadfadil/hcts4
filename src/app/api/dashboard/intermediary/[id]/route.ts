import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, transactions, users, profiles } from "@/lib/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);

    // Get transaction facilitation history (assuming intermediary facilitates transactions)
    // For now, we'll get all transactions where this user is involved
    const transactionHistory = await db
      .select({
        id: transactions.id,
        service_name: services.name,
        quantity: transactions.quantity,
        total_price: transactions.total_price,
        commission: sql<number>`${transactions.total_price} * 0.05`, // 5% commission
        status: transactions.status,
        created_at: transactions.created_at,
        buyer_name: profiles.organization_name,
        seller_name: sql<string>`'Provider'`, // Placeholder
      })
      .from(transactions)
      .innerJoin(services, eq(transactions.service_id, services.id))
      .innerJoin(profiles, eq(transactions.buyer_id, profiles.user_id))
      .where(eq(transactions.buyer_id, userId)) // Assuming intermediary buys and resells
      .orderBy(desc(transactions.created_at))
      .limit(20);

    // Get commission tracking and earnings
    const commissionData = await db
      .select({
        total_earnings: sql<number>`sum(${transactions.total_price} * 0.05)`,
        total_transactions: sql<number>`count(*)`,
        avg_commission: sql<number>`avg(${transactions.total_price} * 0.05)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.buyer_id, userId),
        eq(transactions.status, "completed")
      ));

    // Get market analysis - trending services (most purchased in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingServices = await db
      .select({
        service_id: services.id,
        service_name: services.name,
        icd11_code: services.icd11_code,
        purchase_count: sql<number>`count(${transactions.id})`,
        total_revenue: sql<number>`sum(${transactions.total_price})`,
      })
      .from(services)
      .innerJoin(transactions, eq(services.id, transactions.service_id))
      .where(and(
        eq(transactions.status, "completed"),
        gte(transactions.created_at, thirtyDaysAgo)
      ))
      .groupBy(services.id, services.name, services.icd11_code)
      .orderBy(desc(sql<number>`count(${transactions.id})`))
      .limit(10);

    // Get client management overview (users this intermediary has transacted with)
    const clientOverview = await db
      .select({
        client_id: users.id,
        client_name: profiles.organization_name,
        total_transactions: sql<number>`count(${transactions.id})`,
        total_spent: sql<number>`sum(${transactions.total_price})`,
        last_transaction: sql<Date>`max(${transactions.created_at})`,
      })
      .from(users)
      .innerJoin(profiles, eq(users.id, profiles.user_id))
      .innerJoin(transactions, eq(users.id, transactions.buyer_id))
      .where(eq(transactions.buyer_id, userId))
      .groupBy(users.id, profiles.organization_name);

    // Get activity reports - monthly transaction summary
    const activityReports = await db
      .select({
        month: sql<string>`to_char(${transactions.created_at}, 'YYYY-MM')`,
        transaction_count: sql<number>`count(*)`,
        total_volume: sql<number>`sum(${transactions.total_price})`,
        commission_earned: sql<number>`sum(${transactions.total_price} * 0.05)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.buyer_id, userId),
        eq(transactions.status, "completed")
      ))
      .groupBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM')`)
      .orderBy(desc(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM')`))
      .limit(12);

    return NextResponse.json({
      transactionHistory,
      commissionData: commissionData[0] || {
        total_earnings: 0,
        total_transactions: 0,
        avg_commission: 0,
      },
      trendingServices,
      clientOverview,
      activityReports,
    });
  } catch (error) {
    console.error("Error fetching intermediary dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}