/**
 * Error Handling Utilities for Data Room
 * Consistent error handling across API routes and client
 */

import { NextResponse } from 'next/server';

/**
 * Standard error codes for Data Room operations
 */
export enum DataRoomErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // File Upload Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // Storage Errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

  // Processing Errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',

  // Quota & Limits
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  STORAGE_LIMIT_EXCEEDED = 'STORAGE_LIMIT_EXCEEDED',

  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',

  // Generic Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for Data Room operations
 */
export class DataRoomError extends Error {
  public readonly code: DataRoomErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: DataRoomErrorCode,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'DataRoomError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataRoomError);
    }
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code: DataRoomErrorCode;
  details?: unknown;
  timestamp: string;
  path?: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  path?: string
): NextResponse<ErrorResponse> {
  let statusCode = 500;
  let errorCode = DataRoomErrorCode.UNKNOWN_ERROR;
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  if (error instanceof DataRoomError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
    errorCode = DataRoomErrorCode.INTERNAL_ERROR;
  }

  // Log error for debugging (don't expose stack traces to client)
  console.error('Data Room Error:', {
    code: errorCode,
    message,
    details,
    stack: error instanceof Error ? error.stack : undefined,
  });

  const response: ErrorResponse = {
    error: message,
    code: errorCode,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    timestamp: new Date().toISOString(),
    path,
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Validation error helper
 */
export function validationError(
  message: string,
  details?: unknown
): DataRoomError {
  return new DataRoomError(
    message,
    DataRoomErrorCode.VALIDATION_ERROR,
    400,
    details
  );
}

/**
 * Not found error helper
 */
export function notFoundError(resource: string, id?: string): DataRoomError {
  const message = id
    ? `${resource} with ID ${id} not found`
    : `${resource} not found`;
  return new DataRoomError(message, DataRoomErrorCode.NOT_FOUND, 404);
}

/**
 * Forbidden error helper
 */
export function forbiddenError(message: string = 'Access denied'): DataRoomError {
  return new DataRoomError(message, DataRoomErrorCode.FORBIDDEN, 403);
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(
  message: string = 'Authentication required'
): DataRoomError {
  return new DataRoomError(message, DataRoomErrorCode.UNAUTHORIZED, 401);
}

/**
 * File upload error helper
 */
export function fileUploadError(
  message: string,
  code: DataRoomErrorCode = DataRoomErrorCode.UPLOAD_FAILED
): DataRoomError {
  return new DataRoomError(message, code, 400);
}

/**
 * Quota exceeded error helper
 */
export function quotaExceededError(
  resource: string,
  limit: number
): DataRoomError {
  return new DataRoomError(
    `${resource} quota exceeded. Limit: ${limit}`,
    DataRoomErrorCode.QUOTA_EXCEEDED,
    403,
    { resource, limit }
  );
}

/**
 * Wrap async route handler with error handling
 * @param handler - Async route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request, context?: T) => Promise<NextResponse>
) {
  return async (req: Request, context?: T): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return createErrorResponse(error, new URL(req.url).pathname);
    }
  };
}

/**
 * Client-side error parser
 * Parses error response from API
 */
export function parseApiError(error: unknown): {
  message: string;
  code: DataRoomErrorCode;
  details?: unknown;
} {
  // Fetch API error
  if (error instanceof Response) {
    return {
      message: 'Request failed',
      code: DataRoomErrorCode.UNKNOWN_ERROR,
    };
  }

  // Error object from API
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'code' in error
  ) {
    return {
      message: String((error as { error: string }).error),
      code: (error as { code: DataRoomErrorCode }).code,
      details: 'details' in error ? (error as { details: unknown }).details : undefined,
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      message: error.message,
      code: DataRoomErrorCode.UNKNOWN_ERROR,
    };
  }

  // Unknown error type
  return {
    message: 'An unexpected error occurred',
    code: DataRoomErrorCode.UNKNOWN_ERROR,
  };
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyMessage(code: DataRoomErrorCode): string {
  const messages: Record<DataRoomErrorCode, string> = {
    [DataRoomErrorCode.UNAUTHORIZED]: 'Please sign in to continue.',
    [DataRoomErrorCode.FORBIDDEN]: "You don't have permission to perform this action.",
    [DataRoomErrorCode.INVALID_TOKEN]: 'Your session has expired. Please sign in again.',
    [DataRoomErrorCode.NOT_FOUND]: 'The requested resource was not found.',
    [DataRoomErrorCode.ALREADY_EXISTS]: 'This resource already exists.',
    [DataRoomErrorCode.CONFLICT]: 'There was a conflict with the current state.',
    [DataRoomErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
    [DataRoomErrorCode.INVALID_INPUT]: 'Invalid input provided.',
    [DataRoomErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
    [DataRoomErrorCode.FILE_TOO_LARGE]: 'File is too large. Maximum size is 100MB.',
    [DataRoomErrorCode.INVALID_FILE_TYPE]: 'Invalid file type. Please upload a PDF, Word, or Excel document.',
    [DataRoomErrorCode.UPLOAD_FAILED]: 'File upload failed. Please try again.',
    [DataRoomErrorCode.STORAGE_ERROR]: 'Storage operation failed. Please try again.',
    [DataRoomErrorCode.DOWNLOAD_FAILED]: 'Failed to download file. Please try again.',
    [DataRoomErrorCode.PROCESSING_FAILED]: 'Document processing failed. Please try again.',
    [DataRoomErrorCode.AI_SERVICE_ERROR]: 'AI analysis service is temporarily unavailable.',
    [DataRoomErrorCode.EXTRACTION_FAILED]: 'Failed to extract text from document.',
    [DataRoomErrorCode.QUOTA_EXCEEDED]: 'You have exceeded your usage quota.',
    [DataRoomErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down.',
    [DataRoomErrorCode.STORAGE_LIMIT_EXCEEDED]: 'Storage limit exceeded. Please delete some files.',
    [DataRoomErrorCode.DATABASE_ERROR]: 'Database operation failed. Please try again.',
    [DataRoomErrorCode.QUERY_FAILED]: 'Query failed. Please try again.',
    [DataRoomErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
    [DataRoomErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  };

  return messages[code] || messages[DataRoomErrorCode.UNKNOWN_ERROR];
}

/**
 * Check if error is retryable
 */
export function isRetryableError(code: DataRoomErrorCode): boolean {
  const retryableErrors = [
    DataRoomErrorCode.STORAGE_ERROR,
    DataRoomErrorCode.DATABASE_ERROR,
    DataRoomErrorCode.QUERY_FAILED,
    DataRoomErrorCode.UPLOAD_FAILED,
    DataRoomErrorCode.DOWNLOAD_FAILED,
    DataRoomErrorCode.AI_SERVICE_ERROR,
    DataRoomErrorCode.INTERNAL_ERROR,
  ];

  return retryableErrors.includes(code);
}
