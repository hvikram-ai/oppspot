/**
 * Workflow Automation Service
 * Handles event-driven workflow triggers and auto-assignment rules
 */

import { createClient } from '@/lib/supabase/server'
import { WorkflowNotificationService } from './workflow-notification-service'
import type {
  Workflow,
  WorkflowStep,
  WorkflowTask,
  ApprovalRequest,
  WorkflowTemplate
} from '../types'
import type { WorkflowEvent, DocumentUploadedEvent } from './workflow-event-types'

// Auto-assignment rule types
export interface AutoAssignmentRule {
  id: string
  data_room_id: string
  rule_type: 'round_robin' | 'load_balanced' | 'role_based' | 'document_type' | 'manual'
  conditions: {
    document_types?: string[]
    step_types?: string[]
    roles?: string[]
    priority_levels?: string[]
  }
  assignment_config: {
    user_ids?: string[]
    role?: string
    max_concurrent_tasks?: number
  }
  is_active: boolean
  created_at: string
}

export class WorkflowAutomationService {
  private notificationService: WorkflowNotificationService

  constructor() {
    this.notificationService = new WorkflowNotificationService()
  }

  /**
   * Handle workflow events and trigger automation
   */
  async handleEvent(event: WorkflowEvent): Promise<void> {
    console.log(`[WorkflowAutomation] Handling event: ${event.type}`)

    try {
      switch (event.type) {
        case 'document.uploaded':
          await this.handleDocumentUploaded(event as DocumentUploadedEvent)
          break
        case 'document.analyzed':
          await this.handleDocumentAnalyzed(event)
          break
        case 'workflow.step.completed':
          await this.handleWorkflowStepCompleted(event)
          break
        case 'approval.approved':
        case 'approval.rejected':
        case 'approval.needs_changes':
          await this.handleApprovalDecision(event)
          break
        case 'task.completed':
          await this.handleTaskCompleted(event)
          break
        default:
          console.log(`[WorkflowAutomation] No automation for event type: ${event.type}`)
      }
    } catch (error) {
      console.error(`[WorkflowAutomation] Error handling event ${event.type}:`, error)
      throw error
    }
  }

  /**
   * Handle document uploaded event
   * Triggers workflows configured for auto-start on document upload
   */
  private async handleDocumentUploaded(event: DocumentUploadedEvent): Promise<void> {
    const supabase = await createClient()

    // Find workflows configured to auto-start on document upload
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('data_room_id', event.data_room_id)
      .eq('status', 'draft')
      .contains('config', { auto_start: true }) as { data: Workflow[] | null, error: Error | null }

    if (error || !workflows || workflows.length === 0) {
      return
    }

    for (const workflow of workflows) {
      // Check if workflow should start based on document type
      const config = workflow.config as { trigger_on_document_types?: string[] }
      if (config.trigger_on_document_types) {
        if (!config.trigger_on_document_types.includes(event.metadata.document_type)) {
          continue // Skip this workflow
        }
      }

      // Start the workflow
      await this.startWorkflow(workflow.id, event.actor_id)
    }
  }

  /**
   * Handle document analyzed event
   * Can trigger workflows based on document classification
   */
  private async handleDocumentAnalyzed(event: WorkflowEvent): Promise<void> {
    // Similar to document uploaded, but based on AI classification
    console.log('[WorkflowAutomation] Document analyzed, checking for triggers...')
    // TODO: Implement document type-based workflow triggers
  }

  /**
   * Handle workflow step completed event
   * Automatically progresses to next step if configured
   */
  private async handleWorkflowStepCompleted(event: WorkflowEvent): Promise<void> {
    const supabase = await createClient()
    const { workflow_id, next_step_id } = event.metadata as { workflow_id: string; next_step_id: string | null }

    if (!next_step_id) {
      // This was the last step - complete the workflow
      await this.completeWorkflow(workflow_id)
      return
    }

    // Get the next step
    const { data: nextStep } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('id', next_step_id)
      .single() as { data: WorkflowStep | null }

    if (!nextStep) {
      console.error('[WorkflowAutomation] Next step not found:', next_step_id)
      return
    }

    // Start the next step
    await this.startWorkflowStep(nextStep)
  }

  /**
   * Handle approval decision
   * Progresses workflow based on decision
   */
  private async handleApprovalDecision(event: WorkflowEvent): Promise<void> {
    const { approval_id, workflow_step_id, decision } = event.metadata as {
      approval_id: string
      workflow_step_id: string
      decision: string
    }

    if (decision === 'approved') {
      // Mark step as completed
      await this.completeWorkflowStep(workflow_step_id)
    } else if (decision === 'rejected') {
      // Mark step as failed
      const supabase = await createClient()
      await supabase
        .from('workflow_steps')
        .update({ status: 'failed' })
        .eq('id', workflow_step_id)
    } else if (decision === 'needs_changes') {
      // Keep step in progress, notify requester
      console.log('[WorkflowAutomation] Approval needs changes, waiting for resubmission')
    }
  }

  /**
   * Handle task completed
   * Checks if workflow step can be completed
   */
  private async handleTaskCompleted(event: WorkflowEvent): Promise<void> {
    const { workflow_step_id } = event.metadata as { workflow_step_id: string }
    const supabase = await createClient()

    // Check if all tasks for this step are completed
    const { data: pendingTasks } = await supabase
      .from('workflow_tasks')
      .select('id')
      .eq('workflow_step_id', workflow_step_id)
      .neq('status', 'completed')
      .limit(1)

    if (!pendingTasks || pendingTasks.length === 0) {
      // All tasks completed - complete the step
      await this.completeWorkflowStep(workflow_step_id)
    }
  }

  /**
   * Start a workflow
   */
  async startWorkflow(workflowId: string, startedBy: string): Promise<void> {
    const supabase = await createClient()

    // Update workflow status
    await supabase
      .from('workflows')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', workflowId)

    // Get first step
    const { data: firstStep } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .is('depends_on_step_id', null)
      .order('step_order')
      .limit(1)
      .single() as { data: WorkflowStep | null }

    if (firstStep) {
      await this.startWorkflowStep(firstStep)
    }

    // Send notifications to participants
    const { data: workflow } = await supabase
      .from('workflows')
      .select('name, data_room_id, data_rooms!inner(name)')
      .eq('id', workflowId)
      .single() as { data: { name: string; data_room_id: string; data_rooms: { name: string } } | null }

    if (workflow) {
      // Get all assigned users from workflow steps
      const { data: steps } = await supabase
        .from('workflow_steps')
        .select('assigned_to')
        .eq('workflow_id', workflowId) as { data: { assigned_to: string[] }[] | null }

      const participantIds = new Set<string>()
      if (steps) {
        steps.forEach(step => {
          step.assigned_to.forEach(userId => participantIds.add(userId))
        })
      }

      await this.notificationService.notifyWorkflowStarted(
        workflowId,
        workflow.name,
        workflow.data_rooms.name,
        Array.from(participantIds)
      )
    }
  }

  /**
   * Start a workflow step
   */
  private async startWorkflowStep(step: WorkflowStep): Promise<void> {
    const supabase = await createClient()

    // Update step status
    await supabase
      .from('workflow_steps')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', step.id)

    // Create tasks/approvals based on step type
    switch (step.step_type) {
      case 'approval':
        await this.createApprovalRequests(step)
        break
      case 'task':
        await this.createTasks(step)
        break
      case 'review':
        // Create review tasks
        await this.createReviewTasks(step)
        break
      case 'checklist':
        // Checklist is managed separately
        break
      case 'notification':
        // Send notifications
        await this.sendStepNotifications(step)
        // Auto-complete notification steps
        await this.completeWorkflowStep(step.id)
        break
    }
  }

  /**
   * Complete a workflow step
   */
  private async completeWorkflowStep(stepId: string): Promise<void> {
    const supabase = await createClient()

    // Update step status
    await supabase
      .from('workflow_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', stepId)

    // Get workflow and next step
    const { data: step } = await supabase
      .from('workflow_steps')
      .select('workflow_id, step_order')
      .eq('id', stepId)
      .single() as { data: { workflow_id: string; step_order: number } | null }

    if (!step) return

    // Find next step
    const { data: nextStep } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', step.workflow_id)
      .eq('depends_on_step_id', stepId)
      .order('step_order')
      .limit(1)
      .single() as { data: WorkflowStep | null }

    if (nextStep) {
      // Start next step
      await this.startWorkflowStep(nextStep)
    } else {
      // Check if all steps are completed
      const { data: pendingSteps } = await supabase
        .from('workflow_steps')
        .select('id')
        .eq('workflow_id', step.workflow_id)
        .neq('status', 'completed')
        .limit(1)

      if (!pendingSteps || pendingSteps.length === 0) {
        // All steps completed - complete workflow
        await this.completeWorkflow(step.workflow_id)
      }
    }
  }

  /**
   * Complete a workflow
   */
  private async completeWorkflow(workflowId: string): Promise<void> {
    const supabase = await createClient()

    // Update workflow status
    await supabase
      .from('workflows')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId)

    // Send completion notifications
    const { data: workflow } = await supabase
      .from('workflows')
      .select('name, data_room_id, data_rooms!inner(name)')
      .eq('id', workflowId)
      .single() as { data: { name: string; data_room_id: string; data_rooms: { name: string } } | null }

    if (workflow) {
      // Get all participants
      const { data: steps } = await supabase
        .from('workflow_steps')
        .select('assigned_to')
        .eq('workflow_id', workflowId) as { data: { assigned_to: string[] }[] | null }

      const participantIds = new Set<string>()
      if (steps) {
        steps.forEach(step => {
          step.assigned_to.forEach(userId => participantIds.add(userId))
        })
      }

      await this.notificationService.notifyWorkflowCompleted(
        workflowId,
        workflow.name,
        workflow.data_rooms.name,
        Array.from(participantIds)
      )
    }
  }

  /**
   * Create approval requests for a step
   */
  private async createApprovalRequests(step: WorkflowStep): Promise<void> {
    const supabase = await createClient()

    // Get workflow and data room info
    const { data: workflow } = await supabase
      .from('workflows')
      .select('data_rooms!inner(name), created_by')
      .eq('id', step.workflow_id)
      .single() as { data: { data_rooms: { name: string }; created_by: string } | null }

    if (!workflow) return

    // Calculate expiry date if configured
    const config = step.config as { auto_approve_timeout_hours?: number }
    let expiresAt: string | null = null
    if (config.auto_approve_timeout_hours) {
      const expiry = new Date()
      expiry.setHours(expiry.getHours() + config.auto_approve_timeout_hours)
      expiresAt = expiry.toISOString()
    }

    // Create approval request for each assigned user
    for (const userId of step.assigned_to) {
      const { data: approval } = await supabase
        .from('approval_requests')
        .insert({
          workflow_step_id: step.id,
          title: step.name,
          description: step.description,
          requested_from: userId,
          requested_by: workflow.created_by,
          expires_at: expiresAt
        })
        .select()
        .single() as { data: ApprovalRequest | null }

      if (approval) {
        // Send notification
        await this.notificationService.notifyApprovalRequested(
          approval,
          workflow.data_rooms.name
        )
      }
    }
  }

  /**
   * Create tasks for a step
   */
  private async createTasks(step: WorkflowStep): Promise<void> {
    const supabase = await createClient()

    // Get workflow and data room info
    const { data: workflow } = await supabase
      .from('workflows')
      .select('data_rooms!inner(name), created_by')
      .eq('id', step.workflow_id)
      .single() as { data: { data_rooms: { name: string }; created_by: string } | null }

    if (!workflow) return

    // Auto-assign tasks based on rules
    const assignedUsers = await this.autoAssignTasks(step)

    // Create task for each assigned user
    for (const userId of assignedUsers) {
      const { data: task } = await supabase
        .from('workflow_tasks')
        .insert({
          workflow_step_id: step.id,
          title: step.name,
          description: step.description,
          assigned_to: userId,
          assigned_by: workflow.created_by,
          status: 'pending',
          priority: 'medium',
          due_date: step.due_date
        })
        .select()
        .single() as { data: WorkflowTask | null }

      if (task) {
        // Send notification
        await this.notificationService.notifyTaskAssigned(
          task,
          workflow.data_rooms.name
        )
      }
    }
  }

  /**
   * Create review tasks
   */
  private async createReviewTasks(step: WorkflowStep): Promise<void> {
    // Similar to createTasks but specific to review workflows
    await this.createTasks(step)
  }

  /**
   * Send step notifications
   */
  private async sendStepNotifications(step: WorkflowStep): Promise<void> {
    console.log(`[WorkflowAutomation] Sending notifications for step: ${step.name}`)
    // Notification step - just sends notifications, no tasks/approvals
  }

  /**
   * Auto-assign tasks based on assignment rules
   */
  private async autoAssignTasks(step: WorkflowStep): Promise<string[]> {
    const supabase = await createClient()

    // Get auto-assignment rules for this data room
    const { data: workflow } = await supabase
      .from('workflows')
      .select('data_room_id')
      .eq('id', step.workflow_id)
      .single() as { data: { data_room_id: string } | null }

    if (!workflow) return step.assigned_to

    const { data: rules } = await supabase
      .from('auto_assignment_rules')
      .select('*')
      .eq('data_room_id', workflow.data_room_id)
      .eq('is_active', true) as { data: AutoAssignmentRule[] | null }

    if (!rules || rules.length === 0) {
      // No rules - use step's assigned_to
      return step.assigned_to
    }

    // Find matching rule
    const matchingRule = rules.find(rule => {
      const conditions = rule.conditions
      if (conditions.step_types && !conditions.step_types.includes(step.step_type)) {
        return false
      }
      return true
    })

    if (!matchingRule) {
      return step.assigned_to
    }

    // Apply assignment rule
    return this.applyAssignmentRule(matchingRule, step)
  }

  /**
   * Apply assignment rule to determine who gets assigned
   */
  private async applyAssignmentRule(
    rule: AutoAssignmentRule,
    step: WorkflowStep
  ): Promise<string[]> {
    const config = rule.assignment_config

    switch (rule.rule_type) {
      case 'role_based':
        // Assign to users with specific role
        return await this.getUsersByRole(step.workflow_id, config.role!)

      case 'round_robin':
        // Assign to next user in rotation
        return await this.getRoundRobinUser(config.user_ids!)

      case 'load_balanced':
        // Assign to user with least active tasks
        return await this.getLoadBalancedUser(config.user_ids!)

      case 'manual':
      default:
        // Use step's assigned_to
        return step.assigned_to
    }
  }

  /**
   * Get users by role in data room
   */
  private async getUsersByRole(workflowId: string, role: string): Promise<string[]> {
    const supabase = await createClient()

    const { data: workflow } = await supabase
      .from('workflows')
      .select('data_room_id')
      .eq('id', workflowId)
      .single() as { data: { data_room_id: string } | null }

    if (!workflow) return []

    const { data: access } = await supabase
      .from('data_room_access')
      .select('user_id')
      .eq('data_room_id', workflow.data_room_id)
      .eq('role', role) as { data: { user_id: string }[] | null }

    return access ? access.map(a => a.user_id) : []
  }

  /**
   * Get next user in round-robin rotation
   */
  private async getRoundRobinUser(userIds: string[]): Promise<string[]> {
    // TODO: Implement round-robin tracking
    // For now, return first user
    return [userIds[0]]
  }

  /**
   * Get user with least active tasks (load balancing)
   */
  private async getLoadBalancedUser(userIds: string[]): Promise<string[]> {
    const supabase = await createClient()

    // Count active tasks for each user
    const taskCounts = await Promise.all(
      userIds.map(async (userId) => {
        const { count } = await supabase
          .from('workflow_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .in('status', ['pending', 'in_progress'])

        return { userId, count: count || 0 }
      })
    )

    // Find user with minimum tasks
    const minUser = taskCounts.reduce((min, user) =>
      user.count < min.count ? user : min
    )

    return [minUser.userId]
  }
}

// Export singleton instance
export const workflowAutomationService = new WorkflowAutomationService()
