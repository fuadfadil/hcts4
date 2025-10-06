import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      icd11Code,
      serviceType,
      cost,
      profitMargin,
      basePrice,
      discountTiers,
      quantityAvailable,
      specifications,
      componentServices
    } = body;

    // Create the service
    const [service] = await db.insert(services).values({
      name,
      description,
      icd11_code: icd11Code,
      service_type: serviceType,
      cost,
      profit_margin: profitMargin,
      base_price: basePrice,
      discount_tiers: discountTiers,
      quantity_available: quantityAvailable,
      specifications,
      // provider_id will be set from auth context
      provider_id: 1, // TODO: Get from auth
    }).returning();

    return NextResponse.json({
      success: true,
      data: service,
      message: "Service created successfully"
    });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id");

    let whereConditions = [];

    if (providerId) {
      whereConditions.push(eq(services.provider_id, parseInt(providerId)));
    }

    const serviceList = await db
      .select()
      .from(services)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return NextResponse.json({
      success: true,
      data: serviceList
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}