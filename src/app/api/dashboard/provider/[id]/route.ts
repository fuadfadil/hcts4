import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, transactions, users, profiles } from "@/lib/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);

    // Get active services count
    const activeServicesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(and(eq(services.provider_id, userId), eq(services.status, "active")));

    // Get total sales (completed transactions)
    const totalSales = await db
      .select({
        total: sql<number>`sum(${transactions.total_price})`,
        count: sql<number>`count(*)`
      })
      .from(transactions)
      .where(and(
        eq(transactions.seller_id, userId),
        eq(transactions.status, "completed")
      ));

    // Get pending orders
    const pendingOrdersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.seller_id, userId),
        eq(transactions.status, "pending")
      ));

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        quantity: transactions.quantity,
        total_price: transactions.total_price,
        status: transactions.status,
        created_at: transactions.created_at,
        service_name: services.name,
        buyer_name: profiles.organization_name,
      })
      .from(transactions)
      .innerJoin(services, eq(transactions.service_id, services.id))
      .innerJoin(users, eq(transactions.buyer_id, users.id))
      .innerJoin(profiles, eq(users.id, profiles.user_id))
      .where(eq(transactions.seller_id, userId))
      .orderBy(desc(transactions.created_at))
      .limit(10);

    // Get service performance metrics
    const serviceMetrics = await db
      .select({
        service_id: services.id,
        service_name: services.name,
        views: sql<number>`0`, // Placeholder - would need view tracking
        purchases: sql<number>`count(${transactions.id})`,
        rating: sql<number>`0`, // Placeholder - would need rating system
      })
      .from(services)
      .leftJoin(transactions, and(
        eq(services.id, transactions.service_id),
        eq(transactions.status, "completed")
      ))
      .where(eq(services.provider_id, userId))
      .groupBy(services.id, services.name);

    return NextResponse.json({
      activeServices: activeServicesCount[0]?.count || 0,
      totalSales: totalSales[0]?.total || 0,
      totalTransactions: totalSales[0]?.count || 0,
      pendingOrders: pendingOrdersCount[0]?.count || 0,
      recentTransactions,
      serviceMetrics,
    });
  } catch (error) {
    console.error("Error fetching provider dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}