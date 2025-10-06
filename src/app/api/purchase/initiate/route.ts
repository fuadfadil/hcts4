import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, cart, services, users, payments } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, serviceIds, quantities } = body;

    if (!userId || !serviceIds || !Array.isArray(serviceIds)) {
      return NextResponse.json(
        { success: false, error: "User ID and service IDs are required" },
        { status: 400 }
      );
    }

    // Check if user exists and has proper role
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
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get cart items or use provided service IDs
    let cartItems;
    if (serviceIds.length === 0) {
      // Get all cart items for user
      cartItems = await db
        .select({
          service_id: cart.service_id,
          quantity: cart.quantity,
        })
        .from(cart)
        .where(eq(cart.user_id, parseInt(userId)));
    } else {
      // Use provided service IDs and quantities
      cartItems = serviceIds.map((serviceId: number, index: number) => ({
        service_id: serviceId,
        quantity: quantities?.[index] || 1,
      }));
    }

    if (cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items to purchase" },
        { status: 400 }
      );
    }

    // Get service details and validate
    const serviceDetails = await db
      .select()
      .from(services)
      .where(and(
        inArray(services.id, cartItems.map(item => item.service_id)),
        eq(services.status, "active")
      ));

    if (serviceDetails.length !== cartItems.length) {
      return NextResponse.json(
        { success: false, error: "Some services are not available" },
        { status: 400 }
      );
    }

    // Calculate totals and create transactions
    const transactionPromises = cartItems.map(async (cartItem) => {
      const service = serviceDetails.find(s => s.id === cartItem.service_id);
      if (!service) return null;

      const quantity = cartItem.quantity;
      const unitPrice = parseFloat(service.base_price.toString());
      const totalPrice = unitPrice * quantity;

      // Check stock availability
      if (service.quantity_available !== 0 && quantity > service.quantity_available) {
        throw new Error(`Insufficient stock for service ${service.name}`);
      }

      // Create transaction
      const [transaction] = await db
        .insert(transactions)
        .values({
          buyer_id: parseInt(userId),
          seller_id: service.provider_id,
          service_id: service.id,
          quantity,
          unit_price: unitPrice.toString(),
          total_price: totalPrice.toString(),
          status: "pending",
        })
        .returning();

      return {
        transactionId: transaction.id,
        serviceId: service.id,
        serviceName: service.name,
        quantity,
        unitPrice,
        totalPrice,
        providerId: service.provider_id,
      };
    });

    const transactionResults = await Promise.all(transactionPromises);
    const validTransactions = transactionResults.filter(t => t !== null);

    // Calculate order total
    const orderTotal = validTransactions.reduce((sum, t) => sum + (t?.totalPrice || 0), 0);

    // Clear cart if purchasing from cart
    if (serviceIds.length === 0) {
      await db
        .delete(cart)
        .where(eq(cart.user_id, parseInt(userId)));
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: validTransactions,
        orderTotal,
        currency: "USD",
        transactionIds: validTransactions.map(t => t?.transactionId),
      },
      message: "Purchase initiated successfully"
    });
  } catch (error) {
    console.error("Error initiating purchase:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate purchase" },
      { status: 500 }
    );
  }
}