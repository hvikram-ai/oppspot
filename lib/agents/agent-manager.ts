/**
 * Agent Manager
 * Registry and lifecycle management for all agents in the system
 */

import type { BaseAgent } from './base-agent'
import type { AgentStatus, AgentExecutionMetrics } from './agent-types'
import { OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

// ============================================================================
// AGENT MANAGER
// ============================================================================

export class AgentManager {
  private agents: Map<OppspotAgentType, BaseAgent>
  private metrics: Map<OppspotAgentType, AgentMetrics>
  private initialized: boolean = false

  constructor() {
    this.agents = new Map()
    this.metrics = new Map()
  }

  /**
   * Initialize all agents
   * NOTE: Agents are lazily loaded when first accessed to avoid circular dependencies
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('[Agent Manager] Initializing agent system...')

    // Initialize metrics tracking
    Object.values(OppspotAgentType).forEach((type) => {
      this.metrics.set(type as OppspotAgentType, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        lastExecuted: null,
      })
    })

    this.initialized = true
    console.log('[Agent Manager] Agent system initialized')
  }

  /**
   * Register an agent
   */
  registerAgent(type: OppspotAgentType, agent: BaseAgent): void {
    console.log(`[Agent Manager] Registering ${type} agent`)
    this.agents.set(type, agent)
  }

  /**
   * Get an agent by type (lazy loading)
   */
  getAgent(type: OppspotAgentType): BaseAgent {
    // Check if agent is already registered
    if (this.agents.has(type)) {
      return this.agents.get(type)!
    }

    // Lazy load the agent
    console.log(`[Agent Manager] Lazy loading ${type} agent`)
    const agent = this.loadAgent(type)
    this.agents.set(type, agent)
    return agent
  }

  /**
   * Lazy load an agent (dynamic import to avoid circular dependencies)
   */
  private loadAgent(type: OppspotAgentType): BaseAgent {
    const config = getDefaultAgentConfig(type)

    // Dynamic import based on agent type
    // Note: These imports will be created in Phase 2 and 3
    switch (type) {
      case OppspotAgentType.ROUTER:
        // Will be loaded from router-agent.ts
        throw new Error('Router agent must be explicitly created')

      case OppspotAgentType.FINANCIAL:
      case OppspotAgentType.MARKET:
      case OppspotAgentType.TECHNICAL:
      case OppspotAgentType.LEGAL:
      case OppspotAgentType.RESEARCH:
      case OppspotAgentType.CONTACTS:
      case OppspotAgentType.GENERAL:
        // These will be implemented in Phase 3
        throw new Error(`${type} agent not yet implemented - coming in Phase 3`)

      default:
        throw new Error(`Unknown agent type: ${type}`)
    }
  }

  /**
   * Check if agent is available
   */
  hasAgent(type: OppspotAgentType): boolean {
    return this.agents.has(type)
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Map<OppspotAgentType, BaseAgent> {
    return new Map(this.agents)
  }

  /**
   * Get agent types available for multi-agent orchestration
   */
  getAvailableAgentTypes(): OppspotAgentType[] {
    return Array.from(this.agents.keys()).filter(
      (type) => type !== OppspotAgentType.ROUTER && type !== OppspotAgentType.GENERAL
    )
  }

  /**
   * Record agent execution metrics
   */
  recordExecution(metrics: AgentExecutionMetrics): void {
    const agentMetrics = this.metrics.get(metrics.agentType)
    if (!agentMetrics) {
      return
    }

    agentMetrics.totalExecutions++
    agentMetrics.totalExecutionTime += metrics.executionTime
    agentMetrics.lastExecuted = new Date().toISOString()

    if (metrics.success) {
      agentMetrics.successfulExecutions++
    } else {
      agentMetrics.failedExecutions++
    }
  }

  /**
   * Get agent status and health
   */
  getAgentStatus(type: OppspotAgentType): AgentStatus {
    const metrics = this.metrics.get(type)
    const agent = this.agents.get(type)

    if (!metrics) {
      return {
        agentType: type,
        healthy: false,
        totalExecutions: 0,
        successRate: 0,
        avgResponseTime: 0,
      }
    }

    const successRate =
      metrics.totalExecutions > 0
        ? metrics.successfulExecutions / metrics.totalExecutions
        : 0

    const avgResponseTime =
      metrics.totalExecutions > 0
        ? metrics.totalExecutionTime / metrics.totalExecutions
        : 0

    return {
      agentType: type,
      healthy: agent !== undefined && successRate > 0.8, // 80% success rate = healthy
      lastUsed: metrics.lastExecuted || undefined,
      totalExecutions: metrics.totalExecutions,
      successRate,
      avgResponseTime,
    }
  }

  /**
   * Get health status of all agents
   */
  getSystemHealth(): {
    healthy: boolean
    totalAgents: number
    healthyAgents: number
    agents: Record<string, AgentStatus>
  } {
    const agentStatuses: Record<string, AgentStatus> = {}
    let healthyCount = 0

    Array.from(this.agents.keys()).forEach((type) => {
      const status = this.getAgentStatus(type)
      agentStatuses[type] = status
      if (status.healthy) {
        healthyCount++
      }
    })

    return {
      healthy: healthyCount >= this.agents.size * 0.8, // 80% of agents must be healthy
      totalAgents: this.agents.size,
      healthyAgents: healthyCount,
      agents: agentStatuses,
    }
  }

  /**
   * Clear all agents (for testing or reinitialization)
   */
  clear(): void {
    this.agents.clear()
    this.metrics.clear()
    this.initialized = false
  }

  /**
   * Get metrics for debugging
   */
  getMetrics(): Map<OppspotAgentType, AgentMetrics> {
    return new Map(this.metrics)
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface AgentMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  totalExecutionTime: number
  lastExecuted: string | null
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: AgentManager | null = null

/**
 * Get the singleton instance of AgentManager
 */
export function getAgentManager(): AgentManager {
  if (!instance) {
    instance = new AgentManager()
  }
  return instance
}

/**
 * Initialize the agent system (should be called on app startup)
 */
export async function initializeAgentSystem(): Promise<void> {
  const manager = getAgentManager()
  await manager.initialize()
}

export default AgentManager
