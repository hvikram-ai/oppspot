/**
 * Workflow Notification Service
 * Handles all notifications for workflow events
 */

import { NotificationService } from '@/lib/notifications/notification-service'
import type {
  WorkflowEvent,
  WorkflowNotificationType,
  ApprovalRequestedEvent,
  ApprovalDecisionEvent,
  TaskAssignedEvent,
  TaskOverdueEvent
} from './workflow-event-types'
import type { ApprovalRequest, WorkflowTask } from '../types'

export class WorkflowNotificationService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  /**
   * Send notification for approval request
   */
  async notifyApprovalRequested(approval: ApprovalRequest, dataRoomName: string): Promise<void> {
    await this.notificationService.sendNotification({
      userId: approval.requested_from,
      type: 'workflow.approval_requested',
      title: 'Approval Request',
      body: `${approval.title} requires your approval in ${dataRoomName}`,
      priority: approval.expires_at ? 'high' : 'medium',
      actionUrl: `/data-room/${approval.workflow_step_id}?tab=approvals`,
      data: {
        approval_id: approval.id,
        workflow_step_id: approval.workflow_step_id,
        expires_at: approval.expires_at
      }
    })
  }

  /**
   * Send reminder for pending approval
   */
  async notifyApprovalReminder(
    approval: ApprovalRequest,
    dataRoomName: string,
    hoursRemaining: number
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId: approval.requested_from,
      type: 'workflow.approval_reminder',
      title: 'Approval Deadline Approaching',
      body: `${approval.title} expires in ${hoursRemaining} hours. Please review in ${dataRoomName}.`,
      priority: 'urgent',
      actionUrl: `/data-room/${approval.workflow_step_id}?tab=approvals`,
      data: {
        approval_id: approval.id,
        hours_remaining: hoursRemaining
      }
    })
  }

  /**
   * Send notification when approval expires
   */
  async notifyApprovalExpired(
    approval: ApprovalRequest,
    dataRoomName: string,
    escalateToUserId?: string
  ): Promise<void> {
    // Notify the approver that they missed the deadline
    await this.notificationService.sendNotification({
      userId: approval.requested_from,
      type: 'workflow.approval_expiring_soon',
      title: 'Approval Request Expired',
      body: `${approval.title} has expired without a decision in ${dataRoomName}.`,
      priority: 'high',
      actionUrl: `/data-room/${approval.workflow_step_id}?tab=approvals`,
      data: {
        approval_id: approval.id
      }
    })

    // If escalation is configured, notify the escalation user
    if (escalateToUserId) {
      await this.notificationService.sendNotification({
        userId: escalateToUserId,
        type: 'workflow.approval_requested',
        title: 'Escalated Approval Request',
        body: `${approval.title} has been escalated to you after expiration in ${dataRoomName}.`,
        priority: 'urgent',
        actionUrl: `/data-room/${approval.workflow_step_id}?tab=approvals`,
        data: {
          approval_id: approval.id,
          escalated: true,
          original_approver: approval.requested_from
        }
      })
    }
  }

  /**
   * Notify requester when approval decision is made
   */
  async notifyApprovalDecision(
    approval: ApprovalRequest,
    dataRoomName: string
  ): Promise<void> {
    const decisionText = {
      approved: 'approved',
      rejected: 'rejected',
      needs_changes: 'requested changes to'
    }[approval.decision!]

    await this.notificationService.sendNotification({
      userId: approval.requested_by,
      type: 'workflow.approval_decided',
      title: `Approval ${approval.decision === 'approved' ? 'Granted' : 'Decision Made'}`,
      body: `${approval.requested_from} ${decisionText} ${approval.title} in ${dataRoomName}${
        approval.decision_notes ? `: "${approval.decision_notes}"` : ''
      }`,
      priority: 'medium',
      actionUrl: `/data-room/${approval.workflow_step_id}?tab=approvals`,
      data: {
        approval_id: approval.id,
        decision: approval.decision,
        decision_notes: approval.decision_notes
      }
    })
  }

  /**
   * Send notification when task is assigned
   */
  async notifyTaskAssigned(task: WorkflowTask, dataRoomName: string): Promise<void> {
    const priorityEmoji = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '⚪'
    }[task.priority]

    await this.notificationService.sendNotification({
      userId: task.assigned_to,
      type: 'workflow.task_assigned',
      title: 'New Task Assigned',
      body: `${priorityEmoji} ${task.title} has been assigned to you in ${dataRoomName}${
        task.due_date ? ` (Due: ${new Date(task.due_date).toLocaleDateString()})` : ''
      }`,
      priority: task.priority === 'urgent' ? 'urgent' : task.priority === 'high' ? 'high' : 'medium',
      actionUrl: `/data-room/${task.workflow_step_id}?tab=tasks`,
      data: {
        task_id: task.id,
        workflow_step_id: task.workflow_step_id,
        priority: task.priority,
        due_date: task.due_date
      }
    })
  }

  /**
   * Send reminder for task due soon
   */
  async notifyTaskDueSoon(
    task: WorkflowTask,
    dataRoomName: string,
    hoursRemaining: number
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId: task.assigned_to,
      type: 'workflow.task_due_soon',
      title: 'Task Due Soon',
      body: `${task.title} is due in ${hoursRemaining} hours in ${dataRoomName}.`,
      priority: 'high',
      actionUrl: `/data-room/${task.workflow_step_id}?tab=tasks`,
      data: {
        task_id: task.id,
        hours_remaining: hoursRemaining
      }
    })
  }

  /**
   * Send notification when task is overdue
   */
  async notifyTaskOverdue(
    task: WorkflowTask,
    dataRoomName: string,
    daysOverdue: number
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId: task.assigned_to,
      type: 'workflow.task_overdue',
      title: 'Task Overdue',
      body: `⚠️ ${task.title} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue in ${dataRoomName}.`,
      priority: 'urgent',
      actionUrl: `/data-room/${task.workflow_step_id}?tab=tasks`,
      data: {
        task_id: task.id,
        days_overdue: daysOverdue
      }
    })

    // Also notify the person who assigned the task
    await this.notificationService.sendNotification({
      userId: task.assigned_by,
      type: 'workflow.task_overdue',
      title: 'Assigned Task Overdue',
      body: `Task you assigned (${task.title}) is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue in ${dataRoomName}.`,
      priority: 'high',
      actionUrl: `/data-room/${task.workflow_step_id}?tab=tasks`,
      data: {
        task_id: task.id,
        assigned_to: task.assigned_to,
        days_overdue: daysOverdue
      }
    })
  }

  /**
   * Notify when task is completed
   */
  async notifyTaskCompleted(task: WorkflowTask, dataRoomName: string): Promise<void> {
    // Notify the person who assigned the task
    await this.notificationService.sendNotification({
      userId: task.assigned_by,
      type: 'workflow.task_completed',
      title: 'Task Completed',
      body: `✅ ${task.title} has been completed in ${dataRoomName}.`,
      priority: 'low',
      actionUrl: `/data-room/${task.workflow_step_id}?tab=tasks`,
      data: {
        task_id: task.id,
        completed_by: task.assigned_to
      }
    })
  }

  /**
   * Send notification when workflow is started
   */
  async notifyWorkflowStarted(
    workflowId: string,
    workflowName: string,
    dataRoomName: string,
    participantIds: string[]
  ): Promise<void> {
    for (const userId of participantIds) {
      await this.notificationService.sendNotification({
        userId,
        type: 'workflow.started',
        title: 'Workflow Started',
        body: `${workflowName} has been started in ${dataRoomName}.`,
        priority: 'medium',
        actionUrl: `/data-room/${workflowId}?tab=workflows`,
        data: {
          workflow_id: workflowId,
          workflow_name: workflowName
        }
      })
    }
  }

  /**
   * Send notification when workflow is completed
   */
  async notifyWorkflowCompleted(
    workflowId: string,
    workflowName: string,
    dataRoomName: string,
    participantIds: string[]
  ): Promise<void> {
    for (const userId of participantIds) {
      await this.notificationService.sendNotification({
        userId,
        type: 'workflow.completed',
        title: 'Workflow Completed',
        body: `🎉 ${workflowName} has been completed in ${dataRoomName}.`,
        priority: 'low',
        actionUrl: `/data-room/${workflowId}?tab=workflows`,
        data: {
          workflow_id: workflowId,
          workflow_name: workflowName
        }
      })
    }
  }

  /**
   * Send notification when document is uploaded
   */
  async notifyDocumentUploaded(
    documentId: string,
    documentName: string,
    dataRoomId: string,
    dataRoomName: string,
    uploadedBy: string,
    notifyUserIds: string[]
  ): Promise<void> {
    for (const userId of notifyUserIds) {
      if (userId === uploadedBy) continue // Don't notify the uploader

      await this.notificationService.sendNotification({
        userId,
        type: 'workflow.document_uploaded',
        title: 'New Document Uploaded',
        body: `${documentName} was uploaded to ${dataRoomName}.`,
        priority: 'low',
        actionUrl: `/data-room/${dataRoomId}/documents/${documentId}`,
        data: {
          document_id: documentId,
          document_name: documentName,
          uploaded_by: uploadedBy
        }
      })
    }
  }

  /**
   * Send notification when document analysis is complete
   */
  async notifyDocumentAnalyzed(
    documentId: string,
    documentName: string,
    documentType: string,
    dataRoomId: string,
    dataRoomName: string,
    userId: string
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      type: 'workflow.document_analyzed',
      title: 'Document Analysis Complete',
      body: `${documentName} has been analyzed and classified as ${documentType} in ${dataRoomName}.`,
      priority: 'low',
      actionUrl: `/data-room/${dataRoomId}/documents/${documentId}`,
      data: {
        document_id: documentId,
        document_type: documentType
      }
    })
  }

  /**
   * Send notification when checklist is completed
   */
  async notifyChecklistCompleted(
    checklistId: string,
    checklistName: string,
    dataRoomName: string,
    participantIds: string[]
  ): Promise<void> {
    for (const userId of participantIds) {
      await this.notificationService.sendNotification({
        userId,
        type: 'workflow.checklist_completed',
        title: 'Checklist Completed',
        body: `✅ ${checklistName} has been completed in ${dataRoomName}.`,
        priority: 'medium',
        actionUrl: `/data-room/${checklistId}?tab=checklists`,
        data: {
          checklist_id: checklistId,
          checklist_name: checklistName
        }
      })
    }
  }

  /**
   * Send notification when member is invited to data room
   */
  async notifyMemberInvited(
    invitedUserId: string,
    dataRoomName: string,
    invitedBy: string,
    role: string,
    inviteToken: string
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId: invitedUserId,
      type: 'workflow.member_invited',
      title: 'Data Room Invitation',
      body: `You've been invited to ${dataRoomName} as ${role}.`,
      priority: 'high',
      actionUrl: `/data-room/invite/${inviteToken}`,
      data: {
        data_room_name: dataRoomName,
        invited_by: invitedBy,
        role
      }
    })
  }
}
