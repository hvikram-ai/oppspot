/**
 * Error handling utilities
 * Provides type-safe error handling helpers
 */

/**
 * Type guard to check if value is an Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Safely get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unknown error occurred'
}

/**
 * Safely get error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack
  }
  return undefined
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): {
  message: string
  stack?: string
  type: string
} {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error),
    type: isError(error) ? error.constructor.name : typeof error
  }
}
