import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cart, services, users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, serviceId, quantity = 1 } = body;

    if (!userId || !serviceId) {
      return NextResponse.json(
        { success: false, error: "User ID and Service ID are required" },
        { status: 400 }
      );
    }

    // Check if user exists and has insurance or intermediary role
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!["insurance", "intermediary"].includes(user[0].role)) {
      return NextResponse.json(
        { success: false, error: "Access denied. Only insurance companies and intermediaries can purchase services." },
        { status: 403 }
      );
    }

    if (!serviceId || quantity < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid service ID or quantity" },
        { status: 400 }
      );
    }

    // Check if service exists and is active
    const service = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.status, "active")))
      .limit(1);

    if (!service.length) {
      return NextResponse.json(
        { success: false, error: "Service not found or not available" },
        { status: 404 }
      );
    }

    // Check if service is already in cart
    const existingCartItem = await db
      .select()
      .from(cart)
      .where(and(eq(cart.user_id, parseInt(userId)), eq(cart.service_id, serviceId)))
      .limit(1);

    if (existingCartItem.length) {
      // Update quantity
      const newQuantity = existingCartItem[0].quantity + quantity;

      // Check quantity available
      if (service[0].quantity_available !== 0 && newQuantity > service[0].quantity_available) {
        return NextResponse.json(
          { success: false, error: "Requested quantity exceeds available stock" },
          { status: 400 }
        );
      }

      await db
        .update(cart)
        .set({
          quantity: newQuantity,
          updated_at: new Date(),
        })
        .where(eq(cart.id, existingCartItem[0].id));

      return NextResponse.json({
        success: true,
        data: { ...existingCartItem[0], quantity: newQuantity },
        message: "Cart updated successfully"
      });
    } else {
      // Check quantity available
      if (service[0].quantity_available !== 0 && quantity > service[0].quantity_available) {
        return NextResponse.json(
          { success: false, error: "Requested quantity exceeds available stock" },
          { status: 400 }
        );
      }

      // Add new item to cart
      const [cartItem] = await db
        .insert(cart)
        .values({
          user_id: parseInt(userId),
          service_id: serviceId,
          quantity,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: cartItem,
        message: "Service added to cart successfully"
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add service to cart" },
      { status: 500 }
    );
  }
}