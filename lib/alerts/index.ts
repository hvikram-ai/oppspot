/**
 * Critical Alerts System
 * Export all alert-related services and utilities
 */

export { ErrorDetector, withErrorDetection } from './error-detector'
export type { ErrorSeverity, ErrorCategory, ErrorContext, ClassifiedError } from './error-detector'

export { AlertService } from './alert-service'
export type {
  AlertSeverity,
  AlertCategory,
  AlertStatus,
  TriggerAlertParams,
  SystemAlert,
} from './alert-service'

export { FailureDetector, getFailureDetector } from './failure-detector'
export type { ServiceStatus, HealthCheckResult } from './failure-detector'
