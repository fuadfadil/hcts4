import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, users, profiles } from "@/lib/schema";
import { eq, and, like, gte, lte, desc, asc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const search = searchParams.get("search");
    const icd11Code = searchParams.get("icd11_code");
    const providerId = searchParams.get("provider_id");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const serviceType = searchParams.get("service_type");
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where conditions
    const whereConditions = [];

    // Only show active services
    whereConditions.push(eq(services.status, "active"));

    if (search) {
      whereConditions.push(
        sql`(${services.name} ILIKE ${`%${search}%`} OR ${services.description} ILIKE ${`%${search}%`})`
      );
    }

    if (icd11Code) {
      whereConditions.push(like(services.icd11_code, `%${icd11Code}%`));
    }

    if (providerId) {
      whereConditions.push(eq(services.provider_id, parseInt(providerId)));
    }

    if (minPrice) {
      whereConditions.push(gte(services.base_price, minPrice));
    }

    if (maxPrice) {
      whereConditions.push(lte(services.base_price, maxPrice));
    }

    if (serviceType) {
      whereConditions.push(eq(services.service_type, serviceType as "individual" | "package" | "composite"));
    }

    // Build order by
    const orderBy = sortOrder === "asc" ? asc : desc;
    let orderColumn;

    switch (sortBy) {
      case "price":
        orderColumn = services.base_price;
        break;
      case "name":
        orderColumn = services.name;
        break;
      case "created_at":
      default:
        orderColumn = services.created_at;
        break;
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalCount = totalCountResult[0]?.count || 0;

    // Get services with provider information
    const servicesList = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        icd11_code: services.icd11_code,
        service_type: services.service_type,
        base_price: services.base_price,
        discount_tiers: services.discount_tiers,
        quantity_available: services.quantity_available,
        specifications: services.specifications,
        created_at: services.created_at,
        updated_at: services.updated_at,
        provider: {
          id: users.id,
          organization_name: profiles.organization_name,
        },
      })
      .from(services)
      .leftJoin(users, eq(services.provider_id, users.id))
      .leftJoin(profiles, eq(users.id, profiles.user_id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy(orderColumn))
      .limit(limit)
      .offset(offset);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: servicesList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      message: "Services retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching marketplace services:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}