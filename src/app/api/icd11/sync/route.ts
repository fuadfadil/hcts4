import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { icd11Categories } from "@/lib/schema";

// Mock ICD11 data for development - replace with actual WHO API call
const mockICD11Data = [
  {
    code: "1A00",
    name: "Certain infectious or parasitic diseases",
    description: "Infectious diseases caused by bacteria, viruses, fungi, or parasites",
    parent_id: null
  },
  {
    code: "1A01",
    name: "Tuberculosis",
    description: "Mycobacterium tuberculosis infection",
    parent_id: 1
  },
  {
    code: "1A02",
    name: "Pneumonia",
    description: "Inflammation of the lungs",
    parent_id: 1
  },
  {
    code: "2A00",
    name: "Neoplasms",
    description: "Abnormal growth of tissue",
    parent_id: null
  },
  {
    code: "2A01",
    name: "Malignant neoplasms",
    description: "Cancerous tumors",
    parent_id: 4
  }
];

export async function POST(request: NextRequest) {
  try {
    // In production, this would call the WHO ICD11 API
    // For now, we'll use mock data

    const categoriesToInsert = mockICD11Data.map((category, index) => ({
      code: category.code,
      name: category.name,
      description: category.description,
      parent_id: category.parent_id,
      last_synced: new Date()
    }));

    // Clear existing data and insert new data
    await db.delete(icd11Categories);

    const insertedCategories = await db
      .insert(icd11Categories)
      .values(categoriesToInsert)
      .returning();

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${insertedCategories.length} ICD11 categories`,
      data: insertedCategories
    });
  } catch (error) {
    console.error("Error syncing ICD11 categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync categories" },
      { status: 500 }
    );
  }
}