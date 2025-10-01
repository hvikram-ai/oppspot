/**
 * Event-Driven Architecture
 * Central event bus for real-time processing and system events
 */

import { createClient } from '@/lib/supabase/server'
import { modelManager } from '@/lib/ml/infrastructure/model-manager'
import { dataLayer } from '@/lib/data-integration/unified-data-layer'

export interface SystemEvent {
  id: string
  type: string
  source: string
  timestamp: Date
  data: unknown
  metadata?: Record<string, unknown>
  userId?: string
  orgId?: string
}

export interface EventHandler {
  id: string
  name: string
  eventTypes: string[]
  priority: number
  async: boolean
  handler: (event: SystemEvent) => Promise<void> | void
}

export interface EventSubscription {
  id: string
  eventType: string
  handlerId: string
  filters?: Record<string, unknown>
  active: boolean
}

export interface EventProcessingResult {
  eventId: string
  handlerId: string
  success: boolean
  duration: number
  error?: string
}

export class EventBus {
  private handlers: Map<string, EventHandler> = new Map()
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private eventQueue: SystemEvent[] = []
  private processing = false
  private eventHistory: SystemEvent[] = []
  private maxHistorySize = 1000
  private processingResults: Map<string, EventProcessingResult[]> = new Map()

  constructor() {
    this.initializeHandlers()
    this.startProcessing()
  }

  /**
   * Initialize default event handlers
   */
  private initializeHandlers() {
    // Lead Scoring Handler
    this.registerHandler({
      id: 'lead-scoring-handler',
      name: 'Lead Scoring Update',
      eventTypes: ['company.updated', 'stakeholder.added', 'funding.detected'],
      priority: 1,
      async: true,
      handler: async (event) => {
        if (event.data.company_id) {
          await this.triggerLeadScoring(event.data.company_id)
        }
      }
    })

    // BANT Calculation Handler
    this.registerHandler({
      id: 'bant-calculation-handler',
      name: 'BANT Score Calculation',
      eventTypes: ['stakeholder.engaged', 'funding.detected', 'demo.requested'],
      priority: 2,
      async: true,
      handler: async (event) => {
        if (event.data.company_id) {
          await this.triggerBANTCalculation(event.data.company_id)
        }
      }
    })

    // Notification Handler
    this.registerHandler({
      id: 'notification-handler',
      name: 'Send Notifications',
      eventTypes: [
        'lead.qualified',
        'stakeholder.champion_identified',
        'funding.detected',
        'benchmark.alert',
        'deal.stage_changed'
      ],
      priority: 3,
      async: true,
      handler: async (event) => {
        await this.sendNotification(event)
      }
    })

    // Data Sync Handler
    this.registerHandler({
      id: 'data-sync-handler',
      name: 'Data Synchronization',
      eventTypes: ['company.enriched', 'external.data_updated'],
      priority: 4,
      async: true,
      handler: async (event) => {
        await this.syncData(event)
      }
    })

    // Analytics Handler
    this.registerHandler({
      id: 'analytics-handler',
      name: 'Analytics Tracking',
      eventTypes: [
        'user.action',
        'page.view',
        'business.view',
        'search.performed',
        'export.generated'
      ],
      priority: 5,
      async: false,
      handler: (event) => {
        this.trackAnalytics(event)
      }
    })

    // Workflow Trigger Handler
    this.registerHandler({
      id: 'workflow-trigger-handler',
      name: 'Workflow Automation',
      eventTypes: [
        'lead.score_threshold',
        'deal.won',
        'customer.churning',
        'opportunity.created'
      ],
      priority: 1,
      async: true,
      handler: async (event) => {
        await this.triggerWorkflow(event)
      }
    })

    // ML Model Training Handler
    this.registerHandler({
      id: 'ml-training-handler',
      name: 'ML Model Training',
      eventTypes: ['ml.training_required', 'ml.data_available'],
      priority: 10,
      async: true,
      handler: async (event) => {
        await this.triggerModelTraining(event)
      }
    })

    // Real-time Update Handler
    this.registerHandler({
      id: 'realtime-handler',
      name: 'Real-time Updates',
      eventTypes: [
        'company.realtime_update',
        'stakeholder.status_changed',
        'deal.updated'
      ],
      priority: 1,
      async: false,
      handler: (event) => {
        this.broadcastRealtimeUpdate(event)
      }
    })
  }

  /**
   * Register a new event handler
   */
  registerHandler(handler: EventHandler): void {
    this.handlers.set(handler.id, handler)

    // Create subscriptions for each event type
    for (const eventType of handler.eventTypes) {
      const subscription: EventSubscription = {
        id: `${handler.id}-${eventType}`,
        eventType,
        handlerId: handler.id,
        active: true
      }

      const existing = this.subscriptions.get(eventType) || []
      existing.push(subscription)
      this.subscriptions.set(eventType, existing)
    }
  }

  /**
   * Emit an event
   */
  emit(event: Omit<SystemEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SystemEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }

    // Add to queue
    this.eventQueue.push(fullEvent)

    // Add to history
    this.addToHistory(fullEvent)

    // Log event
    this.logEvent(fullEvent)

    // Process immediately if not already processing
    if (!this.processing) {
      this.processQueue()
    }
  }

  /**
   * Process event queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return
    }

    this.processing = true

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (!event) continue

      await this.processEvent(event)
    }

    this.processing = false
  }

  /**
   * Process a single event
   */
  private async processEvent(event: SystemEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.type) || []
    const activeSubscriptions = subscriptions.filter(s => s.active)

    // Sort handlers by priority
    const handlers = activeSubscriptions
      .map(s => this.handlers.get(s.handlerId))
      .filter(h => h !== undefined)
      .sort((a, b) => a!.priority - b!.priority)

    // Process handlers
    for (const handler of handlers) {
      if (!handler) continue

      const startTime = Date.now()
      let success = true
      let error: string | undefined

      try {
        if (handler.async) {
          await handler.handler(event)
        } else {
          handler.handler(event)
        }
      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[EventBus] Handler ${handler.id} error:`, err)
      }

      // Record processing result
      const result: EventProcessingResult = {
        eventId: event.id,
        handlerId: handler.id,
        success,
        duration: Date.now() - startTime,
        error
      }

      this.recordProcessingResult(event.id, result)
    }
  }

  /**
   * Start continuous processing
   */
  private startProcessing(): void {
    setInterval(() => {
      if (!this.processing && this.eventQueue.length > 0) {
        this.processQueue()
      }
    }, 100)
  }

  /**
   * Event handler implementations
   */
  private async triggerLeadScoring(companyId: string): Promise<void> {
    try {
      const prediction = await modelManager.predict('lead-scoring-v1', {
        company_id: companyId,
        timestamp: new Date().toISOString()
      })

      // Update lead score in database
      const supabase = await createClient()
      await supabase.from('lead_scores').upsert({
        company_id: companyId,
        score: prediction.output.score,
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('[EventBus] Lead scoring error:', error)
    }
  }

  private async triggerBANTCalculation(companyId: string): Promise<void> {
    try {
      const companyData = await dataLayer.getUnifiedCompanyProfile(companyId)

      const prediction = await modelManager.predict('bant-classifier-v1', companyData)

      // Emit qualification event if needed
      if (prediction.output.status === 'highly_qualified') {
        this.emit({
          type: 'lead.qualified',
          source: 'bant-calculator',
          data: {
            company_id: companyId,
            qualification: prediction.output
          }
        })
      }
    } catch (error) {
      console.error('[EventBus] BANT calculation error:', error)
    }
  }

  private async sendNotification(event: SystemEvent): Promise<void> {
    try {
      const supabase = await createClient()

      // Create notification based on event type
      const notification = {
        user_id: event.userId,
        type: event.type,
        title: this.getNotificationTitle(event),
        message: this.getNotificationMessage(event),
        data: event.data,
        read: false,
        created_at: new Date().toISOString()
      }

      await supabase.from('notifications').insert(notification)
    } catch (error) {
      console.error('[EventBus] Notification error:', error)
    }
  }

  private async syncData(event: SystemEvent): Promise<void> {
    try {
      // Trigger data pipeline for synchronization
      await dataLayer.executePipeline('data-sync-pipeline')
    } catch (error) {
      console.error('[EventBus] Data sync error:', error)
    }
  }

  private trackAnalytics(event: SystemEvent): void {
    // Send to analytics service (simplified)
    console.log('[Analytics]', event.type, event.data)

    // Could integrate with Mixpanel, Amplitude, etc.
    if (typeof window !== 'undefined' && (window as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as { gtag: (...args: unknown[]) => void }).gtag('event', event.type, {
        event_category: 'engagement',
        event_label: event.source,
        value: event.data
      })
    }
  }

  private async triggerWorkflow(event: SystemEvent): Promise<void> {
    try {
      // Determine workflow based on event
      const workflowId = this.getWorkflowId(event.type)
      if (!workflowId) return

      // Execute workflow steps
      console.log(`[Workflow] Triggering ${workflowId} for event ${event.type}`)

      // Emit workflow started event
      this.emit({
        type: 'workflow.started',
        source: 'workflow-engine',
        data: {
          workflow_id: workflowId,
          trigger_event: event.id
        }
      })
    } catch (error) {
      console.error('[EventBus] Workflow trigger error:', error)
    }
  }

  private async triggerModelTraining(event: SystemEvent): Promise<void> {
    try {
      console.log('[ML] Training requested for model:', event.data.model_id)
      // In production, this would trigger actual model training pipeline
    } catch (error) {
      console.error('[EventBus] ML training error:', error)
    }
  }

  private broadcastRealtimeUpdate(event: SystemEvent): void {
    // Broadcast to connected clients via WebSocket/SSE
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'realtime-update',
        event: event
      }, '*')
    }
  }

  /**
   * Helper methods
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private addToHistory(event: SystemEvent): void {
    this.eventHistory.push(event)

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  private async logEvent(event: SystemEvent): Promise<void> {
    try {
      const supabase = await createClient()
      await supabase.from('event_log').insert({
        event_id: event.id,
        event_type: event.type,
        source: event.source,
        data: event.data,
        user_id: event.userId,
        org_id: event.orgId,
        created_at: event.timestamp.toISOString()
      })
    } catch (error) {
      console.error('[EventBus] Error logging event:', error)
    }
  }

  private recordProcessingResult(eventId: string, result: EventProcessingResult): void {
    const results = this.processingResults.get(eventId) || []
    results.push(result)
    this.processingResults.set(eventId, results)
  }

  private getNotificationTitle(event: SystemEvent): string {
    const titles: Record<string, string> = {
      'lead.qualified': 'New Qualified Lead',
      'stakeholder.champion_identified': 'Champion Identified',
      'funding.detected': 'Funding Round Detected',
      'benchmark.alert': 'Benchmark Alert',
      'deal.stage_changed': 'Deal Stage Updated'
    }

    return titles[event.type] || 'System Notification'
  }

  private getNotificationMessage(event: SystemEvent): string {
    // Generate message based on event type and data
    return JSON.stringify(event.data).substring(0, 200)
  }

  private getWorkflowId(eventType: string): string | null {
    const workflows: Record<string, string> = {
      'lead.score_threshold': 'lead-nurture-workflow',
      'deal.won': 'onboarding-workflow',
      'customer.churning': 'retention-workflow',
      'opportunity.created': 'sales-workflow'
    }

    return workflows[eventType] || null
  }

  /**
   * Public API
   */
  getEventHistory(filters?: { type?: string; source?: string }): SystemEvent[] {
    let history = [...this.eventHistory]

    if (filters?.type) {
      history = history.filter(e => e.type === filters.type)
    }
    if (filters?.source) {
      history = history.filter(e => e.source === filters.source)
    }

    return history
  }

  getProcessingResults(eventId: string): EventProcessingResult[] {
    return this.processingResults.get(eventId) || []
  }

  getHandlers(): EventHandler[] {
    return Array.from(this.handlers.values())
  }

  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values()).flat()
  }

  pauseHandler(handlerId: string): void {
    const subscriptions = this.getSubscriptions()
      .filter(s => s.handlerId === handlerId)

    subscriptions.forEach(s => s.active = false)
  }

  resumeHandler(handlerId: string): void {
    const subscriptions = this.getSubscriptions()
      .filter(s => s.handlerId === handlerId)

    subscriptions.forEach(s => s.active = true)
  }
}

// Export singleton instance
export const eventBus = new EventBus()