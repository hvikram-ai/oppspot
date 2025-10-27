/**
 * Alert Service
 * Manages creation, tracking, and delivery of system alerts
 */

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { getSlackNotifier } from '@/lib/notifications/slack-notifier'
import { getWebhookNotifier } from '@/lib/notifications/webhook-notifier'
import { getSmsNotifier } from '@/lib/notifications/sms-notifier'
import type { Database } from '@/types/database'

// Database table type aliases
type SystemAlertRow = Database['public']['Tables']['system_alerts']['Row']
type SystemAlertInsert = Database['public']['Tables']['system_alerts']['Insert']
type SystemAlertUpdate = Database['public']['Tables']['system_alerts']['Update']
type AlertConfigurationRow = Database['public']['Tables']['alert_configurations']['Row']
type AlertHistoryInsert = Database['public']['Tables']['alert_history']['Insert']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type AlertSeverity = 'P0' | 'P1' | 'P2' | 'P3'
export type AlertCategory =
  | 'database_failure'
  | 'api_failure'
  | 'external_service_failure'
  | 'auth_failure'
  | 'data_integrity'
  | 'performance_degradation'
  | 'security_incident'
  | 'rate_limit_exceeded'
  | 'job_failure'
  | 'custom'

export type AlertStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive'

export interface TriggerAlertParams {
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string
  sourceService: string
  sourceEndpoint?: string
  sourceMethod?: string
  errorStack?: string
  context?: Record<string, unknown>
  affectedUsers?: string[]
  tags?: string[]
  runbookUrl?: string
}

export interface SystemAlert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string
  errorStack?: string
  context: Record<string, unknown>
  sourceService: string
  sourceEndpoint?: string
  sourceMethod?: string
  affectedUsers?: string[]
  status: AlertStatus
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string
  channelsNotified: string[]
  notificationSentAt?: string
  notificationFailed: boolean
  notificationError?: string
  fingerprint?: string
  occurrenceCount: number
  firstOccurredAt: string
  lastOccurredAt: string
  tags: string[]
  relatedAlertIds?: string[]
  runbookUrl?: string
  createdAt: string
  updatedAt: string
}

/**
 * Alert Service for managing system alerts
 */
export class AlertService {
  private deduplicationCache = new Map<string, { count: number; lastSeen: Date }>()

  /**
   * Trigger a new system alert
   */
  async triggerAlert(params: TriggerAlertParams): Promise<SystemAlert | null> {
    try {
      const supabase = await createClient()

      // Generate fingerprint for deduplication
      const fingerprint = this.generateFingerprint(params)

      // Check for recent duplicate alerts
      const isDuplicate = await this.checkDuplicate(fingerprint)
      if (isDuplicate) {
        console.log('[AlertService] Duplicate alert suppressed:', fingerprint)
        return null
      }

      // Create the alert
      const insertData: SystemAlertInsert = {
        severity: params.severity,
        category: params.category,
        title: params.title,
        message: params.message,
        error_stack: params.errorStack,
        context: (params.context || {}) as Database['public']['Tables']['system_alerts']['Insert']['context'],
        source_service: params.sourceService,
        source_endpoint: params.sourceEndpoint,
        source_method: params.sourceMethod,
        affected_users: params.affectedUsers || [],
        fingerprint,
        tags: params.tags || [],
        runbook_url: params.runbookUrl,
        status: 'open',
        occurrence_count: 1,
        first_occurred_at: new Date().toISOString(),
        last_occurred_at: new Date().toISOString(),
      }

      const { data: alert, error } = await supabase
        .from('system_alerts')
        .insert(insertData as never)
        .select()
        .returns<SystemAlertRow[]>()
        .single()

      if (error) {
        console.error('[AlertService] Failed to create alert:', error)
        return null
      }

      // Record in history
      await this.recordHistory(alert.id, 'created', null, alert as unknown as Record<string, unknown>)

      // Send notifications
      await this.sendNotifications(alert as unknown as Record<string, unknown>)

      return this.mapToSystemAlert(alert as unknown as Record<string, unknown>)
    } catch (error) {
      console.error('[AlertService] Error triggering alert:', error)
      return null
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string, notes?: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const updateData: SystemAlertUpdate = {
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      }

      const { data: alert, error } = await supabase
        .from('system_alerts')
        .update(updateData as never)
        .eq('id', alertId)
        .select()
        .returns<SystemAlertRow[]>()
        .single()

      if (error) {
        console.error('[AlertService] Failed to acknowledge alert:', error)
        return false
      }

      await this.recordHistory(alertId, 'acknowledged', null, alert as unknown as Record<string, unknown>, userId, notes)
      return true
    } catch (error) {
      console.error('[AlertService] Error acknowledging alert:', error)
      return false
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    userId: string,
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      const updateData: SystemAlertUpdate = {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolution_notes: resolutionNotes,
      }

      const { data: alert, error } = await supabase
        .from('system_alerts')
        .update(updateData as never)
        .eq('id', alertId)
        .select()
        .returns<SystemAlertRow[]>()
        .single()

      if (error) {
        console.error('[AlertService] Failed to resolve alert:', error)
        return false
      }

      await this.recordHistory(alertId, 'resolved', null, alert as unknown as Record<string, unknown>, userId, resolutionNotes)

      // Send Slack resolution notification
      const slackNotifier = getSlackNotifier()
      const isConfigured = await slackNotifier.isConfigured()

      if (isConfigured) {
        // Get user's name for Slack notification
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single() as { data: { full_name: string | null; email: string | null } | null }

        const resolvedBy = profile?.full_name || profile?.email || 'Admin'

        const slackAlert = {
          id: alert.id as string,
          severity: alert.severity as 'P0' | 'P1' | 'P2' | 'P3',
          category: alert.category as string,
          title: alert.title as string,
          message: alert.message as string,
          sourceService: alert.source_service as string,
          occurrenceCount: alert.occurrence_count as number,
          createdAt: new Date(alert.created_at as string),
        }

        await slackNotifier.sendResolution(slackAlert, resolvedBy, resolutionNotes)
      }

      return true
    } catch (error) {
      console.error('[AlertService] Error resolving alert:', error)
      return false
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(severity?: AlertSeverity): Promise<SystemAlert[]> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('system_alerts')
        .select('*')
        .in('status', ['open', 'acknowledged', 'investigating'])
        .order('created_at', { ascending: false })

      if (severity) {
        query = query.eq('severity', severity)
      }

      const { data, error } = await query.returns<SystemAlertRow[]>()

      if (error) {
        console.error('[AlertService] Failed to fetch alerts:', error)
        return []
      }

      return (data || []).map(this.mapToSystemAlert)
    } catch (error) {
      console.error('[AlertService] Error fetching alerts:', error)
      return []
    }
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId: string): Promise<SystemAlert | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('id', alertId)
        .returns<SystemAlertRow[]>()
        .single()

      if (error) {
        console.error('[AlertService] Failed to fetch alert:', error)
        return null
      }

      return this.mapToSystemAlert(data as unknown as Record<string, unknown>)
    } catch (error) {
      console.error('[AlertService] Error fetching alert:', error)
      return null
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(timeWindow: '1h' | '24h' | '7d' = '24h'): Promise<{
    total: number
    byStatus: Record<AlertStatus, number>
    bySeverity: Record<AlertSeverity, number>
    byCategory: Record<AlertCategory, number>
  }> {
    try {
      const supabase = await createClient()

      const hours = timeWindow === '1h' ? 1 : timeWindow === '24h' ? 24 : 168
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('system_alerts')
        .select('status, severity, category')
        .gte('created_at', since)
        .returns<Pick<SystemAlertRow, 'status' | 'severity' | 'category'>[]>()

      if (error || !data) {
        return {
          total: 0,
          byStatus: {} as Record<AlertStatus, number>,
          bySeverity: {} as Record<AlertSeverity, number>,
          byCategory: {} as Record<AlertCategory, number>,
        }
      }

      const stats = {
        total: data.length,
        byStatus: {} as Record<AlertStatus, number>,
        bySeverity: {} as Record<AlertSeverity, number>,
        byCategory: {} as Record<AlertCategory, number>,
      }

      data.forEach((alert) => {
        stats.byStatus[alert.status as AlertStatus] =
          (stats.byStatus[alert.status as AlertStatus] || 0) + 1
        stats.bySeverity[alert.severity as AlertSeverity] =
          (stats.bySeverity[alert.severity as AlertSeverity] || 0) + 1
        stats.byCategory[alert.category as AlertCategory] =
          (stats.byCategory[alert.category as AlertCategory] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('[AlertService] Error fetching stats:', error)
      return {
        total: 0,
        byStatus: {} as Record<AlertStatus, number>,
        bySeverity: {} as Record<AlertSeverity, number>,
        byCategory: {} as Record<AlertCategory, number>,
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Generate fingerprint for deduplication
   */
  private generateFingerprint(params: TriggerAlertParams): string {
    const key = `${params.category}:${params.sourceService}:${params.sourceEndpoint}:${params.message}`
    return createHash('sha256').update(key).digest('hex').substring(0, 16)
  }

  /**
   * Check if this is a duplicate alert within the deduplication window
   */
  private async checkDuplicate(fingerprint: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Check database for recent alerts with same fingerprint (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('system_alerts')
        .select('id, occurrence_count')
        .eq('fingerprint', fingerprint)
        .gte('last_occurred_at', fiveMinutesAgo)
        .returns<Pick<SystemAlertRow, 'id' | 'occurrence_count'>[]>()
        .single()

      if (error || !data) {
        return false
      }

      // Update occurrence count
      const updateOccurrence: SystemAlertUpdate = {
        occurrence_count: data.occurrence_count + 1,
        last_occurred_at: new Date().toISOString(),
      }

      await supabase
        .from('system_alerts')
        .update(updateOccurrence as never)
        .eq('id', data.id)

      return true
    } catch {
      return false
    }
  }

  /**
   * Send notifications via configured channels
   */
  private async sendNotifications(alert: Record<string, unknown>): Promise<void> {
    try {
      // Get alert configuration
      const config = await this.getAlertConfig()
      const channels: string[] = []

      // Send email notifications
      if (config.email?.enabled) {
        const emailSent = await this.sendEmailAlert(alert, config.email)
        if (emailSent) {
          channels.push('email')
        }
      }

      // Send Slack notifications
      if (config.slack?.enabled) {
        const slackSent = await this.sendSlackAlert(alert)
        if (slackSent) {
          channels.push('slack')
        }
      }

      // Send webhook notifications
      if (config.webhook?.enabled) {
        const webhookSent = await this.sendWebhookAlert(alert)
        if (webhookSent) {
          channels.push('webhook')
        }
      }

      // Send SMS notifications
      if (config.sms?.enabled) {
        const smsSent = await this.sendSmsAlert(alert)
        if (smsSent) {
          channels.push('sms')
        }
      }

      // Update alert with notification status
      const supabase = await createClient()
      const updateNotification: SystemAlertUpdate = {
        channels_notified: channels,
        notification_sent_at: new Date().toISOString(),
        notification_failed: channels.length === 0,
      }

      await supabase
        .from('system_alerts')
        .update(updateNotification as never)
        .eq('id', alert.id as string)
    } catch (error) {
      console.error('[AlertService] Failed to send notifications:', error)
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    alert: Record<string, unknown>,
    emailConfig: { from: string; admin_emails: string[] }
  ): Promise<boolean> {
    try {
      // TODO: Implement email sending via Resend
      // For now, just log
      console.log('[AlertService] Would send email alert to:', emailConfig.admin_emails)
      console.log('[AlertService] Alert:', alert)
      return true
    } catch (error) {
      console.error('[AlertService] Email send failed:', error)
      return false
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Record<string, unknown>): Promise<boolean> {
    try {
      const slackNotifier = getSlackNotifier()

      // Check if Slack is configured
      const isConfigured = await slackNotifier.isConfigured()
      if (!isConfigured) {
        console.log('[AlertService] Slack notifications not configured')
        return false
      }

      // Transform alert to SlackAlert format
      const slackAlert = {
        id: alert.id as string,
        severity: alert.severity as 'P0' | 'P1' | 'P2' | 'P3',
        category: alert.category as string,
        title: alert.title as string,
        message: alert.message as string,
        sourceService: alert.source_service as string,
        occurrenceCount: alert.occurrence_count as number,
        createdAt: new Date(alert.created_at as string),
      }

      const success = await slackNotifier.sendAlert(slackAlert)

      if (success) {
        console.log('[AlertService] Slack notification sent:', alert.id)
      } else {
        console.error('[AlertService] Slack notification failed:', alert.id)
      }

      return success
    } catch (error) {
      console.error('[AlertService] Slack send failed:', error)
      return false
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Record<string, unknown>): Promise<boolean> {
    try {
      const webhookNotifier = getWebhookNotifier()

      // Check if webhooks are configured
      const isConfigured = await webhookNotifier.isConfigured()
      if (!isConfigured) {
        console.log('[AlertService] Webhook notifications not configured')
        return false
      }

      // Transform alert to WebhookAlert format
      const webhookAlert = {
        id: alert.id as string,
        severity: alert.severity as 'P0' | 'P1' | 'P2' | 'P3',
        category: alert.category as string,
        title: alert.title as string,
        message: alert.message as string,
        sourceService: alert.source_service as string,
        occurrenceCount: alert.occurrence_count as number,
        createdAt: new Date(alert.created_at as string),
        status: alert.status as string,
      }

      const success = await webhookNotifier.sendAlert(webhookAlert)

      if (success) {
        console.log('[AlertService] Webhook notification sent:', alert.id)
      } else {
        console.error('[AlertService] Webhook notification failed:', alert.id)
      }

      return success
    } catch (error) {
      console.error('[AlertService] Webhook send failed:', error)
      return false
    }
  }

  /**
   * Send SMS alert
   */
  private async sendSmsAlert(alert: Record<string, unknown>): Promise<boolean> {
    try {
      const smsNotifier = getSmsNotifier()

      // Check if SMS is configured
      const isConfigured = await smsNotifier.isConfigured()
      if (!isConfigured) {
        console.log('[AlertService] SMS notifications not configured')
        return false
      }

      // Transform alert to SmsAlert format
      const smsAlert = {
        id: alert.id as string,
        severity: alert.severity as 'P0' | 'P1' | 'P2' | 'P3',
        title: alert.title as string,
        message: alert.message as string,
        sourceService: alert.source_service as string,
        createdAt: new Date(alert.created_at as string),
      }

      const success = await smsNotifier.sendAlert(smsAlert)

      if (success) {
        console.log('[AlertService] SMS notification sent:', alert.id)
      } else {
        console.error('[AlertService] SMS notification failed:', alert.id)
      }

      return success
    } catch (error) {
      console.error('[AlertService] SMS send failed:', error)
      return false
    }
  }

  /**
   * Get alert configuration
   */
  private async getAlertConfig(): Promise<{
    email?: { enabled: boolean; from: string; admin_emails: string[] }
    slack?: { enabled: boolean; webhook_url: string; channel: string }
    webhook?: { enabled: boolean; url: string }
    sms?: { enabled: boolean; phone_numbers: string[] }
  }> {
    try {
      const supabase = await createClient()

      const { data } = await supabase
        .from('alert_configurations')
        .select('config_key, config_value')
        .in('config_key', ['email_settings', 'slack_settings'])
        .returns<Pick<AlertConfigurationRow, 'config_key' | 'config_value'>[]>()

      if (!data) {
        return {}
      }

      const config: Record<string, unknown> = {}
      data.forEach((row) => {
        config[row.config_key] = row.config_value
      })

      return {
        email: config.email_settings as { enabled: boolean; from: string; admin_emails: string[] },
        slack: config.slack_settings as { enabled: boolean; webhook_url: string; channel: string },
        webhook: config.webhook_settings as { enabled: boolean; url: string },
        sms: config.sms_settings as { enabled: boolean; phone_numbers: string[] },
      }
    } catch (error) {
      console.error('[AlertService] Failed to fetch config:', error)
      return {}
    }
  }

  /**
   * Record alert history
   */
  private async recordHistory(
    alertId: string,
    action: string,
    previousState: Record<string, unknown> | null,
    newState: Record<string, unknown>,
    actorId?: string,
    notes?: string
  ): Promise<void> {
    try {
      const supabase = await createClient()

      const historyData: AlertHistoryInsert = {
        alert_id: alertId,
        action,
        actor_id: actorId,
        previous_state: previousState as unknown as Database['public']['Tables']['alert_history']['Insert']['previous_state'],
        new_state: newState as unknown as Database['public']['Tables']['alert_history']['Insert']['new_state'],
        notes,
      }

      await supabase.from('alert_history').insert(historyData as never)
    } catch (error) {
      console.error('[AlertService] Failed to record history:', error)
    }
  }

  /**
   * Map database row to SystemAlert type
   */
  private mapToSystemAlert(data: Record<string, unknown>): SystemAlert {
    return {
      id: data.id as string,
      severity: data.severity as AlertSeverity,
      category: data.category as AlertCategory,
      title: data.title as string,
      message: data.message as string,
      errorStack: data.error_stack as string | undefined,
      context: (data.context as Record<string, unknown>) || {},
      sourceService: data.source_service as string,
      sourceEndpoint: data.source_endpoint as string | undefined,
      sourceMethod: data.source_method as string | undefined,
      affectedUsers: data.affected_users as string[] | undefined,
      status: data.status as AlertStatus,
      acknowledgedAt: data.acknowledged_at as string | undefined,
      acknowledgedBy: data.acknowledged_by as string | undefined,
      resolvedAt: data.resolved_at as string | undefined,
      resolvedBy: data.resolved_by as string | undefined,
      resolutionNotes: data.resolution_notes as string | undefined,
      channelsNotified: (data.channels_notified as string[]) || [],
      notificationSentAt: data.notification_sent_at as string | undefined,
      notificationFailed: (data.notification_failed as boolean) || false,
      notificationError: data.notification_error as string | undefined,
      fingerprint: data.fingerprint as string | undefined,
      occurrenceCount: (data.occurrence_count as number) || 1,
      firstOccurredAt: data.first_occurred_at as string,
      lastOccurredAt: data.last_occurred_at as string,
      tags: (data.tags as string[]) || [],
      relatedAlertIds: data.related_alert_ids as string[] | undefined,
      runbookUrl: data.runbook_url as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    }
  }
}
