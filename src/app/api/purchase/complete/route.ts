import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, payments, certificates, services, tradingAnalytics } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionIds, paymentMethod, paymentDetails } = body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction IDs are required" },
        { status: 400 }
      );
    }

    // Get transactions
    const transactionList = await db
      .select()
      .from(transactions)
      .where(inArray(transactions.id, transactionIds));

    if (transactionList.length !== transactionIds.length) {
      return NextResponse.json(
        { success: false, error: "Some transactions not found" },
        { status: 404 }
      );
    }

    // Check if all transactions are pending
    const invalidTransactions = transactionList.filter(t => t.status !== "pending");
    if (invalidTransactions.length > 0) {
      return NextResponse.json(
        { success: false, error: "Some transactions are not in pending status" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = transactionList.reduce((sum, t) => sum + parseFloat(t.total_price), 0);

    // Create payment record (assuming payment is successful for now)
    const [payment] = await db
      .insert(payments)
      .values({
        transaction_id: transactionList[0].id, // Link to first transaction
        amount: totalAmount.toString(),
        commission_amount: "0.00", // TODO: Calculate commission
        payment_method: paymentMethod || "credit_card",
        gateway_response: paymentDetails || {},
        status: "completed",
      })
      .returning();

    // Update transactions to completed
    await db
      .update(transactions)
      .set({ status: "completed" })
      .where(inArray(transactions.id, transactionIds));

    // Update service inventory
    for (const transaction of transactionList) {
      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, transaction.service_id))
        .limit(1);

      if (service.length && service[0].quantity_available > 0) {
        await db
          .update(services)
          .set({
            quantity_available: service[0].quantity_available - transaction.quantity,
          })
          .where(eq(services.id, transaction.service_id));
      }
    }

    // Generate certificates for each transaction
    const certificatePromises = transactionList.map(async (transaction) => {
      try {
        // Call certificate generation API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/certificates/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactionId: transaction.id }),
        });

        if (!response.ok) {
          console.error(`Failed to generate certificate for transaction ${transaction.id}`);
          // Fallback: create basic certificate record
          const certificateNumber = `CERT-${transaction.id}-${Date.now()}`;
          const qrCodeData = `certificate:${certificateNumber}`;
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);

          const [certificate] = await db
            .insert(certificates)
            .values({
              transaction_id: transaction.id,
              certificate_number: certificateNumber,
              qr_code_data: qrCodeData,
              encrypted_pdf_path: `/certificates/${certificateNumber}.pdf`,
              pdf_hash: '', // Will be set when PDF is generated
              verification_hash: '', // Will be set when PDF is generated
              status: 'valid',
              expires_at: expiresAt,
            })
            .returning();

          return certificate;
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        console.error(`Error generating certificate for transaction ${transaction.id}:`, error);
        // Fallback: create basic certificate record
        const certificateNumber = `CERT-${transaction.id}-${Date.now()}`;
        const qrCodeData = `certificate:${certificateNumber}`;
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const [certificate] = await db
          .insert(certificates)
          .values({
            transaction_id: transaction.id,
            certificate_number: certificateNumber,
            qr_code_data: qrCodeData,
            encrypted_pdf_path: `/certificates/${certificateNumber}.pdf`,
            pdf_hash: '', // Will be set when PDF is generated
            verification_hash: '', // Will be set when PDF is generated
            status: 'valid',
            expires_at: expiresAt,
          })
          .returning();

        return certificate;
      }
    });

    const certificatesGenerated = await Promise.all(certificatePromises);

    // Record analytics
    const analyticsPromises = transactionList.map(async (transaction) => {
      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, transaction.service_id))
        .limit(1);

      if (service.length) {
        await db
          .insert(tradingAnalytics)
          .values({
            service_id: transaction.service_id,
            provider_id: service[0].provider_id,
            metric_type: "purchases",
            value: transaction.total_price,
            count: transaction.quantity,
          });

        await db
          .insert(tradingAnalytics)
          .values({
            service_id: transaction.service_id,
            provider_id: service[0].provider_id,
            metric_type: "revenue",
            value: transaction.total_price,
            count: 1,
          });
      }
    });

    await Promise.all(analyticsPromises);

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        certificates: certificatesGenerated,
        totalAmount,
        currency: "USD",
      },
      message: "Purchase completed successfully"
    });
  } catch (error) {
    console.error("Error completing purchase:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete purchase" },
      { status: 500 }
    );
  }
}