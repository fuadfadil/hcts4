import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = parseInt(params.id);

    const providerServices = await db
      .select()
      .from(services)
      .where(eq(services.provider_id, providerId));

    return NextResponse.json({
      success: true,
      data: providerServices
    });
  } catch (error) {
    console.error("Error fetching provider services:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch provider services" },
      { status: 500 }
    );
  }
}