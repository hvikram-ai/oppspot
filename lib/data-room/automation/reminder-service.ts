/**
 * Reminder Service
 * Checks for approaching deadlines and sends reminder notifications
 * This service should be run as a cron job/background task
 */

import { createClient } from '@/lib/supabase/server'
import { WorkflowNotificationService } from './workflow-notification-service'
import type { ApprovalRequest, WorkflowTask } from '../types'

interface ReminderConfig {
  // Hours before deadline to send reminders
  approvalReminderHours: number[]
  taskReminderHours: number[]

  // Check interval in minutes
  checkIntervalMinutes: number
}

export class ReminderService {
  private notificationService: WorkflowNotificationService
  private config: ReminderConfig

  constructor(config?: Partial<ReminderConfig>) {
    this.notificationService = new WorkflowNotificationService()
    this.config = {
      approvalReminderHours: [24, 4, 1], // Send reminders 24h, 4h, and 1h before expiry
      taskReminderHours: [48, 24, 4], // Send reminders 48h, 24h, and 4h before due date
      checkIntervalMinutes: 15, // Check every 15 minutes
      ...config
    }
  }

  /**
   * Main method to check for upcoming deadlines and send reminders
   * This should be called by a cron job
   */
  async checkAndSendReminders(): Promise<void> {
    console.log('[ReminderService] Checking for upcoming deadlines...')

    try {
      await Promise.all([
        this.checkApprovalReminders(),
        this.checkTaskReminders(),
        this.checkOverdueTasks()
      ])
    } catch (error) {
      console.error('[ReminderService] Error checking reminders:', error)
      throw error
    }
  }

  /**
   * Check for approvals that need reminders
   */
  private async checkApprovalReminders(): Promise<void> {
    const supabase = await createClient()
    const now = new Date()

    // Get all pending approvals with expiry dates
    const { data: approvals, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        workflow_steps!inner(
          workflows!inner(
            data_rooms!inner(name)
          )
        )
      `)
      .is('decision', null)
      .not('expires_at', 'is', null)
      .gt('expires_at', now.toISOString()) as { data: ApprovalRequest[] | null, error: Error | null }

    if (error) {
      console.error('[ReminderService] Error fetching approvals:', error)
      return
    }

    if (!approvals || approvals.length === 0) {
      console.log('[ReminderService] No pending approvals with expiry dates')
      return
    }

    // Check each approval for reminder thresholds
    for (const approval of approvals) {
      const expiresAt = new Date(approval.expires_at!)
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Check if we should send a reminder
      for (const reminderHours of this.config.approvalReminderHours) {
        // Send reminder if we're within the window (±15 minutes)
        const windowMinutes = this.config.checkIntervalMinutes
        if (
          Math.abs(hoursUntilExpiry - reminderHours) <= windowMinutes / 60
        ) {
          await this.sendApprovalReminder(approval, reminderHours)
          break // Only send one reminder per check
        }
      }
    }
  }

  /**
   * Send reminder for an approval
   */
  private async sendApprovalReminder(approval: ApprovalRequest, hoursRemaining: number): Promise<void> {
    // Check if we've already sent a reminder at this threshold
    const reminderKey = `approval:${approval.id}:${hoursRemaining}h`
    if (await this.hasRecentReminder(reminderKey, 12)) {
      console.log(`[ReminderService] Already sent reminder for ${reminderKey}`)
      return
    }

    try {
      // Get data room name from the workflow
      const supabase = await createClient()
      const { data: workflowStep } = await supabase
        .from('workflow_steps')
        .select('workflows!inner(data_rooms!inner(name))')
        .eq('id', approval.workflow_step_id)
        .single() as { data: { workflows: { data_rooms: { name: string } } } | null }

      const dataRoomName = workflowStep?.workflows?.data_rooms?.name || 'Data Room'

      await this.notificationService.notifyApprovalReminder(
        approval,
        dataRoomName,
        hoursRemaining
      )

      // Record that we sent this reminder
      await this.recordReminder(reminderKey)

      console.log(`[ReminderService] Sent approval reminder for ${approval.id} (${hoursRemaining}h remaining)`)
    } catch (error) {
      console.error('[ReminderService] Error sending approval reminder:', error)
    }
  }

  /**
   * Check for tasks that need reminders
   */
  private async checkTaskReminders(): Promise<void> {
    const supabase = await createClient()
    const now = new Date()

    // Get all pending tasks with due dates
    const { data: tasks, error } = await supabase
      .from('workflow_tasks')
      .select(`
        *,
        workflow_steps!inner(
          workflows!inner(
            data_rooms!inner(name)
          )
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .not('due_date', 'is', null)
      .gt('due_date', now.toISOString()) as { data: WorkflowTask[] | null, error: Error | null }

    if (error) {
      console.error('[ReminderService] Error fetching tasks:', error)
      return
    }

    if (!tasks || tasks.length === 0) {
      console.log('[ReminderService] No pending tasks with due dates')
      return
    }

    // Check each task for reminder thresholds
    for (const task of tasks) {
      const dueDate = new Date(task.due_date!)
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Check if we should send a reminder
      for (const reminderHours of this.config.taskReminderHours) {
        const windowMinutes = this.config.checkIntervalMinutes
        if (
          Math.abs(hoursUntilDue - reminderHours) <= windowMinutes / 60
        ) {
          await this.sendTaskReminder(task, reminderHours)
          break // Only send one reminder per check
        }
      }
    }
  }

  /**
   * Send reminder for a task
   */
  private async sendTaskReminder(task: WorkflowTask, hoursRemaining: number): Promise<void> {
    const reminderKey = `task:${task.id}:${hoursRemaining}h`
    if (await this.hasRecentReminder(reminderKey, 12)) {
      console.log(`[ReminderService] Already sent reminder for ${reminderKey}`)
      return
    }

    try {
      // Get data room name from the workflow
      const supabase = await createClient()
      const { data: workflowStep } = await supabase
        .from('workflow_steps')
        .select('workflows!inner(data_rooms!inner(name))')
        .eq('id', task.workflow_step_id)
        .single() as { data: { workflows: { data_rooms: { name: string } } } | null }

      const dataRoomName = workflowStep?.workflows?.data_rooms?.name || 'Data Room'

      await this.notificationService.notifyTaskDueSoon(
        task,
        dataRoomName,
        hoursRemaining
      )

      await this.recordReminder(reminderKey)

      console.log(`[ReminderService] Sent task reminder for ${task.id} (${hoursRemaining}h remaining)`)
    } catch (error) {
      console.error('[ReminderService] Error sending task reminder:', error)
    }
  }

  /**
   * Check for overdue tasks and send overdue notifications
   */
  private async checkOverdueTasks(): Promise<void> {
    const supabase = await createClient()
    const now = new Date()

    // Get all overdue tasks
    const { data: tasks, error } = await supabase
      .from('workflow_tasks')
      .select(`
        *,
        workflow_steps!inner(
          workflows!inner(
            data_rooms!inner(name)
          )
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .not('due_date', 'is', null)
      .lt('due_date', now.toISOString()) as { data: WorkflowTask[] | null, error: Error | null }

    if (error) {
      console.error('[ReminderService] Error fetching overdue tasks:', error)
      return
    }

    if (!tasks || tasks.length === 0) {
      console.log('[ReminderService] No overdue tasks')
      return
    }

    // Send daily overdue notifications
    for (const task of tasks) {
      const dueDate = new Date(task.due_date!)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      // Send overdue notification daily
      const reminderKey = `task:overdue:${task.id}:${daysOverdue}d`
      if (await this.hasRecentReminder(reminderKey, 20)) {
        continue // Already sent today's overdue notification
      }

      try {
        const supabase = await createClient()
        const { data: workflowStep } = await supabase
          .from('workflow_steps')
          .select('workflows!inner(data_rooms!inner(name))')
          .eq('id', task.workflow_step_id)
          .single() as { data: { workflows: { data_rooms: { name: string } } } | null }

        const dataRoomName = workflowStep?.workflows?.data_rooms?.name || 'Data Room'

        await this.notificationService.notifyTaskOverdue(
          task,
          dataRoomName,
          daysOverdue
        )

        await this.recordReminder(reminderKey)

        console.log(`[ReminderService] Sent overdue notification for task ${task.id} (${daysOverdue} days overdue)`)
      } catch (error) {
        console.error('[ReminderService] Error sending overdue notification:', error)
      }
    }
  }

  /**
   * Check for expired approvals and send expiry notifications
   */
  async checkExpiredApprovals(): Promise<void> {
    const supabase = await createClient()
    const now = new Date()

    // Get approvals that expired in the last hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const { data: approvals, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        workflow_steps!inner(
          workflows!inner(
            data_rooms!inner(name)
          )
        )
      `)
      .is('decision', null)
      .not('expires_at', 'is', null)
      .lt('expires_at', now.toISOString())
      .gt('expires_at', oneHourAgo.toISOString()) as { data: ApprovalRequest[] | null, error: Error | null }

    if (error || !approvals || approvals.length === 0) {
      return
    }

    for (const approval of approvals) {
      const reminderKey = `approval:expired:${approval.id}`
      if (await this.hasRecentReminder(reminderKey, 24)) {
        continue // Already sent expiry notification
      }

      try {
        const supabase = await createClient()
        const { data: workflowStep } = await supabase
          .from('workflow_steps')
          .select('workflows!inner(data_rooms!inner(name))')
          .eq('id', approval.workflow_step_id)
          .single() as { data: { workflows: { data_rooms: { name: string } } } | null }

        const dataRoomName = workflowStep?.workflows?.data_rooms?.name || 'Data Room'

        // TODO: Get escalation user from workflow config
        await this.notificationService.notifyApprovalExpired(
          approval,
          dataRoomName
        )

        await this.recordReminder(reminderKey)

        console.log(`[ReminderService] Sent expiry notification for approval ${approval.id}`)
      } catch (error) {
        console.error('[ReminderService] Error sending expiry notification:', error)
      }
    }
  }

  /**
   * Check if a reminder was sent recently
   */
  private async hasRecentReminder(key: string, hoursWindow: number): Promise<boolean> {
    const supabase = await createClient()
    const cutoffTime = new Date(Date.now() - hoursWindow * 60 * 60 * 1000)

    // Note: This requires a reminder_log table
    const { data } = await supabase
      .from('reminder_log')
      .select('id')
      .eq('reminder_key', key)
      .gt('sent_at', cutoffTime.toISOString())
      .limit(1)

    return !!data && data.length > 0
  }

  /**
   * Record that a reminder was sent
   */
  private async recordReminder(key: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('reminder_log')
      .insert({
        reminder_key: key,
        sent_at: new Date().toISOString()
      })
  }
}

// Export a singleton instance
export const reminderService = new ReminderService()
