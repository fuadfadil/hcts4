import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { certificates, transactions, services, users, profiles } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { CertificateGenerator, CertificateData } from "@/lib/certificate-generator";
import { QRCodeGenerator, QRCodeData } from "@/lib/qr-code-generator";
import { FileEncryption } from "@/lib/file-encryption";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Get transaction details
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction.length) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const tx = transaction[0];

    // Check if certificate already exists
    const existingCertificate = await db
      .select()
      .from(certificates)
      .where(eq(certificates.transaction_id, transactionId))
      .limit(1);

    if (existingCertificate.length) {
      return NextResponse.json(
        { success: false, error: "Certificate already exists for this transaction" },
        { status: 409 }
      );
    }

    // Get service details
    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, tx.service_id))
      .limit(1);

    if (!service.length) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    // Get buyer and seller profiles
    const [buyerProfile, sellerProfile] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.user_id, tx.buyer_id)).limit(1),
      db.select().from(profiles).where(eq(profiles.user_id, tx.seller_id)).limit(1)
    ]);

    if (!buyerProfile.length || !sellerProfile.length) {
      return NextResponse.json(
        { success: false, error: "Buyer or seller profile not found" },
        { status: 404 }
      );
    }

    // Generate certificate data
    const certificateNumber = `CERT-${transactionId}-${Date.now()}`;
    const issuedDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Expires in 1 year

    const certificateData: CertificateData = {
      certificateNumber,
      serviceName: service[0].name,
      serviceDescription: service[0].description || '',
      icd11Code: service[0].icd11_code,
      icd11Name: 'ICD-11 Code', // TODO: Get actual ICD-11 name from database
      quantity: tx.quantity,
      unitPrice: parseFloat(tx.unit_price),
      totalPrice: parseFloat(tx.total_price),
      buyerName: buyerProfile[0].organization_name,
      buyerOrganization: buyerProfile[0].organization_name,
      sellerName: sellerProfile[0].organization_name,
      sellerOrganization: sellerProfile[0].organization_name,
      transactionDate: new Date(tx.created_at),
      issuedDate,
      expiryDate,
      qrCodeData: '', // Will be set after QR generation
    };

    // Generate QR code data
    const qrData: QRCodeData = {
      certificateId: certificateNumber,
      certificateNumber,
      verificationHash: '', // Will be set after certificate generation
      issuedAt: issuedDate.toISOString(),
      expiresAt: expiryDate.toISOString(),
      buyerId: tx.buyer_id,
      sellerId: tx.seller_id,
    };

    // Generate QR code
    const qrCodeDataURL = await QRCodeGenerator.generateCertificateQR(qrData);
    certificateData.qrCodeData = qrCodeDataURL;

    // Generate PDF
    const pdfBuffer = await CertificateGenerator.generateCertificatePDF(certificateData);

    // Generate hashes and signature
    const pdfHash = CertificateGenerator.generateCertificateHash(certificateData);
    const verificationHash = CertificateGenerator.generateVerificationHash(certificateData);
    const digitalSignature = CertificateGenerator.generateDigitalSignature(certificateData);

    // Update QR data with verification hash
    qrData.verificationHash = verificationHash;
    const updatedQRCode = await QRCodeGenerator.generateCertificateQR(qrData);

    // Save PDF to file system (encrypted)
    const certificatesDir = path.join(process.cwd(), 'certificates');
    await mkdir(certificatesDir, { recursive: true });

    const plainPdfPath = path.join(certificatesDir, `${certificateNumber}.pdf`);
    const encryptedPdfPath = path.join(certificatesDir, `${certificateNumber}.enc`);

    // Save plain PDF first
    await writeFile(plainPdfPath, pdfBuffer);

    // Encrypt the PDF file
    try {
      await FileEncryption.encryptFile(plainPdfPath, encryptedPdfPath);
      // Remove the plain PDF file after encryption
      await unlink(plainPdfPath);
    } catch (encryptionError) {
      console.error('PDF encryption failed, storing unencrypted:', encryptionError);
      // Fallback: store unencrypted if encryption fails
    }

    // Save certificate to database
    const [certificate] = await db
      .insert(certificates)
      .values({
        transaction_id: transactionId,
        certificate_number: certificateNumber,
        qr_code_data: updatedQRCode,
        encrypted_pdf_path: encryptedPdfPath,
        pdf_hash: pdfHash,
        verification_hash: verificationHash,
        digital_signature: digitalSignature,
        status: 'valid',
        expires_at: expiryDate,
        metadata: {
          serviceId: tx.service_id,
          buyerId: tx.buyer_id,
          sellerId: tx.seller_id,
          generatedAt: issuedDate.toISOString(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        certificateId: certificate.id,
        certificateNumber: certificate.certificate_number,
        verificationHash: certificate.verification_hash,
        issuedAt: certificate.issued_at,
        expiresAt: certificate.expires_at,
        qrCode: certificate.qr_code_data,
      },
      message: "Certificate generated successfully"
    });

  } catch (error) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}