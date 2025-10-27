/**
 * Agent Task Runner
 * Processes queued agent tasks from the agent_tasks table
 *
 * This service:
 * 1. Polls for pending agent tasks
 * 2. Executes agents based on task type
 * 3. Updates task status and execution records
 * 4. Handles retries and error logging
 */

import { createAdminClient } from '@/lib/supabase/server'
import { BaseAgent, AgentExecutionResult } from '@/lib/ai/agents/base-agent'
import { createOpportunityBot } from '@/lib/agents/opportunity-bot'
import { createEnrichmentAgent } from '@/lib/agents/enrichment-agent'
import { createScoringAgent } from '@/lib/agents/scoring-agent'
import type { Row } from '@/lib/supabase/helpers'

export interface AgentTask {
  id: string
  agent_id: string
  org_id: string
  task_type: string
  priority: number
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retry_count: number
  max_retries: number
  scheduled_for: string | null
  created_at: string
}

export class AgentTaskRunner {
  private isRunning = false
  private pollInterval = 5000 // Poll every 5 seconds
  private maxConcurrentTasks = 3
  private currentTasks = new Set<string>()

  constructor(
    options?: {
      pollInterval?: number
      maxConcurrentTasks?: number
    }
  ) {
    if (options?.pollInterval) this.pollInterval = options.pollInterval
    if (options?.maxConcurrentTasks) this.maxConcurrentTasks = options.maxConcurrentTasks
  }

  /**
   * Start the task runner
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[AgentTaskRunner] Already running')
      return
    }

    this.isRunning = true
    console.log('[AgentTaskRunner] Starting task runner...')

    // Start polling loop
    this.pollLoop()
  }

  /**
   * Stop the task runner
   */
  stop(): void {
    this.isRunning = false
    console.log('[AgentTaskRunner] Stopping task runner...')
  }

  /**
   * Main polling loop
   */
  private async pollLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processNextBatch()
      } catch (error) {
        console.error('[AgentTaskRunner] Error in poll loop:', error)
      }

      // Wait before next poll
      await this.sleep(this.pollInterval)
    }
  }

  /**
   * Process next batch of tasks
   */
  private async processNextBatch(): Promise<void> {
    // Don't fetch if at max concurrent tasks
    if (this.currentTasks.size >= this.maxConcurrentTasks) {
      return
    }

    const availableSlots = this.maxConcurrentTasks - this.currentTasks.size

    // Fetch pending tasks
    const tasks = await this.fetchPendingTasks(availableSlots)

    if (tasks.length === 0) {
      return
    }

    console.log(`[AgentTaskRunner] Found ${tasks.length} pending tasks`)

    // Process each task concurrently
    for (const task of tasks) {
      this.processTask(task).catch(error => {
        console.error(`[AgentTaskRunner] Error processing task ${task.id}:`, error)
      })
    }
  }

  /**
   * Fetch pending tasks from database
   */
  private async fetchPendingTasks(limit: number): Promise<AgentTask[]> {
    const supabase = createAdminClient()

    const { data: tasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit) as { data: Row<'agent_tasks'>[] | null; error: any }

    if (error) {
      console.error('[AgentTaskRunner] Error fetching tasks:', error)
      return []
    }

    return tasks || []
  }

  /**
   * Process a single task
   */
  private async processTask(task: AgentTask): Promise<void> {
    this.currentTasks.add(task.id)

    try {
      console.log(`[AgentTaskRunner] Processing task ${task.id} (${task.task_type})`)

      // Mark task as processing
      await this.updateTaskStatus(task.id, 'processing', {
        started_at: new Date().toISOString()
      })

      // Execute the agent
      const result = await this.executeTask(task)

      // Mark task as completed
      await this.updateTaskStatus(task.id, 'completed', {
        completed_at: new Date().toISOString()
      })

      console.log(`[AgentTaskRunner] Task ${task.id} completed successfully`)

    } catch (error) {
      console.error(`[AgentTaskRunner] Task ${task.id} failed:`, error)

      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if we should retry
      if (task.retry_count < task.max_retries) {
        // Retry task
        await this.retryTask(task, errorMessage)
      } else {
        // Mark as failed permanently
        await this.updateTaskStatus(task.id, 'failed', {
          completed_at: new Date().toISOString(),
          error_message: errorMessage
        })
      }
    } finally {
      this.currentTasks.delete(task.id)
    }
  }

  /**
   * Execute task based on type
   */
  private async executeTask(task: AgentTask): Promise<AgentExecutionResult> {
    const supabase = createAdminClient()

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', task.agent_id)
      .single() as { data: Row<'ai_agents'> | null; error: any }

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${task.agent_id}`)
    }

    if (!agent.is_active) {
      throw new Error(`Agent is inactive: ${task.agent_id}`)
    }

    // Execute based on task type
    if (task.task_type === 'stream_execution') {
      return await this.executeStreamTask(agent, task)
    } else if (task.task_type === 'scheduled_run') {
      return await this.executeScheduledRun(agent, task)
    } else if (task.task_type === 'manual_trigger') {
      return await this.executeManualTrigger(agent, task)
    } else {
      throw new Error(`Unknown task type: ${task.task_type}`)
    }
  }

  /**
   * Execute stream-specific task
   */
  private async executeStreamTask(
    agent: any,
    task: AgentTask
  ): Promise<AgentExecutionResult> {
    const {
      stream_id,
      execution_id,
      goal_context,
      dependency_context,
      shared_data
    } = task.payload

    console.log(`[AgentTaskRunner] Executing ${agent.agent_type} for stream ${stream_id}`)

    if (dependency_context && Object.keys(dependency_context).length > 0) {
      console.log(`[AgentTaskRunner] Using dependency context from: ${Object.keys(dependency_context).join(', ')}`)
    }

    // Get the appropriate agent implementation
    const agentInstance = await this.getAgentInstance(agent)

    // Run the agent with stream context AND dependency context
    const result = await agentInstance.run({
      stream_id,
      execution_id,
      goal_context,
      dependency_context: dependency_context || {},
      shared_data: shared_data || {},
      ...task.payload
    })

    // Update stream progress if items were created/updated
    if (result.success && result.output.items_created) {
      await this.updateStreamProgress(stream_id, result)
    }

    // Create insight for the stream
    if (result.success) {
      await this.createStreamInsight(stream_id, agent, execution_id, result)
    }

    return result
  }

  /**
   * Execute scheduled run
   */
  private async executeScheduledRun(
    agent: any,
    task: AgentTask
  ): Promise<AgentExecutionResult> {
    console.log(`[AgentTaskRunner] Running scheduled task for ${agent.name}`)

    const agentInstance = await this.getAgentInstance(agent)
    return await agentInstance.run(task.payload)
  }

  /**
   * Execute manual trigger
   */
  private async executeManualTrigger(
    agent: any,
    task: AgentTask
  ): Promise<AgentExecutionResult> {
    console.log(`[AgentTaskRunner] Running manual trigger for ${agent.name}`)

    const agentInstance = await this.getAgentInstance(agent)
    return await agentInstance.run(task.payload)
  }

  /**
   * Get agent instance based on type
   */
  private async getAgentInstance(agent: any): Promise<BaseAgent> {
    switch (agent.agent_type) {
      case 'opportunity_bot':
        return await createOpportunityBot(agent.id)

      case 'research_gpt':
      case 'enrichment_agent':
        return await createEnrichmentAgent(agent.id)

      case 'scoring_agent':
        return await createScoringAgent(agent.id)

      default:
        throw new Error(`Agent type not implemented: ${agent.agent_type}`)
    }
  }

  /**
   * Update stream progress after agent execution
   */
  private async updateStreamProgress(
    streamId: string,
    result: AgentExecutionResult
  ): Promise<void> {
    const supabase = createAdminClient()

    // Fetch current stream
    const { data: stream } = await supabase
      .from('streams')
      .select('current_progress, target_metrics')
      .eq('id', streamId)
      .single() as { data: Row<'streams'> | null; error: any }

    if (!stream) return

    const currentProgress = stream.current_progress || { completed: 0, total: 0, percentage: 0 }
    const completed = currentProgress.completed + (result.output.items_created || 0)
    const total = stream.target_metrics?.companies_to_find || currentProgress.total

    // Update progress
    await supabase.rpc('update_stream_progress', {
      p_stream_id: streamId,
      p_completed: completed,
      p_total: total
    })

    console.log(`[AgentTaskRunner] Updated stream ${streamId} progress: ${completed}/${total}`)
  }

  /**
   * Create insight after agent execution
   */
  private async createStreamInsight(
    streamId: string,
    agent: any,
    executionId: string,
    result: AgentExecutionResult
  ): Promise<void> {
    const supabase = createAdminClient()

    const insightTitle = this.generateInsightTitle(agent.agent_type, result)
    const insightDescription = this.generateInsightDescription(agent.agent_type, result)

    await supabase
      .from('stream_insights')
      .insert({
        stream_id: streamId,
        insight_type: 'progress_update',
        title: insightTitle,
        description: insightDescription,
        severity: result.success ? 'success' : 'warning',
        data: {
          items_processed: result.metrics.itemsProcessed,
          items_created: result.output.items_created,
          avg_quality_score: result.output.avg_quality_score,
          execution_time_ms: result.metrics.durationMs
        },
        generated_by: agent.id,
        agent_execution_id: executionId,
        is_read: false,
        is_actionable: false
      })
  }

  /**
   * Generate insight title based on agent type and results
   */
  private generateInsightTitle(agentType: string, result: AgentExecutionResult): string {
    const itemsCreated = result.output.items_created || 0

    switch (agentType) {
      case 'opportunity_bot':
        return `Found ${itemsCreated} new opportunities`
      case 'enrichment_agent':
        return `Enriched ${itemsCreated} companies with additional data`
      case 'scoring_agent':
        return `Scored ${result.metrics.itemsProcessed} companies`
      default:
        return `Agent completed successfully`
    }
  }

  /**
   * Generate insight description
   */
  private generateInsightDescription(agentType: string, result: AgentExecutionResult): string {
    const metrics = result.metrics
    const output = result.output

    return `Processed ${metrics.itemsProcessed} items in ${(metrics.durationMs / 1000).toFixed(1)}s. ${
      output.avg_quality_score
        ? `Average quality score: ${output.avg_quality_score.toFixed(1)}/5.0.`
        : ''
    }`
  }

  /**
   * Retry a failed task
   */
  private async retryTask(task: AgentTask, errorMessage: string): Promise<void> {
    const supabase = createAdminClient()

    // Calculate exponential backoff delay
    const delayMs = Math.min(1000 * Math.pow(2, task.retry_count), 60000) // Max 60s
    const scheduledFor = new Date(Date.now() + delayMs)

    await supabase
      .from('agent_tasks')
      .update({
        status: 'pending',
        retry_count: task.retry_count + 1,
        scheduled_for: scheduledFor.toISOString(),
        error_message: errorMessage
      })
      .eq('id', task.id)

    console.log(
      `[AgentTaskRunner] Retrying task ${task.id} in ${delayMs}ms (attempt ${task.retry_count + 1}/${task.max_retries})`
    )
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: AgentTask['status'],
    updates: Record<string, unknown> = {}
  ): Promise<void> {
    const supabase = createAdminClient()

    await supabase
      .from('agent_tasks')
      .update({
        status,
        ...updates
      })
      .eq('id', taskId)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
let taskRunner: AgentTaskRunner | null = null

/**
 * Get or create task runner instance
 */
export function getTaskRunner(): AgentTaskRunner {
  if (!taskRunner) {
    taskRunner = new AgentTaskRunner({
      pollInterval: 5000,
      maxConcurrentTasks: 3
    })
  }
  return taskRunner
}

/**
 * Start the global task runner
 */
export async function startTaskRunner(): Promise<void> {
  const runner = getTaskRunner()
  await runner.start()
}

/**
 * Stop the global task runner
 */
export function stopTaskRunner(): void {
  if (taskRunner) {
    taskRunner.stop()
  }
}
