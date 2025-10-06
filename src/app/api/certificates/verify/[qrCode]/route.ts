import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { certificates, transactions, services, profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { QRCodeGenerator } from "@/lib/qr-code-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: { qrCode: string } }
) {
  try {
    const encodedQRData = decodeURIComponent(params.qrCode);

    // Decrypt QR code data
    const qrData = QRCodeGenerator.decryptQRData(encodedQRData);

    if (!qrData) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code data" },
        { status: 400 }
      );
    }

    // Find certificate by certificate number
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
      .where(eq(certificates.certificate_number, qrData.certificateNumber))
      .limit(1);

    if (!certificateData.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Certificate not found",
          data: {
            certificateNumber: qrData.certificateNumber,
            status: "not_found"
          }
        },
        { status: 404 }
      );
    }

    const data = certificateData[0];
    const certificate = data.certificate;

    // Check certificate status
    let status = certificate.status;
    let isValid = true;
    let statusMessage = "Certificate is valid";

    // Check expiry
    const now = new Date();
    const expiryDate = new Date(certificate.expires_at);

    if (now > expiryDate) {
      status = "expired";
      isValid = false;
      statusMessage = "Certificate has expired";
    }

    // Verify hash integrity
    if (certificate.pdf_hash) {
      // TODO: Verify PDF hash integrity
    }

    return NextResponse.json({
      success: true,
      data: {
        certificateNumber: certificate.certificate_number,
        status,
        isValid,
        statusMessage,
        issuedAt: certificate.issued_at,
        expiresAt: certificate.expires_at,
        service: {
          name: data.service.name,
          icd11Code: data.service.icd11_code,
        },
        transaction: {
          quantity: data.transaction.quantity,
          totalPrice: data.transaction.total_price,
          createdAt: data.transaction.created_at,
        },
        buyer: {
          organizationName: data.buyer.organization_name,
        },
        seller: {
          organizationName: data.seller.organization_name,
        },
        verification: {
          hash: certificate.verification_hash,
          signature: certificate.digital_signature ? "present" : "not_present",
          qrValid: true,
        }
      }
    });

  } catch (error) {
    console.error("Error verifying certificate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}