import { NextRequest, NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  noSniff?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  xssProtection?: boolean;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  permissionsPolicy?: string;
  crossOriginEmbedderPolicy?: 'require-corp' | 'credentialless';
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginResourcePolicy?: 'same-origin' | 'same-site' | 'cross-origin';
}

export class SecurityMiddleware {
  private static readonly DEFAULT_CONFIG: SecurityHeadersConfig = {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false,
    },
    noSniff: true,
    frameOptions: 'DENY',
    xssProtection: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
  };

  /**
   * Apply security headers to a response
   */
  static applySecurityHeaders(
    response: NextResponse,
    config: Partial<SecurityHeadersConfig> = {}
  ): NextResponse {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Content Security Policy
    if (finalConfig.contentSecurityPolicy) {
      response.headers.set('Content-Security-Policy', finalConfig.contentSecurityPolicy);
    }

    // HTTP Strict Transport Security
    if (finalConfig.hsts) {
      const hstsValue = `max-age=${finalConfig.hsts.maxAge}`;
      if (finalConfig.hsts.includeSubDomains) {
        hstsValue + '; includeSubDomains';
      }
      if (finalConfig.hsts.preload) {
        hstsValue + '; preload';
      }
      response.headers.set('Strict-Transport-Security', hstsValue);
    }

    // X-Content-Type-Options
    if (finalConfig.noSniff) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (finalConfig.frameOptions) {
      response.headers.set('X-Frame-Options', finalConfig.frameOptions);
    }

    // X-XSS-Protection
    if (finalConfig.xssProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (finalConfig.referrerPolicy) {
      response.headers.set('Referrer-Policy', finalConfig.referrerPolicy);
    }

    // Permissions-Policy
    if (finalConfig.permissionsPolicy) {
      response.headers.set('Permissions-Policy', finalConfig.permissionsPolicy);
    }

    // Cross-Origin Embedder Policy
    if (finalConfig.crossOriginEmbedderPolicy) {
      response.headers.set('Cross-Origin-Embedder-Policy', finalConfig.crossOriginEmbedderPolicy);
    }

    // Cross-Origin Opener Policy
    if (finalConfig.crossOriginOpenerPolicy) {
      response.headers.set('Cross-Origin-Opener-Policy', finalConfig.crossOriginOpenerPolicy);
    }

    // Cross-Origin Resource Policy
    if (finalConfig.crossOriginResourcePolicy) {
      response.headers.set('Cross-Origin-Resource-Policy', finalConfig.crossOriginResourcePolicy);
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');

    return response;
  }

  /**
   * Next.js middleware function for applying security headers
   */
  static createMiddleware(config: Partial<SecurityHeadersConfig> = {}) {
    return (response: NextResponse): NextResponse => {
      return this.applySecurityHeaders(response, config);
    };
  }

  /**
   * API route wrapper that applies security headers
   */
  static withSecurityHeaders(
    handler: (req: NextRequest) => Promise<NextResponse>,
    config: Partial<SecurityHeadersConfig> = {}
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const response = await handler(req);
        return this.applySecurityHeaders(response, config);
      } catch (error) {
        // Apply security headers even on error responses
        const errorResponse = new NextResponse(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        return this.applySecurityHeaders(errorResponse, config);
      }
    };
  }

  /**
   * Development-friendly configuration (less strict)
   */
  static getDevelopmentConfig(): SecurityHeadersConfig {
    return {
      ...this.DEFAULT_CONFIG,
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*; style-src 'self' 'unsafe-inline' localhost:* 127.0.0.1:*; img-src 'self' data: https: localhost:* 127.0.0.1:*; font-src 'self' data: localhost:* 127.0.0.1:*; connect-src 'self' https: ws: wss: localhost:* 127.0.0.1:*; media-src 'self' localhost:* 127.0.0.1:*; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
      hsts: undefined, // Disable HSTS in development
      crossOriginEmbedderPolicy: undefined, // Can cause issues with dev tools
    };
  }

  /**
   * Production configuration (strict)
   */
  static getProductionConfig(): SecurityHeadersConfig {
    return {
      ...this.DEFAULT_CONFIG,
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
    };
  }

  /**
   * API-specific configuration
   */
  static getAPIConfig(): SecurityHeadersConfig {
    return {
      ...this.DEFAULT_CONFIG,
      contentSecurityPolicy: "default-src 'none'; frame-ancestors 'none';",
      crossOriginResourcePolicy: 'cross-origin', // Allow API access from different origins
    };
  }
}