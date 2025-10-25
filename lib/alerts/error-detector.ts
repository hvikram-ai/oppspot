/**
 * Error Detection Middleware
 * Catches and classifies errors, triggers alerts for critical failures
 */

import { NextRequest, NextResponse } from 'next/server'
import { AlertService } from './alert-service'

export type ErrorSeverity = 'P0' | 'P1' | 'P2' | 'P3'
export type ErrorCategory =
  | 'database_failure'
  | 'api_failure'
  | 'external_service_failure'
  | 'auth_failure'
  | 'data_integrity'
  | 'performance_degradation'
  | 'security_incident'
  | 'rate_limit_exceeded'
  | 'job_failure'
  | 'custom'

export interface ErrorContext {
  endpoint: string
  method: string
  userId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

export interface ClassifiedError {
  severity: ErrorSeverity
  category: ErrorCategory
  title: string
  message: string
  shouldAlert: boolean
  shouldLog: boolean
  httpStatus: number
}

/**
 * Error Detection and Classification Service
 */
export class ErrorDetector {
  private static alertService = new AlertService()

  /**
   * Classify error and determine severity/category
   */
  static classifyError(error: unknown, context: ErrorContext): ClassifiedError {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    // Database errors - P0/P1
    if (this.isDatabaseError(errorMessage)) {
      return {
        severity: 'P0',
        category: 'database_failure',
        title: 'Database Connection Failure',
        message: errorMessage,
        shouldAlert: true,
        shouldLog: true,
        httpStatus: 503,
      }
    }

    // Authentication errors - P0/P1
    if (this.isAuthError(errorMessage, context.endpoint)) {
      return {
        severity: context.endpoint.includes('/api/auth') ? 'P0' : 'P1',
        category: 'auth_failure',
        title: 'Authentication System Failure',
        message: errorMessage,
        shouldAlert: true,
        shouldLog: true,
        httpStatus: 401,
      }
    }

    // External service errors - P1
    if (this.isExternalServiceError(errorMessage)) {
      return {
        severity: 'P1',
        category: 'external_service_failure',
        title: 'External Service Failure',
        message: errorMessage,
        shouldAlert: true,
        shouldLog: true,
        httpStatus: 503,
      }
    }

    // Rate limit errors - P2
    if (this.isRateLimitError(errorMessage)) {
      return {
        severity: 'P2',
        category: 'rate_limit_exceeded',
        title: 'Rate Limit Exceeded',
        message: errorMessage,
        shouldAlert: false, // Don't alert on rate limits
        shouldLog: true,
        httpStatus: 429,
      }
    }

    // Data validation errors - P3
    if (this.isValidationError(errorMessage)) {
      return {
        severity: 'P3',
        category: 'api_failure',
        title: 'Validation Error',
        message: errorMessage,
        shouldAlert: false,
        shouldLog: true,
        httpStatus: 400,
      }
    }

    // Default: Generic API failure - P2
    return {
      severity: 'P2',
      category: 'api_failure',
      title: 'API Request Failed',
      message: errorMessage,
      shouldAlert: false,
      shouldLog: true,
      httpStatus: 500,
    }
  }

  /**
   * Handle error: log, alert, and return appropriate response
   */
  static async handleError(
    error: unknown,
    context: ErrorContext
  ): Promise<NextResponse> {
    const classified = this.classifyError(error, context)
    const errorStack = error instanceof Error ? error.stack : undefined

    // Log error
    if (classified.shouldLog) {
      console.error('[ErrorDetector]', {
        severity: classified.severity,
        category: classified.category,
        title: classified.title,
        message: classified.message,
        endpoint: context.endpoint,
        method: context.method,
        userId: context.userId,
        stack: errorStack,
        metadata: context.metadata,
      })
    }

    // Trigger alert for critical errors
    if (classified.shouldAlert) {
      try {
        await this.alertService.triggerAlert({
          severity: classified.severity,
          category: classified.category,
          title: classified.title,
          message: classified.message,
          sourceService: 'api',
          sourceEndpoint: context.endpoint,
          sourceMethod: context.method,
          errorStack,
          context: {
            userId: context.userId,
            requestId: context.requestId,
            ...context.metadata,
          },
        })
      } catch (alertError) {
        // Don't fail the request if alerting fails
        console.error('[ErrorDetector] Failed to trigger alert:', alertError)
      }
    }

    // Return user-friendly error response
    return NextResponse.json(
      {
        error: this.getUserFriendlyMessage(classified),
        code: classified.category,
        requestId: context.requestId,
      },
      { status: classified.httpStatus }
    )
  }

  /**
   * Wrap an API route handler with error detection
   */
  static wrapApiRoute<T = unknown>(
    handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse<T>>
  ) {
    return async (
      request: NextRequest,
      context?: { params?: Record<string, string> }
    ): Promise<NextResponse<T>> => {
      const requestId = crypto.randomUUID()
      const endpoint = new URL(request.url).pathname
      const method = request.method

      try {
        // Execute the actual handler
        return await handler(request, context)
      } catch (error) {
        // Extract user ID if available
        let userId: string | undefined
        try {
          const authHeader = request.headers.get('authorization')
          // You could decode JWT here to get user ID
          userId = undefined // Placeholder
        } catch {
          // Ignore auth extraction errors
        }

        // Handle the error
        return await this.handleError(error, {
          endpoint,
          method,
          userId,
          requestId,
          metadata: {
            params: context?.params,
          },
        }) as NextResponse<T>
      }
    }
  }

  // =====================================================
  // Error Classification Helpers
  // =====================================================

  private static isDatabaseError(message: string): boolean {
    const dbErrorPatterns = [
      /connection.*refused/i,
      /connection.*timeout/i,
      /database.*unavailable/i,
      /postgres.*error/i,
      /supabase.*connection/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /relation.*does not exist/i,
      /syntax error.*at or near/i,
    ]
    return dbErrorPatterns.some((pattern) => pattern.test(message))
  }

  private static isAuthError(message: string, endpoint: string): boolean {
    const authErrorPatterns = [
      /unauthorized/i,
      /invalid.*token/i,
      /jwt.*expired/i,
      /authentication.*failed/i,
      /session.*expired/i,
      /invalid.*credentials/i,
    ]
    return (
      authErrorPatterns.some((pattern) => pattern.test(message)) ||
      (endpoint.includes('/api/auth') && message.includes('error'))
    )
  }

  private static isExternalServiceError(message: string): boolean {
    const serviceErrorPatterns = [
      /openrouter.*error/i,
      /resend.*error/i,
      /api.*request.*failed/i,
      /fetch.*failed/i,
      /network.*error/i,
      /ENOTFOUND/i,
      /service.*unavailable/i,
    ]
    return serviceErrorPatterns.some((pattern) => pattern.test(message))
  }

  private static isRateLimitError(message: string): boolean {
    const rateLimitPatterns = [
      /rate.*limit/i,
      /too.*many.*requests/i,
      /quota.*exceeded/i,
      /429/,
    ]
    return rateLimitPatterns.some((pattern) => pattern.test(message))
  }

  private static isValidationError(message: string): boolean {
    const validationPatterns = [
      /validation.*error/i,
      /invalid.*input/i,
      /required.*field/i,
      /must.*be/i,
      /zod.*error/i,
    ]
    return validationPatterns.some((pattern) => pattern.test(message))
  }

  private static getUserFriendlyMessage(classified: ClassifiedError): string {
    switch (classified.category) {
      case 'database_failure':
        return 'We are experiencing technical difficulties. Please try again in a few moments.'
      case 'auth_failure':
        return 'Authentication failed. Please sign in again.'
      case 'external_service_failure':
        return 'A required service is temporarily unavailable. Please try again later.'
      case 'rate_limit_exceeded':
        return 'You have made too many requests. Please wait a moment and try again.'
      case 'data_integrity':
        return 'The requested data is invalid or corrupted.'
      case 'performance_degradation':
        return 'The service is running slowly. Please be patient.'
      default:
        return 'An unexpected error occurred. Our team has been notified.'
    }
  }
}

/**
 * Convenience function to wrap API routes
 *
 * Usage:
 * export const GET = withErrorDetection(async (request) => {
 *   // Your handler code
 *   return NextResponse.json({ data })
 * })
 */
export function withErrorDetection<T = unknown>(
  handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse<T>>
) {
  return ErrorDetector.wrapApiRoute(handler)
}
