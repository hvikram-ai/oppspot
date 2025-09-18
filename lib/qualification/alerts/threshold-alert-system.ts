import { createClient } from '@/lib/supabase/server'
import { AdvancedAlertConfig, AlertHistory } from '@/types/qualification'

export class ThresholdAlertSystem {
  private supabase: any

  constructor() {
    // Initialize in methods to handle async
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Create or update an alert configuration
   */
  async createAlertConfig(config: Omit<AdvancedAlertConfig, 'id' | 'created_at' | 'updated_at'>): Promise<AdvancedAlertConfig | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('advanced_alert_configs')
        .insert(config)
        .select()
        .single()

      if (error) {
        console.error('Error creating alert config:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createAlertConfig:', error)
      return null
    }
  }

  /**
   * Check if alert should be triggered
   */
  async checkAlertTrigger(leadId: string, alertConfigId: string, currentValue: number): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      // Get alert configuration
      const { data: config, error: configError } = await supabase
        .from('advanced_alert_configs')
        .select('*')
        .eq('id', alertConfigId)
        .single()

      if (configError || !config || !config.is_active) {
        return false
      }

      const triggerConditions = config.trigger_conditions

      // Get previous value if needed for comparison
      let shouldTrigger = false

      switch (triggerConditions.condition) {
        case 'crosses_above':
          const previousAbove = await this.getPreviousValue(leadId, config.alert_type)
          shouldTrigger = previousAbove < triggerConditions.threshold && currentValue >= triggerConditions.threshold
          break

        case 'crosses_below':
          const previousBelow = await this.getPreviousValue(leadId, config.alert_type)
          shouldTrigger = previousBelow > triggerConditions.threshold && currentValue <= triggerConditions.threshold
          break

        case 'equals':
          shouldTrigger = currentValue === triggerConditions.threshold
          break

        case 'changes_by':
          const previousChange = await this.getPreviousValue(leadId, config.alert_type)
          const change = Math.abs(currentValue - previousChange)
          shouldTrigger = change >= triggerConditions.threshold
          break

        default:
          shouldTrigger = false
      }

      // Check sustained duration if required
      if (shouldTrigger && triggerConditions.sustained_duration) {
        shouldTrigger = await this.checkSustainedDuration(
          leadId,
          config.alert_type,
          triggerConditions.threshold,
          triggerConditions.sustained_duration
        )
      }

      return shouldTrigger
    } catch (error) {
      console.error('Error checking alert trigger:', error)
      return false
    }
  }

  /**
   * Trigger an alert and execute configured actions
   */
  async triggerAlert(
    alertConfigId: string,
    leadId: string,
    triggerValue: any
  ): Promise<AlertHistory | null> {
    try {
      const supabase = await this.getSupabase()

      // Get alert configuration
      const { data: config, error: configError } = await supabase
        .from('advanced_alert_configs')
        .select('*')
        .eq('id', alertConfigId)
        .single()

      if (configError || !config) {
        console.error('Alert config not found:', alertConfigId)
        return null
      }

      // Record alert history
      const alertHistory: Omit<AlertHistory, 'id' | 'created_at'> = {
        alert_config_id: alertConfigId,
        lead_id: leadId,
        trigger_type: config.alert_type,
        trigger_value: { value: triggerValue, timestamp: new Date().toISOString() },
        actions_taken: {},
        status: 'triggered'
      }

      // Execute configured actions
      const actions = config.actions
      const actionResults: any = {}

      // Send notifications
      if (actions.notify && actions.notify.length > 0) {
        for (const notification of actions.notify) {
          actionResults[notification.channel] = await this.sendNotification(
            notification,
            leadId,
            config.name,
            triggerValue
          )
        }
      }

      // Update stage if configured
      if (actions.update_stage) {
        actionResults.stage_update = await this.updateLeadStage(leadId, actions.update_stage)
      }

      // Add to campaign if configured
      if (actions.add_to_campaign) {
        actionResults.campaign_add = await this.addToCampaign(leadId, actions.add_to_campaign)
      }

      // Trigger workflow if configured
      if (actions.trigger_workflow) {
        actionResults.workflow_trigger = await this.triggerWorkflow(leadId, actions.trigger_workflow)
      }

      // Call webhook if configured
      if (actions.webhook) {
        actionResults.webhook = await this.callWebhook(actions.webhook, {
          alert_id: alertConfigId,
          lead_id: leadId,
          trigger_value: triggerValue,
          timestamp: new Date().toISOString()
        })
      }

      alertHistory.actions_taken = actionResults

      // Save alert history
      const { data: history, error: historyError } = await supabase
        .from('alert_history')
        .insert(alertHistory)
        .select()
        .single()

      if (historyError) {
        console.error('Error saving alert history:', historyError)
        return null
      }

      return history
    } catch (error) {
      console.error('Error triggering alert:', error)
      return null
    }
  }

  /**
   * Get previous value for comparison
   */
  private async getPreviousValue(leadId: string, alertType: string): Promise<number> {
    try {
      const supabase = await this.getSupabase()

      // Get the latest score based on alert type
      let tableName = 'lead_scores'
      let scoreField = 'overall_score'

      if (alertType.includes('bant')) {
        tableName = 'bant_qualifications'
        scoreField = 'overall_score'
      } else if (alertType.includes('meddic')) {
        tableName = 'meddic_qualifications'
        scoreField = 'overall_score'
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(scoreField)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(2)

      if (error || !data || data.length < 2) {
        return 0
      }

      return data[1][scoreField] || 0
    } catch (error) {
      console.error('Error getting previous value:', error)
      return 0
    }
  }

  /**
   * Check if a condition has been sustained for a duration
   */
  private async checkSustainedDuration(
    leadId: string,
    alertType: string,
    threshold: number,
    durationMinutes: number
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const startTime = new Date(Date.now() - durationMinutes * 60 * 1000)

      // Check if condition has been met consistently
      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .eq('lead_id', leadId)
        .eq('trigger_type', alertType)
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false })

      if (error || !data) {
        return false
      }

      // Check if all recent values meet the threshold
      return data.every((record: any) => {
        const value = record.trigger_value?.value || 0
        return value >= threshold
      })
    } catch (error) {
      console.error('Error checking sustained duration:', error)
      return false
    }
  }

  /**
   * Send notification based on configuration
   */
  private async sendNotification(
    notification: any,
    leadId: string,
    alertName: string,
    triggerValue: any
  ): Promise<any> {
    try {
      const supabase = await this.getSupabase()

      // Create notification record
      const notificationData = {
        user_id: notification.recipients[0], // TODO: Handle multiple recipients
        title: `Alert: ${alertName}`,
        message: `Lead ${leadId} triggered alert with value: ${triggerValue}`,
        type: 'alert',
        priority: 'high',
        metadata: {
          lead_id: leadId,
          alert_name: alertName,
          trigger_value: triggerValue,
          channel: notification.channel
        }
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single()

      if (error) {
        console.error('Error creating notification:', error)
        return { success: false, error: error.message }
      }

      // TODO: Implement actual notification sending (email, SMS, push)
      // based on notification.channel

      return { success: true, notification_id: data.id }
    } catch (error) {
      console.error('Error sending notification:', error)
      return { success: false, error }
    }
  }

  /**
   * Update lead stage
   */
  private async updateLeadStage(leadId: string, newStage: string): Promise<any> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('lead_scores')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, previous_stage: data.stage, new_stage: newStage }
    } catch (error) {
      return { success: false, error }
    }
  }

  /**
   * Add lead to campaign
   */
  private async addToCampaign(leadId: string, campaignId: string): Promise<any> {
    // TODO: Implement campaign integration
    return { success: true, campaign_id: campaignId, message: 'Campaign integration pending' }
  }

  /**
   * Trigger workflow
   */
  private async triggerWorkflow(leadId: string, workflowId: string): Promise<any> {
    // TODO: Implement workflow integration
    return { success: true, workflow_id: workflowId, message: 'Workflow integration pending' }
  }

  /**
   * Call webhook
   */
  private async callWebhook(webhookConfig: any, payload: any): Promise<any> {
    try {
      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      return {
        success: response.ok,
        status: response.status,
        response: result
      }
    } catch (error) {
      console.error('Error calling webhook:', error)
      return { success: false, error }
    }
  }

  /**
   * Get alert configurations
   */
  async getAlertConfigs(orgId?: string, isActive: boolean = true): Promise<AdvancedAlertConfig[]> {
    try {
      const supabase = await this.getSupabase()

      let query = supabase
        .from('advanced_alert_configs')
        .select('*')

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      if (orgId) {
        query = query.eq('org_id', orgId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching alert configs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAlertConfigs:', error)
      return []
    }
  }

  /**
   * Get alert history for a lead
   */
  async getAlertHistory(leadId: string, limit: number = 50): Promise<AlertHistory[]> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching alert history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAlertHistory:', error)
      return []
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertHistoryId: string, userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await supabase
        .from('alert_history')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertHistoryId)

      if (error) {
        console.error('Error acknowledging alert:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in acknowledgeAlert:', error)
      return false
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertHistoryId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await supabase
        .from('alert_history')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertHistoryId)

      if (error) {
        console.error('Error resolving alert:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in resolveAlert:', error)
      return false
    }
  }

  /**
   * Update alert configuration
   */
  async updateAlertConfig(
    configId: string,
    updates: Partial<AdvancedAlertConfig>
  ): Promise<AdvancedAlertConfig | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('advanced_alert_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)
        .select()
        .single()

      if (error) {
        console.error('Error updating alert config:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in updateAlertConfig:', error)
      return null
    }
  }

  /**
   * Delete alert configuration
   */
  async deleteAlertConfig(configId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await supabase
        .from('advanced_alert_configs')
        .delete()
        .eq('id', configId)

      if (error) {
        console.error('Error deleting alert config:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteAlertConfig:', error)
      return false
    }
  }
}