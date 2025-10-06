import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';

export interface QRCodeData {
  certificateId: string;
  certificateNumber: string;
  verificationHash: string;
  issuedAt: string;
  expiresAt: string;
  buyerId: number;
  sellerId: number;
}

export class QRCodeGenerator {
  private static readonly ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'default-key-change-in-production';
  private static readonly ALGORITHM = 'aes-256-gcm';

  /**
   * Generate encrypted QR code data for a certificate
   */
  static async generateCertificateQR(data: QRCodeData): Promise<string> {
    try {
      // Create the data payload
      const payload = {
        type: 'certificate',
        version: '1.0',
        ...data,
        timestamp: new Date().toISOString(),
      };

      // Encrypt the payload
      const encryptedData = this.encryptData(JSON.stringify(payload));

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(encryptedData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating certificate QR code:', error);
      throw new Error('Failed to generate certificate QR code');
    }
  }

  /**
   * Decrypt and verify QR code data
   */
  static decryptQRData(encryptedData: string): QRCodeData | null {
    try {
      const decrypted = this.decryptData(encryptedData);
      const payload = JSON.parse(decrypted);

      // Validate payload structure
      if (payload.type !== 'certificate' || !payload.certificateId) {
        return null;
      }

      return {
        certificateId: payload.certificateId,
        certificateNumber: payload.certificateNumber,
        verificationHash: payload.verificationHash,
        issuedAt: payload.issuedAt,
        expiresAt: payload.expiresAt,
        buyerId: payload.buyerId,
        sellerId: payload.sellerId,
      };
    } catch (error) {
      console.error('Error decrypting QR data:', error);
      return null;
    }
  }

  /**
   * Generate a verification URL for the QR code
   */
  static generateVerificationURL(certificateNumber: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/verify/${certificateNumber}`;
  }

  /**
   * Encrypt data using AES
   */
  private static encryptData(data: string): string {
    const encrypted = CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
    return encrypted;
  }

  /**
   * Decrypt data using AES
   */
  private static decryptData(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  }

  /**
   * Generate a simple QR code for basic data (non-encrypted)
   */
  static async generateSimpleQR(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 128,
        margin: 1,
      });
    } catch (error) {
      console.error('Error generating simple QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }
}