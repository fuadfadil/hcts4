import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { certificates } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import { FileEncryption } from "@/lib/file-encryption";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const certificateId = params.id;

    // Get certificate
    const certificateData = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, parseInt(certificateId)))
      .limit(1);

    if (!certificateData.length) {
      return NextResponse.json(
        { success: false, error: "Certificate not found" },
        { status: 404 }
      );
    }

    const certificate = certificateData[0];

    // Check if certificate is valid
    if (certificate.status !== 'valid') {
      return NextResponse.json(
        { success: false, error: "Certificate is not valid for download" },
        { status: 403 }
      );
    }

    // Check if certificate has expired
    const now = new Date();
    const expiryDate = new Date(certificate.expires_at);
    if (now > expiryDate) {
      return NextResponse.json(
        { success: false, error: "Certificate has expired" },
        { status: 403 }
      );
    }

    // Read encrypted PDF file
    const pdfPath = certificate.encrypted_pdf_path;
    if (!pdfPath) {
      return NextResponse.json(
        { success: false, error: "Certificate PDF not found" },
        { status: 404 }
      );
    }

    let pdfBuffer: Buffer;
    try {
      // Check if file is encrypted
      const isEncrypted = await FileEncryption.isEncryptedFile(pdfPath);

      if (isEncrypted) {
        // Decrypt the file to a temporary location
        const tempPlainPath = `${pdfPath}.temp`;
        await FileEncryption.decryptFile(pdfPath, tempPlainPath);
        pdfBuffer = await readFile(tempPlainPath);
        // Clean up temp file
        await unlink(tempPlainPath);
      } else {
        // File is not encrypted, read directly
        pdfBuffer = await readFile(pdfPath);
      }
    } catch (error) {
      console.error("Error reading certificate PDF:", error);
      return NextResponse.json(
        { success: false, error: "Failed to read certificate PDF" },
        { status: 500 }
      );
    }

    // Return PDF as downloadable file
    const response = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
        'Cache-Control': 'private, no-cache',
      },
    });

    return response;

  } catch (error) {
    console.error("Error downloading certificate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download certificate" },
      { status: 500 }
    );
  }
}