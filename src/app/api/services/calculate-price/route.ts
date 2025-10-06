import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cost,
      profitMargin,
      basePrice,
      quantity,
      discountTiers
    } = body;

    // Calculate pricing
    let price = basePrice || 0;

    // If no base price provided, calculate from cost and profit margin
    if (!basePrice && cost && profitMargin) {
      price = cost * (1 + profitMargin / 100);
    }

    // Apply bulk discounts
    let discountPercentage = 0;
    if (quantity >= 100) {
      discountPercentage = discountTiers?.["100+"] || 0;
    } else if (quantity >= 50) {
      discountPercentage = discountTiers?.["50-99"] || 0;
    }

    const discountedPrice = price * (1 - discountPercentage / 100);
    const totalRevenue = discountedPrice * quantity;
    const totalCost = (cost || 0) * quantity;
    const profit = totalRevenue - totalCost;
    const actualProfitMargin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        unitPrice: discountedPrice,
        totalRevenue,
        totalCost,
        profit,
        profitMargin: actualProfitMargin,
        discountApplied: discountPercentage
      }
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate price" },
      { status: 500 }
    );
  }
}