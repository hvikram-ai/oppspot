/**
 * Data Room Utilities
 * Centralized exports for utility functions
 */

export {
  DataRoomError,
  DataRoomErrorCode,
  createErrorResponse,
  validationError,
  notFoundError,
  forbiddenError,
  unauthorizedError,
  fileUploadError,
  quotaExceededError,
  withErrorHandler,
  parseApiError,
  getUserFriendlyMessage,
  isRetryableError,
  type ErrorResponse,
} from './error-handler';
