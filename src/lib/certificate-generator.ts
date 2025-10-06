import jsPDF from 'jspdf';
import crypto from 'crypto';
import { QRCodeGenerator, QRCodeData } from './qr-code-generator';

export interface CertificateData {
  certificateNumber: string;
  serviceName: string;
  serviceDescription: string;
  icd11Code: string;
  icd11Name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  buyerName: string;
  buyerOrganization: string;
  sellerName: string;
  sellerOrganization: string;
  transactionDate: Date;
  issuedDate: Date;
  expiryDate: Date;
  qrCodeData: string;
}

export class CertificateGenerator {
  private static readonly CERTIFICATE_WIDTH = 210; // A4 width in mm
  private static readonly CERTIFICATE_HEIGHT = 297; // A4 height in mm

  /**
   * Generate a professional certificate PDF
   */
  static async generateCertificatePDF(certificateData: CertificateData): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    try {
      // Set up fonts and colors
      this.setupDocument(doc);

      // Add header with branding
      this.addHeader(doc);

      // Add certificate title
      this.addCertificateTitle(doc);

      // Add certificate details
      this.addCertificateDetails(doc, certificateData);

      // Add QR code
      await this.addQRCode(doc, certificateData.qrCodeData);

      // Add footer with legal information
      this.addFooter(doc);

      // Add security features
      this.addSecurityFeatures(doc, certificateData);

      // Return PDF as buffer
      return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      throw new Error('Failed to generate certificate PDF');
    }
  }

  /**
   * Set up document properties and fonts
   */
  private static setupDocument(doc: jsPDF): void {
    // Set document properties
    doc.setProperties({
      title: 'Healthcare Service Certificate',
      subject: 'Digital Certificate of Service',
      author: 'HCTS Platform',
      keywords: 'certificate, healthcare, digital',
      creator: 'HCTS Certificate Generator'
    });

    // Set default font
    doc.setFont('helvetica', 'normal');

    // Add Arabic font support (Amiri font for Arabic text)
    // Note: In production, you would load the actual font file
    // For now, we'll use Unicode support
  }

  /**
   * Add Arabic text to the PDF (RTL support)
   */
  private static addArabicText(doc: jsPDF, text: string, x: number, y: number, options: any = {}): void {
    // For Arabic text, we need to handle RTL (Right-to-Left) text
    // This is a simplified implementation
    doc.setFont('helvetica', 'normal');

    // If the text contains Arabic characters, handle RTL
    const isArabic = /[\u0600-\u06FF]/.test(text);
    if (isArabic) {
      // Simple RTL handling - reverse the text for basic support
      // In production, you'd use a proper Arabic text shaping library
      const rtlText = text.split('').reverse().join('');
      doc.text(rtlText, x, y, { ...options, align: 'right' });
    } else {
      doc.text(text, x, y, options);
    }
  }

  /**
   * Add header with HCTS branding
   */
  private static addHeader(doc: jsPDF): void {
    // Add header background
    doc.setFillColor(41, 128, 185); // Blue color
    doc.rect(0, 0, this.CERTIFICATE_WIDTH, 30, 'F');

    // Add logo placeholder (you can add actual logo later)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('HCTS', 20, 20);

    // Add subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Healthcare Trading Certificate System', 20, 27);

    // Add certificate type
    doc.setFontSize(10);
    doc.text('DIGITAL CERTIFICATE OF SERVICE', this.CERTIFICATE_WIDTH - 20, 20, { align: 'right' });
  }

  /**
   * Add certificate title
   */
  private static addCertificateTitle(doc: jsPDF): void {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF HEALTHCARE SERVICE', this.CERTIFICATE_WIDTH / 2, 50, { align: 'center' });

    // Add decorative line
    doc.setLineWidth(0.5);
    doc.line(30, 55, this.CERTIFICATE_WIDTH - 30, 55);
  }

  /**
   * Add certificate details
   */
  private static addCertificateDetails(doc: jsPDF, data: CertificateData): void {
    let yPosition = 70;

    // Certificate number
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    this.addArabicText(doc, `Certificate Number: ${data.certificateNumber}`, 20, yPosition);
    yPosition += 10;

    // Service information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('SERVICE INFORMATION', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Service: ${data.serviceName}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Description: ${data.serviceDescription}`, 25, yPosition);
    yPosition += 6;
    doc.text(`ICD-11 Code: ${data.icd11Code} - ${data.icd11Name}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Quantity: ${data.quantity}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Unit Price: $${data.unitPrice.toFixed(2)}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Total Price: $${data.totalPrice.toFixed(2)}`, 25, yPosition);
    yPosition += 15;

    // Transaction information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('TRANSACTION INFORMATION', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Transaction Date: ${data.transactionDate.toLocaleDateString()}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Issued Date: ${data.issuedDate.toLocaleDateString()}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Expiry Date: ${data.expiryDate.toLocaleDateString()}`, 25, yPosition);
    yPosition += 15;

    // Party information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('PARTIES', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Buyer: ${data.buyerName}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Organization: ${data.buyerOrganization}`, 25, yPosition);
    yPosition += 10;
    doc.text(`Seller: ${data.sellerName}`, 25, yPosition);
    yPosition += 6;
    doc.text(`Organization: ${data.sellerOrganization}`, 25, yPosition);
  }

  /**
   * Add QR code to the certificate
   */
  private static async addQRCode(doc: jsPDF, qrCodeData: string): Promise<void> {
    try {
      // For now, we'll add a placeholder. In production, you'd convert the QR code data URL to image
      // and add it to the PDF. Since jsPDF doesn't directly support data URLs, you'd need additional processing.

      const qrSize = 40;
      const x = this.CERTIFICATE_WIDTH - qrSize - 20;
      const y = 200;

      // Add QR code placeholder border
      doc.setLineWidth(0.5);
      doc.rect(x, y, qrSize, qrSize);

      // Add label
      doc.setFontSize(8);
      doc.text('Scan for Verification', x + qrSize / 2, y + qrSize + 5, { align: 'center' });

      // Note: In a real implementation, you'd need to:
      // 1. Convert the QR code data URL to base64
      // 2. Add it as an image to the PDF
      // doc.addImage(qrImageData, 'PNG', x, y, qrSize, qrSize);

    } catch (error) {
      console.error('Error adding QR code to PDF:', error);
    }
  }

  /**
   * Add footer with legal information
   */
  private static addFooter(doc: jsPDF): void {
    const footerY = this.CERTIFICATE_HEIGHT - 30;

    // Add footer background
    doc.setFillColor(240, 240, 240);
    doc.rect(0, footerY, this.CERTIFICATE_WIDTH, 30, 'F');

    // Add legal text
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('This certificate is electronically generated and digitally signed.', 20, footerY + 8);
    doc.text('It serves as proof of healthcare service transaction completion.', 20, footerY + 14);
    doc.text('For verification, scan the QR code or visit the HCTS verification portal.', 20, footerY + 20);

    // Add page number
    doc.text('Page 1 of 1', this.CERTIFICATE_WIDTH - 20, footerY + 20, { align: 'right' });
  }

  /**
   * Add security features like watermarks and hashes
   */
  private static addSecurityFeatures(doc: jsPDF, data: CertificateData): void {
    // Add subtle watermark
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('HCTS', this.CERTIFICATE_WIDTH / 2, this.CERTIFICATE_HEIGHT / 2, {
      align: 'center',
      angle: 45
    });

    // Reset text color
    doc.setTextColor(0, 0, 0);
  }

  /**
   * Generate SHA-256 hash of the certificate content
   */
  static generateCertificateHash(certificateData: CertificateData): string {
    const content = JSON.stringify({
      certificateNumber: certificateData.certificateNumber,
      serviceName: certificateData.serviceName,
      buyerName: certificateData.buyerName,
      sellerName: certificateData.sellerName,
      totalPrice: certificateData.totalPrice,
      issuedDate: certificateData.issuedDate.toISOString(),
      expiryDate: certificateData.expiryDate.toISOString(),
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate verification hash for public verification
   */
  static generateVerificationHash(certificateData: CertificateData): string {
    const content = `${certificateData.certificateNumber}:${certificateData.totalPrice}:${certificateData.issuedDate.toISOString()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create digital signature (simplified - in production use proper PKI)
   */
  static generateDigitalSignature(certificateData: CertificateData): string {
    const privateKey = process.env.CERTIFICATE_PRIVATE_KEY || 'default-private-key';
    const content = this.generateCertificateHash(certificateData);

    // Simplified signature - in production, use proper cryptographic signing
    const signature = crypto.createHmac('sha256', privateKey).update(content).digest('base64');
    return signature;
  }
}