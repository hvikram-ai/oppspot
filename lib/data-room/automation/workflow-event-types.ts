/**
 * Workflow Event Types
 * Defines all events that can trigger workflow automation
 */

// Event types for workflow automation
export type WorkflowEventType =
  | 'document.uploaded'
  | 'document.analyzed'
  | 'document.deleted'
  | 'workflow.created'
  | 'workflow.started'
  | 'workflow.step.completed'
  | 'workflow.completed'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.needs_changes'
  | 'approval.expired'
  | 'task.assigned'
  | 'task.completed'
  | 'task.overdue'
  | 'checklist.item.completed'
  | 'checklist.completed'
  | 'data_room.created'
  | 'data_room.member.invited'
  | 'data_room.member.joined'

// Base event interface
export interface WorkflowEvent<T = Record<string, unknown>> {
  id: string
  type: WorkflowEventType
  data_room_id: string
  timestamp: string
  actor_id: string
  metadata: T
}

// Specific event metadata types
export interface DocumentUploadedEvent extends WorkflowEvent {
  type: 'document.uploaded'
  metadata: {
    document_id: string
    document_name: string
    document_type: string
    file_size: number
  }
}

export interface DocumentAnalyzedEvent extends WorkflowEvent {
  type: 'document.analyzed'
  metadata: {
    document_id: string
    document_type: string
    classification_confidence: number
    extracted_metadata: Record<string, unknown>
  }
}

export interface WorkflowStepCompletedEvent extends WorkflowEvent {
  type: 'workflow.step.completed'
  metadata: {
    workflow_id: string
    step_id: string
    step_name: string
    step_type: string
    next_step_id: string | null
  }
}

export interface ApprovalRequestedEvent extends WorkflowEvent {
  type: 'approval.requested'
  metadata: {
    approval_id: string
    workflow_step_id: string
    requested_from: string
    title: string
    expires_at: string | null
  }
}

export interface ApprovalDecisionEvent extends WorkflowEvent {
  type: 'approval.approved' | 'approval.rejected' | 'approval.needs_changes'
  metadata: {
    approval_id: string
    workflow_step_id: string
    decision: string
    decision_notes: string | null
  }
}

export interface TaskAssignedEvent extends WorkflowEvent {
  type: 'task.assigned'
  metadata: {
    task_id: string
    workflow_step_id: string
    assigned_to: string
    title: string
    priority: string
    due_date: string | null
  }
}

export interface TaskOverdueEvent extends WorkflowEvent {
  type: 'task.overdue'
  metadata: {
    task_id: string
    assigned_to: string
    title: string
    due_date: string
    days_overdue: number
  }
}

// Union type of all specific events
export type SpecificWorkflowEvent =
  | DocumentUploadedEvent
  | DocumentAnalyzedEvent
  | WorkflowStepCompletedEvent
  | ApprovalRequestedEvent
  | ApprovalDecisionEvent
  | TaskAssignedEvent
  | TaskOverdueEvent

// Notification types for workflow events
export const WorkflowNotificationTypes = {
  APPROVAL_REQUESTED: 'workflow.approval_requested',
  APPROVAL_REMINDER: 'workflow.approval_reminder',
  APPROVAL_EXPIRING_SOON: 'workflow.approval_expiring_soon',
  APPROVAL_DECIDED: 'workflow.approval_decided',
  TASK_ASSIGNED: 'workflow.task_assigned',
  TASK_DUE_SOON: 'workflow.task_due_soon',
  TASK_OVERDUE: 'workflow.task_overdue',
  TASK_COMPLETED: 'workflow.task_completed',
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  DOCUMENT_UPLOADED: 'workflow.document_uploaded',
  DOCUMENT_ANALYZED: 'workflow.document_analyzed',
  CHECKLIST_COMPLETED: 'workflow.checklist_completed',
  MEMBER_INVITED: 'workflow.member_invited'
} as const

export type WorkflowNotificationType = typeof WorkflowNotificationTypes[keyof typeof WorkflowNotificationTypes]
