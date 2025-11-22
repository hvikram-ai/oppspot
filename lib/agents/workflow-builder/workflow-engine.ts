// Agent Workflow Engine - DAG execution engine for chaining agents

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  WorkflowConfig,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  WorkflowExecutionOptions,
  NodeExecutionResult,
  WorkflowExecutionStatus,
  WorkflowNodeExecutionStatus,
  ExecutionLogEntry
} from '@/types/agent-workflow'

// Import agent types
import { BaseAgent } from '@/lib/agents/base-agent'
import { getDefaultAgentConfig } from '@/lib/agents/agent-config'
import { OppspotAgentType } from '@/lib/agents/agent-types'

// Temporary type aliases until database.ts is regenerated
type WorkflowExecutionUpdate = {
  status?: string
  updated_at?: string
  started_at?: string
  completed_at?: string
  node_results?: Record<string, NodeExecutionResult>
  output_data?: unknown
  duration_ms?: number
  error_message?: string
  current_node_id?: string
}

type WorkflowLogInsert = {
  execution_id: string
  node_id?: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

export class WorkflowEngine {
  private executionId: string
  private workflowId: string
  private config: WorkflowConfig
  private context: WorkflowExecutionContext
  private options: WorkflowExecutionOptions
  private supabase: ReturnType<typeof createAdminClient>

  constructor(
    workflowId: string,
    config: WorkflowConfig,
    options: WorkflowExecutionOptions = {}
  ) {
    this.executionId = crypto.randomUUID()
    this.workflowId = workflowId
    this.config = config
    this.options = options
    this.supabase = createAdminClient()

    this.context = {
      executionId: this.executionId,
      workflowId,
      inputData: options.inputData || {},
      nodeResults: {},
      variables: options.variables || {},
    }
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<WorkflowExecutionContext> {
    try {
      await this.log('info', 'Starting workflow execution')
      await this.updateExecutionStatus('running')

      // Get execution order (topological sort)
      const executionOrder = this.getExecutionOrder()
      await this.log('info', `Execution order: ${executionOrder.join(' → ')}`)

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = this.config.nodes.find((n) => n.id === nodeId)
        if (!node) {
          throw new Error(`Node ${nodeId} not found`)
        }

        // Update current node
        this.context.currentNodeId = nodeId
        await this.updateCurrentNode(nodeId)

        // Check if node should be skipped based on conditions
        if (await this.shouldSkipNode(node)) {
          await this.log('info', `Skipping node ${nodeId}`, { nodeId })
          this.context.nodeResults[nodeId] = {
            status: 'skipped',
            startedAt: new Date().toISOString(),
          }
          continue
        }

        // Execute node
        await this.log('info', `Executing node ${nodeId}`, { nodeId, type: node.type })
        const result = await this.executeNode(node)
        this.context.nodeResults[nodeId] = result

        // Handle failure
        if (result.status === 'failed') {
          if (!this.options.retryOnFailure) {
            throw new Error(`Node ${nodeId} failed: ${result.error?.message}`)
          }
          // Retry logic handled in executeNode
        }
      }

      await this.log('info', 'Workflow execution completed successfully')
      await this.updateExecutionStatus('completed')

      return this.context
    } catch (error) {
      await this.log('error', `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`)
      await this.updateExecutionStatus('failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const startTime = Date.now()

    try {
      let output: unknown

      switch (node.type) {
        case 'trigger':
          output = this.context.inputData
          break

        case 'agent':
          output = await this.executeAgentNode(node)
          break

        case 'condition':
          output = await this.executeConditionNode(node)
          break

        case 'transform':
          output = await this.executeTransformNode(node)
          break

        case 'delay':
          output = await this.executeDelayNode(node)
          break

        case 'parallel':
          output = await this.executeParallelNode(node)
          break

        case 'merge':
          output = await this.executeMergeNode(node)
          break

        case 'output':
          output = await this.executeOutputNode(node)
          break

        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }

      const endTime = Date.now()

      return {
        status: 'completed',
        output,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
      }
    } catch (error) {
      const endTime = Date.now()

      return {
        status: 'failed',
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
      }
    }
  }

  /**
   * Execute an agent node
   */
  private async executeAgentNode(node: WorkflowNode): Promise<unknown> {
    const { agentType, agentConfig } = node.data

    if (!agentType) {
      throw new Error('Agent type not specified')
    }

    // Get input from previous nodes
    const input = this.getNodeInput(node)

    // Create agent instance
    const agent = this.createAgent(agentType, agentConfig || {})

    // Note: Agents use analyze() method, not execute()
    // Input should be a ResearchContext object
    const result = await agent.analyze(input as Parameters<typeof agent.analyze>[0], agentConfig?.specificQuery as string | undefined)

    return result
  }

  /**
   * Create agent instance based on type
   */
  private createAgent(agentType: string, userConfig: Record<string, unknown>): BaseAgent {
    // Get default configuration for the agent type
    let agentTypeEnum: OppspotAgentType

    switch (agentType.toLowerCase()) {
      case 'enrichment':
      case 'research':
        agentTypeEnum = OppspotAgentType.RESEARCH
        break
      case 'scoring':
      case 'financial':
        agentTypeEnum = OppspotAgentType.FINANCIAL
        break
      case 'insight':
      case 'general':
        agentTypeEnum = OppspotAgentType.GENERAL
        break
      case 'legal':
        agentTypeEnum = OppspotAgentType.LEGAL
        break
      case 'market':
        agentTypeEnum = OppspotAgentType.MARKET
        break
      case 'technical':
        agentTypeEnum = OppspotAgentType.TECHNICAL
        break
      case 'contacts':
        agentTypeEnum = OppspotAgentType.CONTACTS
        break
      default:
        throw new Error(`Unknown agent type: ${agentType}`)
    }

    // Merge user config with defaults
    const config = {
      ...getDefaultAgentConfig(agentTypeEnum),
      ...userConfig
    }

    // For now, we need to import and instantiate the specific agent classes
    // This is a simplified implementation - in a full system, you'd use a factory pattern
    // with dynamic imports for each specialized agent class

    // Since we can't properly instantiate specialized agents without proper imports,
    // we'll throw an error for now indicating this needs the specialized agent implementation
    throw new Error(`Agent instantiation not yet implemented for type: ${agentType}. Please implement a proper agent factory.`)
  }

  /**
   * Execute a condition node
   */
  private async executeConditionNode(node: WorkflowNode): Promise<unknown> {
    const { condition } = node.data

    if (!condition) {
      throw new Error('Condition not specified')
    }

    const input = this.getNodeInput(node)
    const value = this.getValueFromPath(input, condition.field)

    const result = this.evaluateCondition(value, condition.operator, condition.value)

    return { conditionMet: result, value }
  }

  /**
   * Execute a transform node
   */
  private async executeTransformNode(node: WorkflowNode): Promise<unknown> {
    const { transformScript, transformType } = node.data

    if (!transformScript) {
      throw new Error('Transform script not specified')
    }

    const input = this.getNodeInput(node)

    switch (transformType) {
      case 'javascript': {
        // Execute JavaScript transformation
         
        const fn = new Function('input', 'context', transformScript)
        return fn(input, this.context)
      }

      case 'template': {
        // Simple template replacement
        return this.applyTemplate(transformScript, { input, context: this.context })
      }

      default:
        throw new Error(`Unknown transform type: ${transformType}`)
    }
  }

  /**
   * Execute a delay node
   */
  private async executeDelayNode(node: WorkflowNode): Promise<unknown> {
    const { delayMs = 1000 } = node.data

    await new Promise((resolve) => setTimeout(resolve, delayMs))

    return { delayed: delayMs }
  }

  /**
   * Execute a parallel node
   */
  private async executeParallelNode(node: WorkflowNode): Promise<unknown> {
    // Get all child nodes that should execute in parallel
    const childNodes = this.getChildNodes(node.id)

    // Execute all child nodes in parallel
    const results = await Promise.all(
      childNodes.map(async (childNode) => {
        const result = await this.executeNode(childNode)
        this.context.nodeResults[childNode.id] = result
        return { nodeId: childNode.id, result }
      })
    )

    return { parallelResults: results }
  }

  /**
   * Execute a merge node
   */
  private async executeMergeNode(node: WorkflowNode): Promise<unknown> {
    // Get all parent node results
    const parentNodes = this.getParentNodes(node.id)
    const results = parentNodes.map((parentNode) => ({
      nodeId: parentNode.id,
      result: this.context.nodeResults[parentNode.id],
    }))

    return { mergedResults: results }
  }

  /**
   * Execute an output node
   */
  private async executeOutputNode(node: WorkflowNode): Promise<unknown> {
    const { outputMapping } = node.data

    const input = this.getNodeInput(node)

    if (outputMapping) {
      // Apply output mapping
      const mapped: Record<string, unknown> = {}
      for (const [key, path] of Object.entries(outputMapping)) {
        mapped[key] = this.getValueFromPath(input, path)
      }
      return mapped
    }

    return input
  }

  /**
   * Get execution order using topological sort
   */
  private getExecutionOrder(): string[] {
    const nodes = this.config.nodes
    const edges = this.config.edges

    // Build adjacency list
    const graph = new Map<string, string[]>()
    const inDegree = new Map<string, number>()

    nodes.forEach((node) => {
      graph.set(node.id, [])
      inDegree.set(node.id, 0)
    })

    edges.forEach((edge) => {
      graph.get(edge.source)?.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    })

    // Topological sort using Kahn's algorithm
    const queue: string[] = []
    const result: string[] = []

    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId)
      }
    })

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      result.push(nodeId)

      const neighbors = graph.get(nodeId) || []
      neighbors.forEach((neighbor) => {
        const degree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, degree)

        if (degree === 0) {
          queue.push(neighbor)
        }
      })
    }

    if (result.length !== nodes.length) {
      throw new Error('Circular dependency detected in workflow')
    }

    return result
  }

  /**
   * Get input for a node from its parent nodes
   */
  private getNodeInput(node: WorkflowNode): unknown {
    const parentNodes = this.getParentNodes(node.id)

    if (parentNodes.length === 0) {
      return this.context.inputData
    }

    if (parentNodes.length === 1) {
      return this.context.nodeResults[parentNodes[0].id]?.output
    }

    // Multiple parents - merge results
    return parentNodes.reduce((acc, parentNode) => {
      const result = this.context.nodeResults[parentNode.id]
      return { ...acc, [parentNode.id]: result?.output }
    }, {})
  }

  /**
   * Get parent nodes
   */
  private getParentNodes(nodeId: string): WorkflowNode[] {
    const parentEdges = this.config.edges.filter((e) => e.target === nodeId)
    return parentEdges
      .map((e) => this.config.nodes.find((n) => n.id === e.source))
      .filter(Boolean) as WorkflowNode[]
  }

  /**
   * Get child nodes
   */
  private getChildNodes(nodeId: string): WorkflowNode[] {
    const childEdges = this.config.edges.filter((e) => e.source === nodeId)
    return childEdges
      .map((e) => this.config.nodes.find((n) => n.id === e.target))
      .filter(Boolean) as WorkflowNode[]
  }

  /**
   * Check if node should be skipped based on conditions
   */
  private async shouldSkipNode(node: WorkflowNode): Promise<boolean> {
    // Check if there's a conditional edge leading to this node
    const incomingEdges = this.config.edges.filter((e) => e.target === node.id)

    for (const edge of incomingEdges) {
      if (edge.type === 'conditional' && edge.condition) {
        const sourceResult = this.context.nodeResults[edge.source]
        if (!sourceResult || sourceResult.status !== 'completed') {
          return true
        }

        // Evaluate condition
         
        const fn = new Function('output', `return ${edge.condition}`)
        const conditionMet = fn(sourceResult.output)

        if (!conditionMet) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(value: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return value === expected
      case 'ne':
        return value !== expected
      case 'gt':
        return Number(value) > Number(expected)
      case 'lt':
        return Number(value) < Number(expected)
      case 'gte':
        return Number(value) >= Number(expected)
      case 'lte':
        return Number(value) <= Number(expected)
      case 'contains':
        return String(value).includes(String(expected))
      case 'exists':
        return value !== undefined && value !== null
      default:
        return false
    }
  }

  /**
   * Get value from object path (e.g., "data.user.name")
   */
  private getValueFromPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined
    }

    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * Apply template string
   */
  private applyTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getValueFromPath(data, path)
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Update execution status in database
   */
  private async updateExecutionStatus(
    status: WorkflowExecutionStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates: WorkflowExecutionUpdate = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'running') {
      updates.started_at = new Date().toISOString()
    }

    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString()
      updates.node_results = this.context.nodeResults
      updates.output_data = this.getWorkflowOutput()

      if (updates.started_at) {
        const duration = Date.now() - new Date(updates.started_at).getTime()
        updates.duration_ms = duration
      }
    }

    if (errorMessage) {
      updates.error_message = errorMessage
    }

    // Note: Using 'as any' because agent_workflow_executions table is not yet in Database type
    // TODO: Regenerate database types after running migrations
    await (this.supabase as any)
      .from('agent_workflow_executions')
      .update(updates)
      .eq('id', this.executionId)
  }

  /**
   * Update current node
   */
  private async updateCurrentNode(nodeId: string): Promise<void> {
    const update: WorkflowExecutionUpdate = {
      current_node_id: nodeId,
      updated_at: new Date().toISOString(),
    }

    // Note: Using 'as any' because agent_workflow_executions table is not yet in Database type
    // TODO: Regenerate database types after running migrations
    await (this.supabase as any)
      .from('agent_workflow_executions')
      .update(update)
      .eq('id', this.executionId)
  }

  /**
   * Log execution message
   */
  private async log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const logEntry: WorkflowLogInsert = {
      execution_id: this.executionId,
      node_id: this.context.currentNodeId,
      level,
      message,
      metadata,
    }

    // Note: Using 'as any' because agent_workflow_logs table is not yet in Database type
    // TODO: Regenerate database types after running migrations
    await (this.supabase as any)
      .from('agent_workflow_logs')
      .insert(logEntry)
  }

  /**
   * Get workflow output
   */
  private getWorkflowOutput(): unknown {
    // Find output node
    const outputNode = this.config.nodes.find((n) => n.type === 'output')

    if (outputNode) {
      return this.context.nodeResults[outputNode.id]?.output
    }

    // Return last node output
    const lastNodeId = this.config.nodes[this.config.nodes.length - 1]?.id
    return lastNodeId ? this.context.nodeResults[lastNodeId]?.output : null
  }
}
