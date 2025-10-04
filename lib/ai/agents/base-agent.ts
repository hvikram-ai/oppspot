/**
 * Base Agent Class
 * Abstract foundation for all AI agents
 *
 * All agents inherit from this class and implement:
 * - execute(): Main agent logic
 * - validateConfig(): Configuration validation
 */

import { createClient } from '@/lib/supabase/server'
import { eventBus } from '@/lib/events/event-bus'

export interface AgentConfig {
  id: string
  orgId: string
  name: string
  type: string
  configuration: Record<string, unknown>
  isActive: boolean
  scheduleCron?: string
}

export interface AgentExecutionContext {
  executionId: string
  agentId: string
  orgId: string
  input: Record<string, unknown>
  startTime: Date
}

export interface AgentExecutionResult {
  success: boolean
  output: Record<string, unknown>
  error?: string
  metrics: {
    durationMs: number
    itemsProcessed: number
    apiCalls: number
    tokensUsed: number
    cost: number
  }
}

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  /**
   * Execute the agent (implemented by subclasses)
   */
  abstract execute(
    context: AgentExecutionContext
  ): Promise<AgentExecutionResult>

  /**
   * Validate agent configuration (implemented by subclasses)
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * Run agent with full lifecycle management
   */
  async run(input: Record<string, unknown> = {}): Promise<AgentExecutionResult> {
    const supabase = await createClient()
    // Use existing execution_id if provided, otherwise create new one
    const executionId = input.execution_id || crypto.randomUUID()
    const startTime = new Date()

    // If execution_id was provided, update existing record; otherwise create new
    if (input.execution_id) {
      // Update existing execution to 'running'
      await supabase.from('agent_executions').update({
        status: 'running',
        started_at: startTime.toISOString(),
        input_data: input
      }).eq('id', executionId)
    } else {
      // Create new execution record
      await supabase.from('agent_executions').insert({
        id: executionId,
        agent_id: this.config.id,
        org_id: this.config.orgId,
        status: 'running',
        started_at: startTime.toISOString(),
        input_data: input
      })
    }

    // Emit start event
    this.emitEvent('agent.execution.started', {
      executionId,
      agentId: this.config.id,
      agentType: this.config.type
    })

    console.log(`[${this.config.type}] Starting execution ${executionId}`)

    try {
      // Execute agent
      const context: AgentExecutionContext = {
        executionId,
        agentId: this.config.id,
        orgId: this.config.orgId,
        input,
        startTime
      }

      const result = await this.execute(context)

      // Update execution record (success)
      await supabase
        .from('agent_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: result.metrics.durationMs,
          output_data: result.output,
          metrics: result.metrics
        })
        .eq('id', executionId)

      // Update agent's last run time
      await supabase
        .from('ai_agents')
        .update({
          last_run_at: new Date().toISOString()
        })
        .eq('id', this.config.id)

      // Emit completion event
      this.emitEvent('agent.execution.completed', {
        executionId,
        agentId: this.config.id,
        agentType: this.config.type,
        metrics: result.metrics
      })

      console.log(`[${this.config.type}] Completed execution ${executionId} in ${result.metrics.durationMs}ms`)

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[${this.config.type}] Execution ${executionId} failed:`, error)

      // Update execution record (failed)
      await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime.getTime(),
          error_message: errorMessage,
          error_stack: errorStack
        })
        .eq('id', executionId)

      // Emit failure event
      this.emitEvent('agent.execution.failed', {
        executionId,
        agentId: this.config.id,
        agentType: this.config.type,
        error: errorMessage
      })

      throw error
    }
  }

  /**
   * Schedule next run based on cron expression
   */
  async scheduleNextRun(): Promise<void> {
    if (!this.config.scheduleCron) return

    const supabase = await createClient()

    // Simple cron parsing (extend as needed)
    const nextRun = new Date()

    // Daily at specific hour: "0 9 * * *"
    if (this.config.scheduleCron.match(/^0 (\d+) \* \* \*$/)) {
      const hour = parseInt(this.config.scheduleCron.split(' ')[1])
      nextRun.setHours(hour, 0, 0, 0)
      if (nextRun <= new Date()) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
    }
    // Hourly: "0 * * * *"
    else if (this.config.scheduleCron === '0 * * * *') {
      nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0)
    }
    // Every 6 hours: "0 */6 * * *"
    else if (this.config.scheduleCron === '0 */6 * * *') {
      nextRun.setHours(nextRun.getHours() + 6, 0, 0, 0)
    }

    await supabase
      .from('ai_agents')
      .update({ next_run_at: nextRun.toISOString() })
      .eq('id', this.config.id)

    console.log(`[${this.config.type}] Next run scheduled for ${nextRun.toISOString()}`)
  }

  /**
   * Helper to emit events
   */
  protected emitEvent(type: string, data: Record<string, unknown>): void {
    eventBus.emit({
      type,
      source: this.config.type,
      data: {
        agentId: this.config.id,
        orgId: this.config.orgId,
        ...data
      }
    })
  }

  /**
   * Helper to log agent activity
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.config.type}][${this.config.id.slice(0, 8)}]`

    if (level === 'error') {
      console.error(`${prefix} ${message}`)
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`)
    } else {
      console.log(`${prefix} ${message}`)
    }
  }

  /**
   * Helper to get configuration value
   */
  protected getConfig<T>(key: string, defaultValue?: T): T {
    return this.config.configuration[key] ?? defaultValue
  }

  /**
   * Helper to create buying signal
   */
  protected async createBuyingSignal(
    companyId: string,
    signalType: string,
    signalStrength: 'very_strong' | 'strong' | 'moderate' | 'weak',
    confidenceScore: number,
    signalData: Record<string, unknown>
  ): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('buying_signals')
      .insert({
        company_id: companyId,
        org_id: this.config.orgId,
        signal_type: signalType,
        signal_strength: signalStrength,
        confidence_score: confidenceScore,
        signal_data: signalData,
        detected_by: this.config.type,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create buying signal: ${error.message}`)
    }

    this.emitEvent('buying_signal.created', {
      signalId: data.id,
      companyId,
      signalType,
      signalStrength,
      confidenceScore
    })

    return data.id
  }
}
