import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { RateLimiter } from '@/lib/rate-limiter'
import { InputValidator } from '@/lib/input-validation'
import { AuditLogger } from '@/lib/audit-logger'
import { SecurityMiddleware } from '@/lib/security-middleware'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for uploads
    const rateLimitResult = await RateLimiter.checkRateLimit(request, RateLimiter.CONFIGS.UPLOAD);
    if (!rateLimitResult.success) {
      return SecurityMiddleware.applySecurityHeaders(
        new NextResponse(
          JSON.stringify({
            error: 'Upload rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString(),
            },
          }
        ),
        SecurityMiddleware.getAPIConfig()
      );
    }

    // Authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      await AuditLogger.logSecurity(undefined, 'unauthorized_access', 'medium', {
        endpoint: '/api/upload/document',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      });
      return SecurityMiddleware.applySecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
        SecurityMiddleware.getAPIConfig()
      );
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return SecurityMiddleware.applySecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'No file received' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        SecurityMiddleware.getAPIConfig()
      );
    }

    // Enhanced file validation using InputValidator
    const fileValidation = InputValidator.validateFileUpload(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
    });

    if (!fileValidation.success) {
      await AuditLogger.logSecurity(session.user.id, 'invalid_file_upload', 'medium', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        errors: fileValidation.errors,
      });

      return SecurityMiddleware.applySecurityHeaders(
        new NextResponse(JSON.stringify({
          error: 'File validation failed',
          details: fileValidation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        SecurityMiddleware.getAPIConfig()
      );
    }

    // Generate secure unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${randomUUID()}.${fileExtension}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'documents')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Audit log the successful upload
    await AuditLogger.logFileOperation(session.user.id, 'upload', file.name, file.size, {
      fileType: file.type,
      secureFileName: fileName,
      filePath,
    });

    // Return file path (in production, this would be a cloud storage URL)
    const fileUrl = `/uploads/documents/${fileName}`

    const response = NextResponse.json({
      message: 'File uploaded successfully',
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    return SecurityMiddleware.applySecurityHeaders(response, SecurityMiddleware.getAPIConfig());

  } catch (error) {
    console.error('File upload error:', error)

    // Try to get session for audit logging
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (session) {
        await AuditLogger.logSecurity(session.user.id, 'file_upload_error', 'medium', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log upload error:', logError);
    }

    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return SecurityMiddleware.applySecurityHeaders(errorResponse, SecurityMiddleware.getAPIConfig());
  }
}