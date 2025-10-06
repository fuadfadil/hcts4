import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, transactions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id");

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Get service statistics
    const providerServices = await db
      .select()
      .from(services)
      .where(eq(services.provider_id, parseInt(providerId)));

    const totalServices = providerServices.length;
    const activeServices = providerServices.filter(s => s.status === "active").length;

    // Calculate total revenue from transactions
    const revenueResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${transactions.total_price}), 0)`
      })
      .from(transactions)
      .where(eq(transactions.seller_id, parseInt(providerId)));

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Calculate average price
    const averagePrice = totalServices > 0
      ? providerServices.reduce((sum, service) => sum + Number(service.base_price), 0) / totalServices
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalServices,
        activeServices,
        totalRevenue,
        averagePrice
      }
    });
  } catch (error) {
    console.error("Error fetching service stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch service statistics" },
      { status: 500 }
    );
  }
}