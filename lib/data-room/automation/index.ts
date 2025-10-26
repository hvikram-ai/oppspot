/**
 * Data Room Automation Module
 * Export all automation services and types
 */

// Event types
export * from './workflow-event-types'

// Services
export { WorkflowNotificationService } from './workflow-notification-service'
export { WorkflowAutomationService, workflowAutomationService } from './workflow-automation-service'
export { ReminderService, reminderService } from './reminder-service'

// Email templates
export { WorkflowEmailTemplates } from './email-templates'

// Types
export type { AutoAssignmentRule } from './workflow-automation-service'
