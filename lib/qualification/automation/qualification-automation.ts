import { getErrorMessage } from '@/lib/utils/error-handler'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { QualificationService } from '../services/qualification-service'
import { QualificationNotificationService } from '../notifications/qualification-notifications'
import { triggerQualificationWebhook, QualificationWebhookEvent } from '@/app/api/webhooks/qualification/route'
import type { BANTQualification, MEDDICQualification } from '@/types/qualification'

// Context type for automation execution
export interface AutomationContext {
  leadId?: string
  companyId?: string
  userId?: string
  qualificationData?: BANTQualification | MEDDICQualification
  triggeredBy?: string
  [key: string]: unknown
}

// Action configuration types
export interface QualifyActionConfig {
  leadId?: string
  companyId?: string
  framework?: string
  data?: Record<string, unknown>
}

export interface RouteActionConfig {
  leadId?: string
  assignTo: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  sla?: number
}

export interface NotifyActionConfig {
  type?: string
  recipient?: string
  message: string
}

export interface UpdateFieldActionConfig {
  table: string
  field: string
  value: unknown
  recordId?: string
}

export interface CreateTaskActionConfig {
  title: string
  description?: string
  assignTo: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
}

export interface SendEmailActionConfig {
  to: string
  subject: string
  body: string
  template?: string
}

export interface TriggerWebhookActionConfig {
  event: QualificationWebhookEvent
  data?: Record<string, unknown>
}

export interface AddToCampaignActionConfig {
  campaignId: string
  leadId?: string
}

export interface UpdateStageActionConfig {
  stage: string
  leadId?: string
}

export interface CreateChecklistActionConfig {
  framework?: string
  leadId?: string
  templateId?: string
}

export interface RecycleLeadActionConfig {
  leadId?: string
  reason: string
  nurtureCampaign?: string
}

export interface EscalateActionConfig {
  escalateTo: string
  reason: string
  priority?: 'low' | 'medium' | 'high'
}

// Action configuration union type
export type ActionConfig =
  | QualifyActionConfig
  | RouteActionConfig
  | NotifyActionConfig
  | UpdateFieldActionConfig
  | CreateTaskActionConfig
  | SendEmailActionConfig
  | TriggerWebhookActionConfig
  | AddToCampaignActionConfig
  | UpdateStageActionConfig
  | CreateChecklistActionConfig
  | RecycleLeadActionConfig
  | EscalateActionConfig

// Analytics return type
export interface AutomationAnalytics {
  period: '24h' | '7d' | '30d'
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  mostActiveRules: Array<{
    ruleId: string
    count: number
    rule?: AutomationRule
  }>
  averageExecutionsPerDay: number
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  enabled: boolean
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  schedule?: AutomationSchedule
  metadata?: Record<string, unknown>
}

export interface AutomationTrigger {
  type: 'score_change' | 'time_based' | 'event' | 'manual' | 'api'
  config: {
    scoreThreshold?: number
    scoreDirection?: 'increase' | 'decrease' | 'any'
    timeInterval?: string // cron expression
    eventType?: string
    apiEndpoint?: string
  }
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in'
  value: unknown
  logic?: 'AND' | 'OR'
}

export interface AutomationAction {
  type: 'qualify' | 'route' | 'notify' | 'update_field' | 'create_task' |
        'send_email' | 'trigger_webhook' | 'add_to_campaign' | 'update_stage' |
        'create_checklist' | 'recycle_lead' | 'escalate'
  config: ActionConfig
  delay?: number // delay in minutes before executing
}

export interface AutomationSchedule {
  startDate: string
  endDate?: string
  timezone: string
  excludeWeekends?: boolean
  excludeHolidays?: boolean
}

export class QualificationAutomation {
  private supabase: SupabaseClient | null = null
  private qualificationService: QualificationService
  private notificationService: QualificationNotificationService
  private activeRules: Map<string, AutomationRule> = new Map()
  private runningJobs: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.qualificationService = new QualificationService()
    this.notificationService = new QualificationNotificationService()
    this.initialize()
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Initialize automation engine
   */
  private async initialize() {
    await this.loadAutomationRules()
    this.startScheduledJobs()
    this.setupEventListeners()
  }

  /**
   * Load automation rules from database
   */
  private async loadAutomationRules() {
    try {
      const supabase = await this.getSupabase()

      const { data: rules } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('type', 'qualification')
        .eq('enabled', true)

      if (rules) {
        rules.forEach((rule: AutomationRule) => {
          this.activeRules.set(rule.id, rule)
        })
      }

      console.log(`Loaded ${this.activeRules.size} automation rules`)
    } catch (error) {
      console.error('Error loading automation rules:', error)
    }
  }

  /**
   * Create a new automation rule
   */
  async createRule(rule: Omit<AutomationRule, 'id'>): Promise<AutomationRule | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          ...rule,
          type: 'qualification',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Add to active rules if enabled
      if (data.enabled) {
        this.activeRules.set(data.id, data)
        this.startRuleIfScheduled(data)
      }

      return data
    } catch (error) {
      console.error('Error creating automation rule:', error)
      return null
    }
  }

  /**
   * Execute automation rule
   */
  async executeRule(ruleId: string, context: AutomationContext = {}): Promise<boolean> {
    try {
      const rule = this.activeRules.get(ruleId)
      if (!rule || !rule.enabled) {
        return false
      }

      // Check conditions
      if (!await this.checkConditions(rule.conditions, context)) {
        console.log(`Conditions not met for rule: ${rule.name}`)
        return false
      }

      // Execute actions
      for (const action of rule.actions) {
        if (action.delay) {
          setTimeout(() => this.executeAction(action, context), action.delay * 60 * 1000)
        } else {
          await this.executeAction(action, context)
        }
      }

      // Log execution
      await this.logExecution(ruleId, context, true)

      return true
    } catch (error) {
      console.error(`Error executing rule ${ruleId}:`, error)
      await this.logExecution(ruleId, context, false, error)
      return false
    }
  }

  /**
   * Check if conditions are met
   */
  private async checkConditions(conditions: AutomationCondition[], context: AutomationContext): Promise<boolean> {
    if (!conditions || conditions.length === 0) return true

    let result = true
    let logic = 'AND'

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(context, condition.field)
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value)

      if (condition.logic) {
        logic = condition.logic
      }

      if (logic === 'AND') {
        result = result && conditionMet
      } else {
        result = result || conditionMet
      }

      if (logic === 'AND' && !result) break // Short circuit for AND
    }

    return result
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: unknown, operator: string, value: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater_than':
        return fieldValue > value
      case 'less_than':
        return fieldValue < value
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue)
      default:
        return false
    }
  }

  /**
   * Execute an automation action
   */
  private async executeAction(action: AutomationAction, context: AutomationContext): Promise<void> {
    try {
      switch (action.type) {
        case 'qualify':
          await this.executeQualifyAction(action.config as QualifyActionConfig, context)
          break

        case 'route':
          await this.executeRouteAction(action.config as RouteActionConfig, context)
          break

        case 'notify':
          await this.executeNotifyAction(action.config as NotifyActionConfig, context)
          break

        case 'update_field':
          await this.executeUpdateFieldAction(action.config as UpdateFieldActionConfig, context)
          break

        case 'create_task':
          await this.executeCreateTaskAction(action.config as CreateTaskActionConfig, context)
          break

        case 'send_email':
          await this.executeSendEmailAction(action.config as SendEmailActionConfig, context)
          break

        case 'trigger_webhook':
          await this.executeTriggerWebhookAction(action.config as TriggerWebhookActionConfig, context)
          break

        case 'add_to_campaign':
          await this.executeAddToCampaignAction(action.config as AddToCampaignActionConfig, context)
          break

        case 'update_stage':
          await this.executeUpdateStageAction(action.config as UpdateStageActionConfig, context)
          break

        case 'create_checklist':
          await this.executeCreateChecklistAction(action.config as CreateChecklistActionConfig, context)
          break

        case 'recycle_lead':
          await this.executeRecycleLeadAction(action.config as RecycleLeadActionConfig, context)
          break

        case 'escalate':
          await this.executeEscalateAction(action.config as EscalateActionConfig, context)
          break

        default:
          console.warn(`Unknown action type: ${action.type}`)
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error)
    }
  }

  /**
   * Execute qualify action
   */
  private async executeQualifyAction(config: QualifyActionConfig, context: AutomationContext): Promise<void> {
    const { leadId, companyId, framework, data } = config

    await this.qualificationService.qualifyLead(
      leadId || context.leadId,
      companyId || context.companyId,
      framework || 'AUTO',
      data || context.qualificationData
    )
  }

  /**
   * Execute route action
   */
  private async executeRouteAction(config: RouteActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { leadId, assignTo, priority, sla } = config

    await supabase.from('lead_assignments').insert({
      lead_id: leadId || context.leadId,
      assigned_to: assignTo,
      priority: priority || 'medium',
      sla_deadline: sla ? new Date(Date.now() + sla * 60 * 60 * 1000).toISOString() : null,
      status: 'assigned',
      created_at: new Date().toISOString()
    })
  }

  /**
   * Execute notify action
   */
  private async executeNotifyAction(config: NotifyActionConfig, context: AutomationContext): Promise<void> {
    const { type, recipient, message } = config

    await this.notificationService.sendNotification({
      type: type || 'action_required',
      recipient: recipient || context.userId,
      leadId: context.leadId,
      data: {
        actionMessage: message,
        ...context
      }
    })
  }

  /**
   * Execute update field action
   */
  private async executeUpdateFieldAction(config: UpdateFieldActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { table, field, value, recordId } = config

    await supabase
      .from(table)
      .update({ [field]: value })
      .eq('id', recordId || context.leadId)
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(config: CreateTaskActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { title, description, assignTo, dueDate, priority } = config

    await supabase.from('tasks').insert({
      title,
      description,
      assigned_to: assignTo,
      due_date: dueDate,
      priority: priority || 'medium',
      related_to: context.leadId,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  }

  /**
   * Execute send email action
   */
  private async executeSendEmailAction(config: SendEmailActionConfig, context: AutomationContext): Promise<void> {
    // Integration with email service
    console.log('Sending email:', config)
  }

  /**
   * Execute trigger webhook action
   */
  private async executeTriggerWebhookAction(config: TriggerWebhookActionConfig, context: AutomationContext): Promise<void> {
    const { event, data } = config

    await triggerQualificationWebhook(
      event as QualificationWebhookEvent,
      data || context
    )
  }

  /**
   * Execute add to campaign action
   */
  private async executeAddToCampaignAction(config: AddToCampaignActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { campaignId, leadId } = config

    await supabase.from('campaign_leads').insert({
      campaign_id: campaignId,
      lead_id: leadId || context.leadId,
      status: 'active',
      added_at: new Date().toISOString()
    })
  }

  /**
   * Execute update stage action
   */
  private async executeUpdateStageAction(config: UpdateStageActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { stage, leadId } = config

    await supabase
      .from('lead_scores')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', leadId || context.leadId)
  }

  /**
   * Execute create checklist action
   */
  private async executeCreateChecklistAction(config: CreateChecklistActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { framework, leadId, templateId } = config

    await supabase.from('qualification_checklists').insert({
      lead_id: leadId || context.leadId,
      framework: framework || 'BANT',
      template_id: templateId,
      status: 'not_started',
      created_at: new Date().toISOString()
    })
  }

  /**
   * Execute recycle lead action
   */
  private async executeRecycleLeadAction(config: RecycleLeadActionConfig, context: AutomationContext): Promise<void> {
    const supabase = await this.getSupabase()
    const { leadId, reason, nurtureCampaign } = config

    await supabase.from('lead_recycling_history').insert({
      lead_id: leadId || context.leadId,
      recycling_reason: reason,
      new_status: 'nurture',
      nurture_campaign_id: nurtureCampaign,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Execute escalate action
   */
  private async executeEscalateAction(config: EscalateActionConfig, context: AutomationContext): Promise<void> {
    const { escalateTo, reason, priority } = config

    // Send escalation notification
    await this.notificationService.sendNotification({
      type: 'action_required',
      recipient: escalateTo,
      leadId: context.leadId,
      data: {
        actionMessage: `Escalation: ${reason}`,
        priority: priority || 'high',
        ...context
      }
    })
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: AutomationContext, field: string): unknown {
    const parts = field.split('.')
    let value = context

    for (const part of parts) {
      value = value?.[part]
      if (value === undefined) break
    }

    return value
  }

  /**
   * Start scheduled jobs
   */
  private startScheduledJobs() {
    this.activeRules.forEach(rule => {
      if (rule.trigger.type === 'time_based' && rule.trigger.config.timeInterval) {
        this.startRuleIfScheduled(rule)
      }
    })
  }

  /**
   * Start a scheduled rule
   */
  private startRuleIfScheduled(rule: AutomationRule) {
    if (rule.trigger.type !== 'time_based') return

    const interval = this.parseInterval(rule.trigger.config.timeInterval!)
    if (!interval) return

    // Clear existing job if any
    if (this.runningJobs.has(rule.id)) {
      clearInterval(this.runningJobs.get(rule.id))
    }

    // Start new job
    const job = setInterval(() => {
      this.executeRule(rule.id, { triggeredBy: 'schedule' })
    }, interval)

    this.runningJobs.set(rule.id, job)
  }

  /**
   * Parse time interval
   */
  private parseInterval(interval: string): number | null {
    const patterns = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    }

    return patterns[interval] || null
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    // Listen for qualification score changes
    // In production, this would use database triggers or webhooks
  }

  /**
   * Log automation execution
   */
  private async logExecution(
    ruleId: string,
    context: AutomationContext,
    success: boolean,
    error?: Error
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      await supabase.from('automation_logs').insert({
        rule_id: ruleId,
        type: 'qualification',
        context,
        success,
        error: error ? getErrorMessage(error) : null,
        executed_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Error logging automation execution:', logError)
    }
  }

  /**
   * Get automation analytics
   */
  async getAutomationAnalytics(period: '24h' | '7d' | '30d' = '7d'): Promise<AutomationAnalytics | null> {
    try {
      const supabase = await this.getSupabase()

      const periodMap = {
        '24h': 1,
        '7d': 7,
        '30d': 30
      }

      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - periodMap[period])

      const { data: logs } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('type', 'qualification')
        .gte('executed_at', sinceDate.toISOString())

      const totalExecutions = logs?.length || 0
      const successfulExecutions = logs?.filter(l => l.success).length || 0
      const failedExecutions = totalExecutions - successfulExecutions

      // Count by rule
      const executionsByRule = new Map<string, number>()
      logs?.forEach(log => {
        executionsByRule.set(log.rule_id, (executionsByRule.get(log.rule_id) || 0) + 1)
      })

      // Most active rules
      const mostActiveRules = Array.from(executionsByRule.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ruleId, count]) => ({
          ruleId,
          count,
          rule: this.activeRules.get(ruleId)
        }))

      return {
        period,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
        mostActiveRules,
        averageExecutionsPerDay: totalExecutions / periodMap[period]
      }
    } catch (error) {
      console.error('Error getting automation analytics:', error)
      return null
    }
  }

  /**
   * Get recommended automation rules
   */
  async getRecommendedRules(context: AutomationContext): Promise<AutomationRule[]> {
    const recommendations: Partial<AutomationRule>[] = []

    // Low qualification score automation
    recommendations.push({
      name: 'Low Score Nurture',
      description: 'Automatically nurture leads with low qualification scores',
      trigger: {
        type: 'score_change',
        config: {
          scoreThreshold: 40,
          scoreDirection: 'decrease'
        }
      },
      conditions: [
        {
          field: 'overall_score',
          operator: 'less_than',
          value: 40
        }
      ],
      actions: [
        {
          type: 'add_to_campaign',
          config: {
            campaignId: 'nurture_campaign'
          }
        },
        {
          type: 'notify',
          config: {
            type: 'lead_recycled',
            message: 'Lead moved to nurture due to low score'
          }
        }
      ]
    })

    // High score fast-track
    recommendations.push({
      name: 'High Score Fast Track',
      description: 'Fast-track high-scoring leads to sales',
      trigger: {
        type: 'score_change',
        config: {
          scoreThreshold: 80,
          scoreDirection: 'increase'
        }
      },
      conditions: [
        {
          field: 'overall_score',
          operator: 'greater_than',
          value: 80
        }
      ],
      actions: [
        {
          type: 'route',
          config: {
            priority: 'urgent',
            sla: 2
          }
        },
        {
          type: 'notify',
          config: {
            type: 'lead_qualified',
            message: 'High-value lead ready for immediate outreach'
          }
        },
        {
          type: 'trigger_webhook',
          config: {
            event: QualificationWebhookEvent.LEAD_QUALIFIED
          }
        }
      ]
    })

    // SLA reminder
    recommendations.push({
      name: 'SLA Reminder',
      description: 'Send reminders for approaching SLA deadlines',
      trigger: {
        type: 'time_based',
        config: {
          timeInterval: '1h'
        }
      },
      conditions: [],
      actions: [
        {
          type: 'notify',
          config: {
            type: 'sla_warning',
            message: 'SLA deadline approaching'
          }
        }
      ]
    })

    return recommendations as AutomationRule[]
  }

  /**
   * Stop automation engine
   */
  stop() {
    // Clear all running jobs
    this.runningJobs.forEach(job => clearInterval(job))
    this.runningJobs.clear()
    this.activeRules.clear()
  }
}