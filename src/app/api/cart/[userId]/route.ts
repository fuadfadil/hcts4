import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cart, services, users, profiles } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists and has proper role
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!["insurance", "intermediary"].includes(user[0].role)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get cart items with service details
    const cartItems = await db
      .select({
        id: cart.id,
        quantity: cart.quantity,
        added_at: cart.added_at,
        updated_at: cart.updated_at,
        service: {
          id: services.id,
          name: services.name,
          description: services.description,
          icd11_code: services.icd11_code,
          service_type: services.service_type,
          base_price: services.base_price,
          discount_tiers: services.discount_tiers,
          quantity_available: services.quantity_available,
          specifications: services.specifications,
        },
        provider: {
          id: users.id,
          organization_name: profiles.organization_name,
        },
      })
      .from(cart)
      .leftJoin(services, eq(cart.service_id, services.id))
      .leftJoin(users, eq(services.provider_id, users.id))
      .leftJoin(profiles, eq(users.id, profiles.user_id))
      .where(and(eq(cart.user_id, userId), eq(services.status, "active")));

    // Calculate totals
    let totalItems = 0;
    let totalPrice = 0;

    const itemsWithPricing = cartItems
      .filter(item => item.service !== null)
      .map(item => {
        const quantity = item.quantity;
        const basePrice = parseFloat(item.service!.base_price.toString());
        const itemTotal = basePrice * quantity;

        totalItems += quantity;
        totalPrice += itemTotal;

        return {
          ...item,
          itemTotal,
          discountedPrice: itemTotal, // TODO: Apply discount logic
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        items: itemsWithPricing,
        summary: {
          totalItems,
          totalPrice,
          currency: "USD",
        },
      },
      message: "Cart retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists and has proper role
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!["insurance", "intermediary"].includes(user[0].role)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    if (serviceId) {
      // Remove specific item
      await db
        .delete(cart)
        .where(and(eq(cart.user_id, userId), eq(cart.service_id, parseInt(serviceId))));
    } else {
      // Clear entire cart
      await db
        .delete(cart)
        .where(eq(cart.user_id, userId));
    }

    return NextResponse.json({
      success: true,
      message: serviceId ? "Item removed from cart" : "Cart cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}