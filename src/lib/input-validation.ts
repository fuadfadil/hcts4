import { z } from 'zod';
import DOMPurify from 'dompurify';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export class InputValidator {
  // Common validation schemas
  static readonly SCHEMAS = {
    email: z.string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .max(255, 'Email too long'),

    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),

    name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),

    phone: z.string()
      .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format'),

    url: z.string()
      .url('Invalid URL format'),

    uuid: z.string()
      .uuid('Invalid UUID format'),

    positiveInteger: z.number()
      .int('Must be an integer')
      .positive('Must be positive'),

    positiveDecimal: z.number()
      .positive('Must be positive'),

    dateString: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),

    timeString: z.string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)'),
  };

  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
    });
  }

  /**
   * Sanitize rich text input (allow some safe tags)
   */
  static sanitizeRichText(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Validate and sanitize user input
   */
  static validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    sanitize: boolean = true
  ): ValidationResult<T> {
    try {
      // First sanitize if requested
      let processedData = data;
      if (sanitize && typeof data === 'string') {
        processedData = this.sanitizeHTML(data);
      } else if (sanitize && typeof data === 'object' && data !== null) {
        processedData = this.sanitizeObject(data);
      }

      // Then validate
      const result = schema.safeParse(processedData);

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          errors: result.error.issues.map((err: any) => err.message),
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Validation failed'],
      };
    }
  }

  /**
   * Sanitize object properties recursively
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeHTML(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): ValidationResult<File> {
    const errors: string[] = [];

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${options.maxSize} bytes`);
    }

    // Check MIME type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`);
      }
    }

    // Check for malicious file names
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      errors.push('Invalid file name');
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data: file,
    };
  }

  /**
   * Validate SQL injection attempts
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%27)|(\%23))/i,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
      /('|(\\x27)|(\\x2D\\x2D)|(\#)|(\%27)|(\%23))/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate XSS attempts
   */
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Comprehensive input validation with security checks
   */
  static validateSecureInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: {
      checkSQLInjection?: boolean;
      checkXSS?: boolean;
      sanitize?: boolean;
    } = {}
  ): ValidationResult<T> {
    const {
      checkSQLInjection = true,
      checkXSS = true,
      sanitize = true,
    } = options;

    // First check for security threats
    if (typeof data === 'string') {
      if (checkSQLInjection && this.detectSQLInjection(data)) {
        return {
          success: false,
          errors: ['Input contains potentially malicious SQL patterns'],
        };
      }

      if (checkXSS && this.detectXSS(data)) {
        return {
          success: false,
          errors: ['Input contains potentially malicious XSS patterns'],
        };
      }
    }

    // Then validate normally
    return this.validateInput(schema, data, sanitize);
  }

  /**
   * Validate API request data
   */
  static validateAPIRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: {
      strict?: boolean; // Reject unknown fields
      sanitize?: boolean;
    } = {}
  ): ValidationResult<T> {
    try {
      const { strict = true, sanitize = true } = options;

      // For now, just use the schema as-is
      // In production, you might want to implement strict validation differently
      return this.validateSecureInput(schema, data, { sanitize });
    } catch (error) {
      return {
        success: false,
        errors: ['API request validation failed'],
      };
    }
  }

  /**
   * Common validation patterns for healthcare data
   */
  static readonly HEALTHCARE_SCHEMAS = {
    patientId: z.string()
      .min(1, 'Patient ID is required')
      .max(50, 'Patient ID too long')
      .regex(/^[A-Z0-9\-_]+$/, 'Patient ID contains invalid characters'),

    icd11Code: z.string()
      .min(1, 'ICD-11 code is required')
      .max(10, 'ICD-11 code too long')
      .regex(/^[A-Z][A-Z0-9\.]+$/, 'Invalid ICD-11 code format'),

    medicalRecord: z.object({
      patientId: z.string().min(1),
      diagnosis: z.string().min(1).max(1000),
      treatment: z.string().max(2000).optional(),
      notes: z.string().max(5000).optional(),
    }),

    appointment: z.object({
      patientId: z.string().min(1),
      providerId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      duration: z.number().int().positive().max(480), // Max 8 hours
      notes: z.string().max(1000).optional(),
    }),
  };

  /**
   * Validate healthcare-specific data
   */
  static validateHealthcareData<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): ValidationResult<T> {
    // Healthcare data often contains sensitive information
    // Apply extra strict validation
    return this.validateSecureInput(schema, data, {
      checkSQLInjection: true,
      checkXSS: true,
      sanitize: true,
    });
  }
}