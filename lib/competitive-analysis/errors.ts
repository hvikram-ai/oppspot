/**
 * Custom Error Classes for Competitive Intelligence Feature
 *
 * Provides structured error handling with proper HTTP status codes,
 * error codes, and contextual information for debugging and user feedback.
 */

/**
 * Base error class for all competitive analysis errors
 */
export class CompetitiveAnalysisError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    errorCode: string,
    statusCode: number,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'CompetitiveAnalysisError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.errorCode,
      ...(this.context && { context: this.context }),
    };
  }
}

/**
 * Resource not found (404)
 */
export class NotFoundError extends CompetitiveAnalysisError {
  constructor(resource: string, resourceId?: string) {
    super(
      `${resource} not found${resourceId ? `: ${resourceId}` : ''}`,
      'NOT_FOUND',
      404,
      { resource, resourceId }
    );
    this.name = 'NotFoundError';
  }
}

/**
 * User not authenticated (401)
 */
export class UnauthorizedError extends CompetitiveAnalysisError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * User lacks permission to access resource (403)
 */
export class ForbiddenError extends CompetitiveAnalysisError {
  constructor(message = 'Insufficient permissions', operation?: string) {
    super(message, 'FORBIDDEN', 403, { operation });
    this.name = 'ForbiddenError';
  }
}

/**
 * Request validation failed (400)
 */
export class ValidationError extends CompetitiveAnalysisError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, { details });
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit exceeded (429)
 */
export class RateLimitError extends CompetitiveAnalysisError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, operation?: string) {
    super(
      `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter, operation }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Duplicate resource conflict (409)
 */
export class ConflictError extends CompetitiveAnalysisError {
  constructor(message: string, conflictingResource?: string) {
    super(message, 'CONFLICT', 409, { conflictingResource });
    this.name = 'ConflictError';
  }
}

/**
 * External service timeout (504)
 */
export class TimeoutError extends CompetitiveAnalysisError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation timed out: ${operation}`,
      'TIMEOUT',
      504,
      { operation, timeoutMs }
    );
    this.name = 'TimeoutError';
  }
}

/**
 * External API error (502/503)
 */
export class ExternalServiceError extends CompetitiveAnalysisError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service, originalMessage: originalError?.message }
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Database operation error (500)
 */
export class DatabaseError extends CompetitiveAnalysisError {
  constructor(operation: string, originalError?: Error) {
    super(
      `Database operation failed: ${operation}`,
      'DATABASE_ERROR',
      500,
      { operation, originalMessage: originalError?.message }
    );
    this.name = 'DatabaseError';
  }
}

/**
 * AI/LLM operation error (500/502)
 */
export class AIOperationError extends CompetitiveAnalysisError {
  constructor(operation: string, originalError?: Error, statusCode = 502) {
    super(
      `AI operation failed: ${operation}`,
      'AI_OPERATION_ERROR',
      statusCode,
      { operation, originalMessage: originalError?.message }
    );
    this.name = 'AIOperationError';
  }
}

/**
 * Generic internal server error (500)
 */
export class InternalServerError extends CompetitiveAnalysisError {
  constructor(message: string, originalError?: Error) {
    super(
      message,
      'INTERNAL_SERVER_ERROR',
      500,
      { originalMessage: originalError?.message }
    );
    this.name = 'InternalServerError';
  }
}

/**
 * Type guard to check if error is a CompetitiveAnalysisError
 */
export function isCompetitiveAnalysisError(
  error: unknown
): error is CompetitiveAnalysisError {
  return error instanceof CompetitiveAnalysisError;
}

/**
 * Error handler utility for API routes
 * Converts errors to appropriate HTTP responses
 */
export function handleError(error: unknown): {
  statusCode: number;
  body: Record<string, any>;
} {
  // Handle our custom errors
  if (isCompetitiveAnalysisError(error)) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    };
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      statusCode: 400,
      body: {
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: (error as any).issues,
      },
    };
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Unhandled error:', error);

  return {
    statusCode: 500,
    body: {
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  };
}

/**
 * Async error wrapper for API route handlers
 * Automatically catches and converts errors to HTTP responses
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      const { statusCode, body } = handleError(error);
      throw new CompetitiveAnalysisError(
        body.error,
        body.code,
        statusCode,
        body.context || body.details
      );
    }
  };
}
