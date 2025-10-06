import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, transactions, certificates, icd11Categories } from "@/lib/schema";
import { eq, and, desc, sql, like } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const icd11Filter = searchParams.get("icd11");

    // Get available services with optional ICD11 filter
    const availableServices = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        icd11_code: services.icd11_code,
        base_price: services.base_price,
        quantity_available: services.quantity_available,
        status: services.status,
        category_name: icd11Categories.name,
      })
      .from(services)
      .leftJoin(icd11Categories, eq(services.icd11_code, icd11Categories.code))
      .where(
        icd11Filter
          ? and(eq(services.status, "active"), like(services.icd11_code, `${icd11Filter}%`))
          : eq(services.status, "active")
      )
      .limit(50);

    // Get purchase history
    const purchaseHistory = await db
      .select({
        id: transactions.id,
        service_name: services.name,
        quantity: transactions.quantity,
        total_price: transactions.total_price,
        status: transactions.status,
        created_at: transactions.created_at,
        certificate_number: certificates.certificate_number,
      })
      .from(transactions)
      .innerJoin(services, eq(transactions.service_id, services.id))
      .leftJoin(certificates, eq(transactions.id, certificates.transaction_id))
      .where(eq(transactions.buyer_id, userId))
      .orderBy(desc(transactions.created_at))
      .limit(20);

    // Get spending analytics
    const spendingAnalytics = await db
      .select({
        total_spent: sql<number>`sum(${transactions.total_price})`,
        transaction_count: sql<number>`count(*)`,
        avg_transaction: sql<number>`avg(${transactions.total_price})`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.buyer_id, userId),
        eq(transactions.status, "completed")
      ));

    // Get certificates library
    const certificatesLibrary = await db
      .select({
        id: certificates.id,
        certificate_number: certificates.certificate_number,
        qr_code_data: certificates.qr_code_data,
        issued_at: certificates.issued_at,
        expires_at: certificates.expires_at,
        service_name: services.name,
        transaction_id: certificates.transaction_id,
      })
      .from(certificates)
      .innerJoin(transactions, eq(certificates.transaction_id, transactions.id))
      .innerJoin(services, eq(transactions.service_id, services.id))
      .where(eq(transactions.buyer_id, userId))
      .orderBy(desc(certificates.issued_at));

    return NextResponse.json({
      availableServices,
      purchaseHistory,
      spendingAnalytics: spendingAnalytics[0] || {
        total_spent: 0,
        transaction_count: 0,
        avg_transaction: 0,
      },
      certificatesLibrary,
    });
  } catch (error) {
    console.error("Error fetching insurance dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}