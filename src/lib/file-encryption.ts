import CryptoJS from 'crypto-js';
import fs from 'fs/promises';
import path from 'path';

export class FileEncryption {
  /**
   * Encrypt a file using AES
   */
  static async encryptFile(
    inputPath: string,
    outputPath: string,
    password: string = process.env.FILE_ENCRYPTION_KEY || 'default-encryption-key'
  ): Promise<void> {
    try {
      // Read the input file
      const inputBuffer = await fs.readFile(inputPath);
      const inputBase64 = inputBuffer.toString('base64');

      // Encrypt using crypto-js
      const encrypted = CryptoJS.AES.encrypt(inputBase64, password).toString();

      // Write encrypted file
      await fs.writeFile(outputPath, encrypted);

    } catch (error) {
      console.error('Error encrypting file:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt a file using AES
   */
  static async decryptFile(
    inputPath: string,
    outputPath: string,
    password: string = process.env.FILE_ENCRYPTION_KEY || 'default-encryption-key'
  ): Promise<void> {
    try {
      // Read the encrypted file
      const encryptedData = await fs.readFile(inputPath, 'utf8');

      // Decrypt using crypto-js
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedBase64 = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedBase64) {
        throw new Error('Decryption failed - invalid password or corrupted file');
      }

      const decryptedBuffer = Buffer.from(decryptedBase64, 'base64');

      // Write decrypted file
      await fs.writeFile(outputPath, decryptedBuffer);

    } catch (error) {
      console.error('Error decrypting file:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Encrypt data in memory using AES
   */
  static encryptData(
    data: Buffer,
    password: string = process.env.FILE_ENCRYPTION_KEY || 'default-encryption-key'
  ): string {
    try {
      const dataBase64 = data.toString('base64');
      return CryptoJS.AES.encrypt(dataBase64, password).toString();
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data in memory using AES
   */
  static decryptData(
    encryptedData: string,
    password: string = process.env.FILE_ENCRYPTION_KEY || 'default-encryption-key'
  ): Buffer {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedBase64 = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedBase64) {
        throw new Error('Decryption failed - invalid password or corrupted data');
      }

      return Buffer.from(decryptedBase64, 'base64');
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate a secure encryption key
   */
  static generateSecureKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Validate if a file is encrypted (simple check)
   */
  static isEncryptedFile(filePath: string): Promise<boolean> {
    return fs.readFile(filePath, 'utf8')
      .then(content => {
        // Try to decrypt with a test - if it works, it's likely encrypted
        try {
          const testDecrypt = CryptoJS.AES.decrypt(content, 'test-key');
          return testDecrypt.toString(CryptoJS.enc.Utf8) !== '';
        } catch {
          return false;
        }
      })
      .catch(() => false);
  }
}