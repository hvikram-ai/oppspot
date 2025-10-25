// Agent Workflow Builder Types

import { Database } from './database'

// Database row types
export type AgentWorkflow = Database['public']['Tables']['agent_workflows']['Row']
export type AgentWorkflowExecution = Database['public']['Tables']['agent_workflow_executions']['Row']
export type AgentWorkflowLog = Database['public']['Tables']['agent_workflow_logs']['Row']
export type AgentWorkflowTemplate = Database['public']['Tables']['agent_workflow_templates']['Row']

// Workflow Node Types
export type WorkflowNodeType =
  | 'agent' // Execute an agent
  | 'condition' // Conditional branching
  | 'parallel' // Parallel execution
  | 'merge' // Merge parallel branches
  | 'transform' // Data transformation
  | 'delay' // Time delay
  | 'trigger' // Workflow trigger/start
  | 'output' // Final output node

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface WorkflowNodeData {
  label: string

  // Agent-specific
  agentId?: string
  agentType?: string
  agentConfig?: Record<string, unknown>

  // Condition-specific
  condition?: {
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists'
    value: unknown
  }

  // Transform-specific
  transformScript?: string
  transformType?: 'javascript' | 'jq' | 'template'

  // Delay-specific
  delayMs?: number

  // Output mapping
  outputMapping?: Record<string, string>

  // UI metadata
  color?: string
  icon?: string
  description?: string
}

// Workflow Edge (connection between nodes)
export interface WorkflowEdge {
  id: string
  source: string // Source node ID
  target: string // Target node ID
  sourceHandle?: string // For nodes with multiple outputs
  targetHandle?: string // For nodes with multiple inputs
  label?: string
  type?: 'default' | 'conditional' | 'success' | 'error'
  condition?: string // Conditional edge expression
}

// Complete workflow configuration
export interface WorkflowConfig {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata?: {
    version?: string
    author?: string
    tags?: string[]
    category?: string
  }
}

// Execution status types
export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type WorkflowNodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

// Node execution result
export interface NodeExecutionResult {
  status: WorkflowNodeExecutionStatus
  output?: unknown
  error?: {
    message: string
    stack?: string
  }
  startedAt: string
  completedAt?: string
  durationMs?: number
}

// Workflow execution context
export interface WorkflowExecutionContext {
  executionId: string
  workflowId: string
  inputData: Record<string, unknown>
  nodeResults: Record<string, NodeExecutionResult>
  currentNodeId?: string
  variables: Record<string, unknown>
  triggeredBy?: string
}

// Workflow validation result
export interface WorkflowValidationResult {
  valid: boolean
  errors: WorkflowValidationError[]
  warnings: WorkflowValidationWarning[]
}

export interface WorkflowValidationError {
  nodeId?: string
  edgeId?: string
  type: 'missing_start' | 'missing_end' | 'disconnected_node' | 'circular_dependency' | 'invalid_config' | 'missing_agent'
  message: string
}

export interface WorkflowValidationWarning {
  nodeId?: string
  type: 'unused_output' | 'missing_label' | 'performance' | 'deprecated'
  message: string
}

// Workflow execution options
export interface WorkflowExecutionOptions {
  inputData?: Record<string, unknown>
  timeout?: number // Max execution time in ms
  retryOnFailure?: boolean
  maxRetries?: number
  variables?: Record<string, unknown>
}

// Real-time execution update
export interface WorkflowExecutionUpdate {
  executionId: string
  status: WorkflowExecutionStatus
  currentNodeId?: string
  progress: number // 0-100
  nodeResults: Record<string, NodeExecutionResult>
  error?: {
    message: string
    nodeId?: string
  }
  timestamp: string
}

// Template categories
export type TemplateCategory =
  | 'research'
  | 'enrichment'
  | 'scoring'
  | 'qualification'
  | 'analysis'
  | 'monitoring'
  | 'custom'

// Built-in workflow templates
export interface WorkflowTemplateDefinition {
  name: string
  description: string
  category: TemplateCategory
  config: WorkflowConfig
  requiredAgents: string[] // Agent types needed
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

// Workflow analytics
export interface WorkflowAnalytics {
  workflowId: string
  totalExecutions: number
  successCount: number
  failureCount: number
  averageDurationMs: number
  lastExecutedAt?: string
  popularNodes: Array<{
    nodeId: string
    nodeType: string
    executionCount: number
  }>
}

// Agent node configuration helpers
export interface AgentNodeConfig {
  agentType: 'enrichment' | 'scoring' | 'insight' | 'research' | 'financial' | 'legal' | 'market' | 'technical' | 'contacts'
  config: Record<string, unknown>
  timeout?: number
  retryOnFailure?: boolean
}

// Conditional node configuration
export interface ConditionalNodeConfig {
  conditions: Array<{
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists'
    value: unknown
    targetNodeId: string
  }>
  defaultTargetNodeId?: string
}

// Parallel execution configuration
export interface ParallelNodeConfig {
  branches: Array<{
    id: string
    nodes: string[] // Node IDs to execute in this branch
  }>
  waitForAll: boolean // Wait for all branches or continue on first completion
}

// Transform node configuration
export interface TransformNodeConfig {
  type: 'javascript' | 'jq' | 'template'
  script: string
  inputMapping?: Record<string, string>
  outputMapping?: Record<string, string>
}

// Workflow builder UI state
export interface WorkflowBuilderState {
  workflow: WorkflowConfig
  selectedNodeId?: string
  selectedEdgeId?: string
  isExecuting: boolean
  executionId?: string
  validationResult?: WorkflowValidationResult
  unsavedChanges: boolean
}

// Execution log entry
export interface ExecutionLogEntry {
  id: string
  executionId: string
  nodeId?: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
}

// Export types for API responses
export interface CreateWorkflowRequest {
  name: string
  description?: string
  config: WorkflowConfig
  tags?: string[]
  isTemplate?: boolean
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  config?: WorkflowConfig
  tags?: string[]
  status?: 'draft' | 'active' | 'archived'
}

export interface ExecuteWorkflowRequest {
  inputData?: Record<string, unknown>
  options?: WorkflowExecutionOptions
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  category: TemplateCategory
  workflowConfig: WorkflowConfig
  isPublic?: boolean
}
