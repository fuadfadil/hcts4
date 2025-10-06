import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { certificates, transactions, services } from "@/lib/schema";
import { eq, or } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Get certificates where user is buyer or seller
    const certificatesData = await db
      .select({
        certificate: certificates,
        transaction: transactions,
        service: services,
      })
      .from(certificates)
      .innerJoin(transactions, eq(certificates.transaction_id, transactions.id))
      .innerJoin(services, eq(transactions.service_id, services.id))
      .where(
        or(
          eq(transactions.buyer_id, userId),
          eq(transactions.seller_id, userId)
        )
      )
      .orderBy(certificates.issued_at);

    const formattedCertificates = certificatesData.map(data => ({
      id: data.certificate.id,
      certificateNumber: data.certificate.certificate_number,
      status: data.certificate.status,
      issuedAt: data.certificate.issued_at,
      expiresAt: data.certificate.expires_at,
      verificationHash: data.certificate.verification_hash,
      service: {
        name: data.service.name,
        icd11Code: data.service.icd11_code,
      },
      transaction: {
        id: data.transaction.id,
        quantity: data.transaction.quantity,
        totalPrice: data.transaction.total_price,
        createdAt: data.transaction.created_at,
        role: data.transaction.buyer_id === userId ? 'buyer' : 'seller',
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        certificates: formattedCertificates,
        total: formattedCertificates.length,
      }
    });

  } catch (error) {
    console.error("Error retrieving user certificates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve certificates" },
      { status: 500 }
    );
  }
}