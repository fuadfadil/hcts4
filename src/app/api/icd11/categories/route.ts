import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { icd11Categories } from "@/lib/schema";
import { eq, like, or, isNull, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const parentId = searchParams.get("parent_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(icd11Categories.code, `%${search}%`),
          like(icd11Categories.name, `%${search}%`)
        )
      );
    }

    if (parentId) {
      if (parentId === "null") {
        whereConditions.push(isNull(icd11Categories.parent_id));
      } else {
        whereConditions.push(eq(icd11Categories.parent_id, parseInt(parentId)));
      }
    }

    const categories = await db
      .select()
      .from(icd11Categories)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: categories,
      pagination: {
        limit,
        offset,
        hasMore: categories.length === limit
      }
    });
  } catch (error) {
    console.error("Error fetching ICD11 categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}