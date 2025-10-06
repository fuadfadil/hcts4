import CryptoJS from 'crypto-js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { AuditLogger } from './audit-logger';

export interface EncryptionOptions {
  algorithm?: 'aes-256-gcm' | 'aes-256-cbc';
  keyLength?: number;
  saltRounds?: number;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt?: string;
  tag?: string; // For GCM mode
  algorithm: string;
}

export class DataEncryptor {
  private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
  private static readonly DEFAULT_KEY_LENGTH = 32;
  private static readonly ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'default-data-encryption-key-change-in-production';

  /**
   * Encrypt data using AES with PBKDF2 key derivation
   */
  static encryptData(data: string, options: EncryptionOptions = {}): EncryptedData {
    try {
      const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;
      const salt = randomBytes(32);
      const keyLength = options.keyLength || this.DEFAULT_KEY_LENGTH;

      // Derive key using PBKDF2
      const key = scryptSync(this.ENCRYPTION_KEY, salt, keyLength);
      const iv = randomBytes(16);

      let encrypted: string;
      let tag: string | undefined;

      if (algorithm === 'aes-256-gcm') {
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        tag = cipher.getAuthTag().toString('hex');
      } else {
        const cipher = createCipheriv('aes-256-cbc', key, iv);
        encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
      }

      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag,
        algorithm,
      };
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES
   */
  static decryptData(encryptedData: EncryptedData): string {
    try {
      const algorithm = encryptedData.algorithm || this.DEFAULT_ALGORITHM;
      const keyLength = this.DEFAULT_KEY_LENGTH;

      const salt = Buffer.from(encryptedData.salt || '', 'hex');
      const key = scryptSync(this.ENCRYPTION_KEY, salt, keyLength);
      const iv = Buffer.from(encryptedData.iv, 'hex');

      let decrypted: string;

      if (algorithm === 'aes-256-gcm' && encryptedData.tag) {
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
        decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      } else {
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      }

      return decrypted;
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt sensitive fields in an object
   */
  static encryptObjectFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[],
    userId?: string
  ): T & { _encryptedFields: string[] } {
    const encryptedObj = { ...obj } as any;
    const encryptedFields: string[] = [];

    fieldsToEncrypt.forEach(field => {
      if (obj[field] !== undefined && obj[field] !== null) {
        try {
          const encrypted = this.encryptData(JSON.stringify(obj[field]));
          encryptedObj[field] = JSON.stringify(encrypted);
          encryptedFields.push(String(field));

          // Audit log the encryption
          if (userId) {
            AuditLogger.logDataAccess(userId, 'encrypt', 'object_field', String(field), {
              field: String(field),
              algorithm: encrypted.algorithm,
            });
          }
        } catch (error) {
          console.error(`Failed to encrypt field ${String(field)}:`, error);
        }
      }
    });

    return {
      ...encryptedObj,
      _encryptedFields: encryptedFields,
    };
  }

  /**
   * Decrypt sensitive fields in an object
   */
  static decryptObjectFields<T extends Record<string, any>>(
    obj: T & { _encryptedFields?: string[] },
    userId?: string
  ): T {
    const decryptedObj = { ...obj } as any;
    const encryptedFields = obj._encryptedFields || [];

    encryptedFields.forEach(field => {
      if (decryptedObj[field] !== undefined && decryptedObj[field] !== null) {
        try {
          const encryptedData: EncryptedData = JSON.parse(decryptedObj[field] as string);
          const decrypted = this.decryptData(encryptedData);
          decryptedObj[field] = JSON.parse(decrypted);

          // Audit log the decryption
          if (userId) {
            AuditLogger.logDataAccess(userId, 'decrypt', 'object_field', field, {
              field,
              algorithm: encryptedData.algorithm,
            });
          }
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    });

    delete decryptedObj._encryptedFields;
    return decryptedObj as T;
  }

  /**
   * Encrypt data for database storage (returns JSON string)
   */
  static encryptForStorage(data: any, userId?: string): string {
    try {
      const jsonData = JSON.stringify(data);
      const encrypted = this.encryptData(jsonData);

      // Audit log
      if (userId) {
        AuditLogger.logDataAccess(userId, 'encrypt', 'database_storage', 'data', {
          algorithm: encrypted.algorithm,
        });
      }

      return JSON.stringify(encrypted);
    } catch (error) {
      console.error('Failed to encrypt data for storage:', error);
      throw new Error('Failed to encrypt data for storage');
    }
  }

  /**
   * Decrypt data from database storage
   */
  static decryptFromStorage(encryptedJson: string, userId?: string): any {
    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedJson);
      const decryptedJson = this.decryptData(encryptedData);
      const data = JSON.parse(decryptedJson);

      // Audit log
      if (userId) {
        AuditLogger.logDataAccess(userId, 'decrypt', 'database_storage', 'data', {
          algorithm: encryptedData.algorithm,
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to decrypt data from storage:', error);
      throw new Error('Failed to decrypt data from storage');
    }
  }

  /**
   * Generate a secure encryption key
   */
  static generateSecureKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash a password using bcrypt (for user authentication)
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypt file content
   */
  static async encryptFile(
    inputPath: string,
    outputPath: string,
    userId?: string
  ): Promise<void> {
    const fs = await import('fs/promises');

    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const encrypted = this.encryptData(content);

      await fs.writeFile(outputPath, JSON.stringify(encrypted), 'utf8');

      // Audit log
      if (userId) {
        AuditLogger.logFileOperation(userId, 'encrypt', inputPath);
      }
    } catch (error) {
      console.error('File encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file content
   */
  static async decryptFile(
    inputPath: string,
    outputPath: string,
    userId?: string
  ): Promise<void> {
    const fs = await import('fs/promises');

    try {
      const encryptedJson = await fs.readFile(inputPath, 'utf8');
      const encryptedData: EncryptedData = JSON.parse(encryptedJson);
      const decrypted = this.decryptData(encryptedData);

      await fs.writeFile(outputPath, decrypted, 'utf8');

      // Audit log
      if (userId) {
        AuditLogger.logFileOperation(userId, 'decrypt', inputPath);
      }
    } catch (error) {
      console.error('File decryption failed:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Create a secure token (for sessions, API keys, etc.)
   */
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('base64url');
  }

  /**
   * Validate encryption integrity
   */
  static validateEncryption(encryptedData: EncryptedData): boolean {
    try {
      // Attempt to decrypt with a test - if it doesn't throw, it's valid
      this.decryptData(encryptedData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rotate encryption keys (re-encrypt data with new key)
   */
  static async rotateEncryptionKey(
    oldKey: string,
    newKey: string,
    dataToRotate: EncryptedData[]
  ): Promise<EncryptedData[]> {
    // Temporarily change the encryption key
    const originalKey = this.ENCRYPTION_KEY;
    (this as any).ENCRYPTION_KEY = oldKey;

    try {
      const rotatedData: EncryptedData[] = [];

      for (const data of dataToRotate) {
        // Decrypt with old key
        const decrypted = this.decryptData(data);

        // Encrypt with new key
        (this as any).ENCRYPTION_KEY = newKey;
        const reEncrypted = this.encryptData(decrypted);

        rotatedData.push(reEncrypted);
      }

      return rotatedData;
    } finally {
      // Restore original key
      (this as any).ENCRYPTION_KEY = originalKey;
    }
  }
}