import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, services } from "@/lib/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { role: string; userId: string } }
) {
  try {
    const { role, userId } = params;
    const userIdNum = parseInt(userId);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    let analyticsData;

    if (role === "provider") {
      // Revenue analytics for provider
      const revenueData = await db
        .select({
          date: sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`,
          revenue: sql<number>`sum(${transactions.total_price})`,
          transactions: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(and(
          eq(transactions.seller_id, userIdNum),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, startDate),
          lte(transactions.created_at, endDate)
        ))
        .groupBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`)
        .orderBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`);

      // Service performance
      const servicePerformance = await db
        .select({
          service_name: services.name,
          revenue: sql<number>`sum(${transactions.total_price})`,
          sales_count: sql<number>`count(*)`,
        })
        .from(services)
        .innerJoin(transactions, eq(services.id, transactions.service_id))
        .where(and(
          eq(services.provider_id, userIdNum),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, startDate),
          lte(transactions.created_at, endDate)
        ))
        .groupBy(services.id, services.name)
        .orderBy(desc(sql<number>`sum(${transactions.total_price})`));

      analyticsData = {
        revenue: revenueData,
        servicePerformance,
        type: "provider",
      };
    } else if (role === "insurance") {
      // Spending analytics for insurance
      const spendingData = await db
        .select({
          date: sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`,
          spending: sql<number>`sum(${transactions.total_price})`,
          transactions: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(and(
          eq(transactions.buyer_id, userIdNum),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, startDate),
          lte(transactions.created_at, endDate)
        ))
        .groupBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`)
        .orderBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`);

      // Category spending
      const categorySpending = await db
        .select({
          category: services.icd11_code,
          spending: sql<number>`sum(${transactions.total_price})`,
          transactions: sql<number>`count(*)`,
        })
        .from(services)
        .innerJoin(transactions, eq(services.id, transactions.service_id))
        .where(and(
          eq(transactions.buyer_id, userIdNum),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, startDate),
          lte(transactions.created_at, endDate)
        ))
        .groupBy(services.icd11_code)
        .orderBy(desc(sql<number>`sum(${transactions.total_price})`));

      analyticsData = {
        spending: spendingData,
        categorySpending,
        type: "insurance",
      };
    } else if (role === "intermediary") {
      // Commission analytics for intermediary
      const commissionData = await db
        .select({
          date: sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`,
          commission: sql<number>`sum(${transactions.total_price} * 0.05)`,
          transactions: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(and(
          eq(transactions.buyer_id, userIdNum),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, startDate),
          lte(transactions.created_at, endDate)
        ))
        .groupBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`)
        .orderBy(sql<string>`to_char(${transactions.created_at}, 'YYYY-MM-DD')`);

      analyticsData = {
        commission: commissionData,
        type: "intermediary",
      };
    } else {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}