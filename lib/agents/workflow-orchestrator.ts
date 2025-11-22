/**
 * Workflow Orchestrator
 * Manages agent workflow dependencies and execution chains
 *
 * Handles:
 * - Dependency resolution (topological sort)
 * - Context passing between agents
 * - Workflow execution status
 * - Error handling and retries
 */

import { createClient } from '@/lib/supabase/server'

export interface WorkflowNode {
  assignmentId: string
  agentId: string
  agentType: string
  executionOrder: number
  dependsOn: string[] // Agent IDs this node depends on
  isActive: boolean
  autoExecute: boolean
  executionConfig: Record<string, unknown>
}

export interface WorkflowExecution {
  streamId: string
  workflowId: string
  nodes: WorkflowNode[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  currentNode: string | null
  completedNodes: string[]
  failedNodes: string[]
  context: WorkflowContext
}

export interface WorkflowContext {
  streamId: string
  goalContext: Record<string, unknown>
  sharedData: Record<string, unknown> // Data shared between agents
  agentOutputs: Record<string, unknown> // Output from each agent
  metrics: {
    totalItems: number
    qualityScore: number
    signalsDetected: number
  }
}

export interface DependencyGraph {
  nodes: Map<string, WorkflowNode>
  edges: Map<string, Set<string>> // agentId -> Set of dependent agentIds
  executionLayers: string[][] // Layers of agents that can run in parallel
}

export class WorkflowOrchestrator {
  private supabase: Awaited<ReturnType<typeof createClient>> | null

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Build workflow graph from stream agent assignments
   */
  async buildWorkflowGraph(streamId: string): Promise<DependencyGraph> {
    const supabase = await this.getSupabase()

    // Fetch all agent assignments for the stream
    const { data: assignments, error } = await supabase
      .from('stream_agent_assignments')
      .select(`
        id,
        agent_id,
        execution_order,
        depends_on_agent_ids,
        is_active,
        auto_execute,
        execution_config,
        agent:ai_agents (
          id,
          agent_type,
          name
        )
      `)
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .order('execution_order', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch workflow: ${error.message}`)
    }

    if (!assignments || assignments.length === 0) {
      return {
        nodes: new Map(),
        edges: new Map(),
        executionLayers: []
      }
    }

    // Build nodes map
    const nodes = new Map<string, WorkflowNode>()
    const edges = new Map<string, Set<string>>()

    for (const assignment of assignments) {
      const node: WorkflowNode = {
        assignmentId: assignment.id,
        agentId: assignment.agent_id,
        agentType: assignment.agent?.agent_type,
        executionOrder: assignment.execution_order,
        dependsOn: assignment.depends_on_agent_ids || [],
        isActive: assignment.is_active,
        autoExecute: assignment.auto_execute,
        executionConfig: assignment.execution_config || {}
      }

      nodes.set(assignment.agent_id, node)

      // Build edges (reverse direction for dependency resolution)
      for (const dependencyId of node.dependsOn) {
        if (!edges.has(dependencyId)) {
          edges.set(dependencyId, new Set())
        }
        edges.get(dependencyId)!.add(assignment.agent_id)
      }
    }

    // Compute execution layers (topological sort with layering)
    const executionLayers = this.computeExecutionLayers(nodes, edges)

    return {
      nodes,
      edges,
      executionLayers
    }
  }

  /**
   * Compute execution layers using topological sort
   * Agents in the same layer can run in parallel
   */
  private computeExecutionLayers(
    nodes: Map<string, WorkflowNode>,
    edges: Map<string, Set<string>>
  ): string[][] {
    const layers: string[][] = []
    const processed = new Set<string>()
    const inDegree = new Map<string, number>()

    // Calculate in-degree for each node
    for (const [agentId, node] of nodes) {
      inDegree.set(agentId, node.dependsOn.length)
    }

    // Process nodes layer by layer
    while (processed.size < nodes.size) {
      const currentLayer: string[] = []

      // Find all nodes with in-degree 0
      for (const [agentId, degree] of inDegree) {
        if (degree === 0 && !processed.has(agentId)) {
          currentLayer.push(agentId)
        }
      }

      if (currentLayer.length === 0) {
        // Circular dependency detected
        const remaining = Array.from(nodes.keys()).filter(id => !processed.has(id))
        throw new Error(`Circular dependency detected in workflow. Remaining nodes: ${remaining.join(', ')}`)
      }

      // Add layer to result
      layers.push(currentLayer)

      // Mark nodes as processed and update in-degrees
      for (const agentId of currentLayer) {
        processed.add(agentId)
        inDegree.set(agentId, -1) // Mark as processed

        // Reduce in-degree of dependent nodes
        const dependents = edges.get(agentId) || new Set()
        for (const dependentId of dependents) {
          const currentDegree = inDegree.get(dependentId) || 0
          inDegree.set(dependentId, currentDegree - 1)
        }
      }
    }

    return layers
  }

  /**
   * Execute workflow for a stream
   */
  async executeWorkflow(
    streamId: string,
    initialContext?: Partial<WorkflowContext>
  ): Promise<WorkflowExecution> {
    const supabase = await this.getSupabase()

    // Build workflow graph
    const graph = await this.buildWorkflowGraph(streamId)

    if (graph.nodes.size === 0) {
      throw new Error('No active agents assigned to stream')
    }

    // Fetch stream goal context
    const { data: stream } = await supabase
      .from('streams')
      .select('goal_criteria, target_metrics, current_progress')
      .eq('id', streamId)
      .single()

    // Initialize workflow context
    const context: WorkflowContext = {
      streamId,
      goalContext: stream?.goal_criteria || {},
      sharedData: initialContext?.sharedData || {},
      agentOutputs: {},
      metrics: {
        totalItems: 0,
        qualityScore: 0,
        signalsDetected: 0
      }
    }

    const execution: WorkflowExecution = {
      streamId,
      workflowId: crypto.randomUUID(),
      nodes: Array.from(graph.nodes.values()),
      status: 'running',
      currentNode: null,
      completedNodes: [],
      failedNodes: [],
      context
    }

    console.log(`[WorkflowOrchestrator] Starting workflow for stream ${streamId}`)
    console.log(`[WorkflowOrchestrator] Execution layers: ${graph.executionLayers.length}`)

    // Execute layers sequentially, agents within layer in parallel
    for (let layerIndex = 0; layerIndex < graph.executionLayers.length; layerIndex++) {
      const layer = graph.executionLayers[layerIndex]
      console.log(`[WorkflowOrchestrator] Executing layer ${layerIndex + 1}: ${layer.length} agents`)

      // Execute all agents in this layer in parallel
      const layerPromises = layer.map(agentId =>
        this.executeAgent(agentId, graph.nodes.get(agentId)!, execution)
      )

      try {
        await Promise.all(layerPromises)
      } catch (error) {
        console.error(`[WorkflowOrchestrator] Layer ${layerIndex + 1} failed:`, error)
        execution.status = 'failed'
        throw error
      }
    }

    execution.status = 'completed'
    console.log(`[WorkflowOrchestrator] Workflow completed successfully`)

    return execution
  }

  /**
   * Execute a single agent with context from dependencies
   */
  private async executeAgent(
    agentId: string,
    node: WorkflowNode,
    execution: WorkflowExecution
  ): Promise<void> {
    const supabase = await this.getSupabase()

    console.log(`[WorkflowOrchestrator] Executing agent ${node.agentType} (${agentId})`)

    execution.currentNode = agentId

    try {
      // Gather context from dependency outputs
      const dependencyContext = this.gatherDependencyContext(node, execution)

      // Create execution record
      const { data: execRecord, error: execError } = await supabase
        .from('agent_executions')
        .insert({
          agent_id: agentId,
          stream_id: execution.streamId,
          status: 'running',
          goal_context: execution.context.goalContext,
          input_data: {
            ...node.executionConfig,
            dependencyContext,
            sharedData: execution.context.sharedData
          }
        })
        .select('id')
        .single()

      if (execError) {
        throw new Error(`Failed to create execution record: ${execError.message}`)
      }

      // Create agent task
      const { error: taskError } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agentId,
          org_id: (await this.getOrgId(execution.streamId)),
          task_type: 'stream_execution',
          priority: 10 - node.executionOrder, // Higher execution order = lower priority
          payload: {
            stream_id: execution.streamId,
            execution_id: execRecord.id,
            goal_context: execution.context.goalContext,
            dependency_context: dependencyContext,
            shared_data: execution.context.sharedData,
            ...node.executionConfig
          },
          retry_count: 0,
          max_retries: 3
        })

      if (taskError) {
        throw new Error(`Failed to create agent task: ${taskError.message}`)
      }

      // Wait for execution to complete (poll with timeout)
      const result = await this.waitForExecution(execRecord.id, 300000) // 5 min timeout

      // Store agent output in context
      execution.context.agentOutputs[agentId] = result.output_data || {}

      // Update shared metrics
      if (result.results_summary) {
        execution.context.metrics.totalItems += result.results_summary.items_created || 0
        if (result.results_summary.avg_score) {
          const currentAvg = execution.context.metrics.qualityScore
          const count = execution.completedNodes.length + 1
          execution.context.metrics.qualityScore =
            (currentAvg * (count - 1) + result.results_summary.avg_score) / count
        }
      }

      execution.completedNodes.push(agentId)

      console.log(`[WorkflowOrchestrator] Agent ${node.agentType} completed successfully`)

    } catch (error) {
      console.error(`[WorkflowOrchestrator] Agent ${node.agentType} failed:`, error)
      execution.failedNodes.push(agentId)
      throw error
    }
  }

  /**
   * Gather output context from dependency agents
   */
  private gatherDependencyContext(
    node: WorkflowNode,
    execution: WorkflowExecution
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {}

    for (const depAgentId of node.dependsOn) {
      const depOutput = execution.context.agentOutputs[depAgentId]
      if (depOutput) {
        // Store output by agent type for easy access
        const depNode = execution.nodes.find(n => n.agentId === depAgentId)
        if (depNode) {
          context[depNode.agentType] = depOutput
        }
      }
    }

    return context
  }

  /**
   * Wait for agent execution to complete
   */
  private async waitForExecution(executionId: string, timeout: number): Promise<{
    output_data?: Record<string, unknown>;
    results_summary?: {
      items_created?: number;
      avg_score?: number;
    };
    status: string;
    error_message?: string;
  }> {
    const supabase = await this.getSupabase()
    const startTime = Date.now()
    const pollInterval = 2000 // Poll every 2 seconds

    while (Date.now() - startTime < timeout) {
      const { data: execution } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('id', executionId)
        .single()

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`)
      }

      if (execution.status === 'completed') {
        return execution
      }

      if (execution.status === 'failed') {
        throw new Error(`Execution failed: ${execution.error_message}`)
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Execution timeout after ${timeout}ms`)
  }

  /**
   * Get org ID for stream
   */
  private async getOrgId(streamId: string): Promise<string> {
    const supabase = await this.getSupabase()

    const { data: stream } = await supabase
      .from('streams')
      .select('org_id')
      .eq('id', streamId)
      .single()

    return stream?.org_id
  }

  /**
   * Validate workflow graph for circular dependencies
   */
  async validateWorkflow(streamId: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      const graph = await this.buildWorkflowGraph(streamId)

      // Check for isolated nodes
      const isolatedNodes: string[] = []
      for (const [agentId, node] of graph.nodes) {
        const hasIncoming = node.dependsOn.length > 0
        const hasOutgoing = graph.edges.has(agentId)

        if (!hasIncoming && !hasOutgoing && graph.nodes.size > 1) {
          isolatedNodes.push(agentId)
        }
      }

      if (isolatedNodes.length > 0) {
        errors.push(`Isolated nodes detected: ${isolatedNodes.join(', ')}`)
      }

      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)
      return {
        valid: false,
        errors
      }
    }
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(streamId: string): Promise<{
    totalAgents: number
    activeAgents: number
    layers: number
    canExecute: boolean
    graph: DependencyGraph
  }> {
    const graph = await this.buildWorkflowGraph(streamId)

    return {
      totalAgents: graph.nodes.size,
      activeAgents: Array.from(graph.nodes.values()).filter(n => n.isActive).length,
      layers: graph.executionLayers.length,
      canExecute: graph.nodes.size > 0,
      graph
    }
  }
}

// Singleton instance
let orchestrator: WorkflowOrchestrator | null = null

/**
 * Get workflow orchestrator instance
 */
export function getWorkflowOrchestrator(): WorkflowOrchestrator {
  if (!orchestrator) {
    orchestrator = new WorkflowOrchestrator()
  }
  return orchestrator
}

/**
 * Execute workflow for stream
 */
export async function executeStreamWorkflow(
  streamId: string,
  initialContext?: Partial<WorkflowContext>
): Promise<WorkflowExecution> {
  const orchestrator = getWorkflowOrchestrator()
  return await orchestrator.executeWorkflow(streamId, initialContext)
}

/**
 * Validate stream workflow
 */
export async function validateStreamWorkflow(streamId: string) {
  const orchestrator = getWorkflowOrchestrator()
  return await orchestrator.validateWorkflow(streamId)
}
