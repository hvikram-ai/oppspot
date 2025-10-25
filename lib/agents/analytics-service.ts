/**
 * Agent Analytics Service
 * Business logic for agent performance metrics and analytics
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AgentExecution = Database['public']['Tables']['agent_executions']['Row']
type AIAgent = Database['public']['Tables']['ai_agents']['Row']

// ============================================================================
// TYPES
// ============================================================================

export interface AgentOverviewMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  averageDuration: number
  totalDuration: number
  activeAgents: number
  totalAgents: number
}

export interface AgentPerformance {
  agentId: string
  agentName: string
  agentType: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  averageDuration: number
  lastExecutionAt: string | null
  totalTokensUsed?: number
  estimatedCost?: number
}

export interface ExecutionHistoryItem {
  id: string
  agentId: string
  agentName: string
  agentType: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  errorMessage: string | null
  tokensUsed?: number
  itemsProcessed?: number
}

export interface ErrorAnalysis {
  errorType: string
  errorMessage: string
  count: number
  lastOccurrence: string
  affectedAgents: string[]
}

export interface TimeSeriesData {
  date: string
  successful: number
  failed: number
  avgDuration: number
}

export interface CostMetrics {
  totalTokensUsed: number
  estimatedCost: number
  costByAgent: Array<{
    agentId: string
    agentName: string
    tokensUsed: number
    estimatedCost: number
  }>
  dailyCost: Array<{
    date: string
    cost: number
  }>
}

// ============================================================================
// TOKEN COST CALCULATOR
// ============================================================================

/**
 * Calculate estimated cost based on tokens used
 * Claude 3.5 Sonnet pricing (via OpenRouter):
 * - Input: $3 per 1M tokens
 * - Output: $15 per 1M tokens
 * Using average of $9 per 1M tokens for simplicity
 */
function calculateTokenCost(tokens: number): number {
  const COST_PER_MILLION = 9.0
  return (tokens / 1_000_000) * COST_PER_MILLION
}

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export class AgentAnalyticsService {
  /**
   * Get overview metrics for all agents
   */
  static async getOverviewMetrics(
    orgId: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<AgentOverviewMetrics> {
    const supabase = await createClient()

    // Calculate time range
    const now = new Date()
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

    // Get execution stats
    const { data: executions, error: execError } = await supabase
      .from('agent_executions')
      .select('status, duration_ms')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())

    if (execError) {
      console.error('[AgentAnalytics] Error fetching executions:', execError)
      throw execError
    }

    const totalExecutions = executions?.length || 0
    const successfulExecutions = executions?.filter((e) => e.status === 'completed').length || 0
    const failedExecutions = executions?.filter((e) => e.status === 'failed').length || 0
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

    // Calculate average duration
    const completedExecutions = executions?.filter((e) => e.duration_ms) || []
    const totalDuration = completedExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0)
    const averageDuration = completedExecutions.length > 0 ? totalDuration / completedExecutions.length : 0

    // Get agent counts
    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('id, is_active')
      .eq('org_id', orgId)

    if (agentsError) {
      console.error('[AgentAnalytics] Error fetching agents:', agentsError)
      throw agentsError
    }

    const totalAgents = agents?.length || 0
    const activeAgents = agents?.filter((a) => a.is_active).length || 0

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      averageDuration,
      totalDuration,
      activeAgents,
      totalAgents,
    }
  }

  /**
   * Get performance metrics for each agent
   */
  static async getAgentPerformance(
    orgId: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<AgentPerformance[]> {
    const supabase = await createClient()

    const now = new Date()
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('id, name, agent_type')
      .eq('org_id', orgId)

    if (agentsError) throw agentsError

    const performance: AgentPerformance[] = []

    for (const agent of agents || []) {
      // Get execution stats for this agent
      const { data: executions, error: execError } = await supabase
        .from('agent_executions')
        .select('status, duration_ms, completed_at, metrics')
        .eq('agent_id', agent.id)
        .gte('created_at', startDate.toISOString())

      if (execError) continue

      const totalExecutions = executions?.length || 0
      const successfulExecutions = executions?.filter((e) => e.status === 'completed').length || 0
      const failedExecutions = executions?.filter((e) => e.status === 'failed').length || 0
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

      // Calculate average duration
      const completedExecutions = executions?.filter((e) => e.duration_ms) || []
      const avgDuration =
        completedExecutions.length > 0
          ? completedExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) /
            completedExecutions.length
          : 0

      // Get last execution time
      const lastExecution = executions?.sort(
        (a, b) =>
          new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      )[0]

      // Calculate token usage and cost
      let totalTokensUsed = 0
      for (const exec of executions || []) {
        const metrics = exec.metrics as Record<string, unknown> | null
        if (metrics && typeof metrics.tokens_used === 'number') {
          totalTokensUsed += metrics.tokens_used
        }
      }

      performance.push({
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.agent_type,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
        averageDuration: avgDuration,
        lastExecutionAt: lastExecution?.completed_at || null,
        totalTokensUsed,
        estimatedCost: calculateTokenCost(totalTokensUsed),
      })
    }

    // Sort by total executions (most active first)
    return performance.sort((a, b) => b.totalExecutions - a.totalExecutions)
  }

  /**
   * Get recent execution history
   */
  static async getExecutionHistory(
    orgId: string,
    limit: number = 50,
    agentId?: string
  ): Promise<ExecutionHistoryItem[]> {
    const supabase = await createClient()

    let query = supabase
      .from('agent_executions')
      .select(
        `
        id,
        agent_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        error_message,
        metrics,
        ai_agents!inner (
          name,
          agent_type
        )
      `
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      agentId: item.agent_id,
      agentName: item.ai_agents.name,
      agentType: item.ai_agents.agent_type,
      status: item.status,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      durationMs: item.duration_ms,
      errorMessage: item.error_message,
      tokensUsed: item.metrics?.tokens_used,
      itemsProcessed: item.metrics?.items_processed,
    }))
  }

  /**
   * Get error analysis and patterns
   */
  static async getErrorAnalysis(
    orgId: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<ErrorAnalysis[]> {
    const supabase = await createClient()

    const now = new Date()
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

    const { data: executions, error } = await supabase
      .from('agent_executions')
      .select(
        `
        id,
        agent_id,
        error_message,
        completed_at,
        ai_agents!inner (
          name,
          agent_type
        )
      `
      )
      .eq('org_id', orgId)
      .eq('status', 'failed')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Group errors by message
    const errorMap = new Map<string, ErrorAnalysis>()

    for (const exec of executions || []) {
      if (!exec.error_message) continue

      // Extract error type from message
      const errorType = exec.error_message.split(':')[0] || 'Unknown Error'
      const key = errorType

      if (!errorMap.has(key)) {
        errorMap.set(key, {
          errorType,
          errorMessage: exec.error_message,
          count: 0,
          lastOccurrence: exec.completed_at || '',
          affectedAgents: [],
        })
      }

      const errorInfo = errorMap.get(key)!
      errorInfo.count++

      const agentName = (exec as any).ai_agents?.name
      if (agentName && !errorInfo.affectedAgents.includes(agentName)) {
        errorInfo.affectedAgents.push(agentName)
      }

      // Update last occurrence if more recent
      if (
        exec.completed_at &&
        new Date(exec.completed_at) > new Date(errorInfo.lastOccurrence)
      ) {
        errorInfo.lastOccurrence = exec.completed_at
      }
    }

    // Convert to array and sort by count
    return Array.from(errorMap.values()).sort((a, b) => b.count - a.count)
  }

  /**
   * Get time series data for performance trends
   */
  static async getTimeSeriesData(
    orgId: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<TimeSeriesData[]> {
    const supabase = await createClient()

    const now = new Date()
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

    const { data: executions, error } = await supabase
      .from('agent_executions')
      .select('status, duration_ms, created_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by date
    const dataByDate = new Map<string, TimeSeriesData>()

    for (const exec of executions || []) {
      const date = new Date(exec.created_at).toISOString().split('T')[0]

      if (!dataByDate.has(date)) {
        dataByDate.set(date, {
          date,
          successful: 0,
          failed: 0,
          avgDuration: 0,
        })
      }

      const dayData = dataByDate.get(date)!
      if (exec.status === 'completed') {
        dayData.successful++
      } else if (exec.status === 'failed') {
        dayData.failed++
      }

      if (exec.duration_ms) {
        dayData.avgDuration =
          (dayData.avgDuration * (dayData.successful + dayData.failed - 1) + exec.duration_ms) /
          (dayData.successful + dayData.failed)
      }
    }

    return Array.from(dataByDate.values())
  }

  /**
   * Get cost metrics
   */
  static async getCostMetrics(
    orgId: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<CostMetrics> {
    const supabase = await createClient()

    const now = new Date()
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

    // Get all executions with metrics
    const { data: executions, error } = await supabase
      .from('agent_executions')
      .select(
        `
        id,
        agent_id,
        metrics,
        created_at,
        ai_agents!inner (
          id,
          name
        )
      `
      )
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    let totalTokensUsed = 0
    const costByAgent = new Map<string, { agentName: string; tokensUsed: number }>()
    const dailyCostMap = new Map<string, number>()

    for (const exec of executions || []) {
      const metrics = exec.metrics as Record<string, unknown> | null
      const tokensUsed = (metrics?.tokens_used as number) || 0

      totalTokensUsed += tokensUsed

      // By agent
      const agentId = exec.agent_id
      const agentName = (exec as any).ai_agents?.name || 'Unknown'
      if (!costByAgent.has(agentId)) {
        costByAgent.set(agentId, { agentName, tokensUsed: 0 })
      }
      costByAgent.get(agentId)!.tokensUsed += tokensUsed

      // By day
      const date = new Date(exec.created_at).toISOString().split('T')[0]
      dailyCostMap.set(date, (dailyCostMap.get(date) || 0) + tokensUsed)
    }

    const estimatedCost = calculateTokenCost(totalTokensUsed)

    return {
      totalTokensUsed,
      estimatedCost,
      costByAgent: Array.from(costByAgent.entries()).map(([agentId, data]) => ({
        agentId,
        agentName: data.agentName,
        tokensUsed: data.tokensUsed,
        estimatedCost: calculateTokenCost(data.tokensUsed),
      })),
      dailyCost: Array.from(dailyCostMap.entries()).map(([date, tokens]) => ({
        date,
        cost: calculateTokenCost(tokens),
      })),
    }
  }
}
