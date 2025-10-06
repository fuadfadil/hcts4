import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { certificates, transactions, services, users, profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const certificateId = params.id;

    // Get certificate with related data
    const certificateData = await db
      .select({
        certificate: certificates,
        transaction: transactions,
        service: services,
        buyer: profiles,
        seller: profiles,
      })
      .from(certificates)
      .innerJoin(transactions, eq(certificates.transaction_id, transactions.id))
      .innerJoin(services, eq(transactions.service_id, services.id))
      .innerJoin(profiles, eq(transactions.buyer_id, profiles.user_id))
      .innerJoin(profiles, eq(transactions.seller_id, profiles.user_id))
      .where(eq(certificates.id, parseInt(certificateId)))
      .limit(1);

    if (!certificateData.length) {
      return NextResponse.json(
        { success: false, error: "Certificate not found" },
        { status: 404 }
      );
    }

    const data = certificateData[0];

    return NextResponse.json({
      success: true,
      data: {
        id: data.certificate.id,
        certificateNumber: data.certificate.certificate_number,
        status: data.certificate.status,
        issuedAt: data.certificate.issued_at,
        expiresAt: data.certificate.expires_at,
        qrCodeData: data.certificate.qr_code_data,
        verificationHash: data.certificate.verification_hash,
        service: {
          name: data.service.name,
          description: data.service.description,
          icd11Code: data.service.icd11_code,
        },
        transaction: {
          quantity: data.transaction.quantity,
          unitPrice: data.transaction.unit_price,
          totalPrice: data.transaction.total_price,
          createdAt: data.transaction.created_at,
        },
        buyer: {
          organizationName: data.buyer.organization_name,
        },
        seller: {
          organizationName: data.seller.organization_name,
        },
      }
    });

  } catch (error) {
    console.error("Error retrieving certificate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve certificate" },
      { status: 500 }
    );
  }
}