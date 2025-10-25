// Workflow Validator - Validates workflow structure and configuration

import {
  WorkflowConfig,
  WorkflowNode,
  WorkflowEdge,
  WorkflowValidationResult,
  WorkflowValidationError,
  WorkflowValidationWarning,
} from '@/types/agent-workflow'

export class WorkflowValidator {
  private config: WorkflowConfig
  private errors: WorkflowValidationError[] = []
  private warnings: WorkflowValidationWarning[] = []

  constructor(config: WorkflowConfig) {
    this.config = config
  }

  /**
   * Validate the workflow
   */
  validate(): WorkflowValidationResult {
    this.errors = []
    this.warnings = []

    // Run all validation checks
    this.validateStructure()
    this.validateNodes()
    this.validateEdges()
    this.validateDAG()
    this.validateAgentConfiguration()
    this.validateConnectivity()

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    }
  }

  /**
   * Validate basic structure
   */
  private validateStructure(): void {
    if (!this.config.nodes || this.config.nodes.length === 0) {
      this.errors.push({
        type: 'invalid_config',
        message: 'Workflow must have at least one node',
      })
    }

    if (!this.config.edges) {
      this.errors.push({
        type: 'invalid_config',
        message: 'Workflow must have edges array',
      })
    }
  }

  /**
   * Validate nodes
   */
  private validateNodes(): void {
    const nodeIds = new Set<string>()

    this.config.nodes.forEach((node) => {
      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        this.errors.push({
          nodeId: node.id,
          type: 'invalid_config',
          message: `Duplicate node ID: ${node.id}`,
        })
      }
      nodeIds.add(node.id)

      // Validate node type
      const validTypes = ['trigger', 'agent', 'condition', 'transform', 'delay', 'parallel', 'merge', 'output']
      if (!validTypes.includes(node.type)) {
        this.errors.push({
          nodeId: node.id,
          type: 'invalid_config',
          message: `Invalid node type: ${node.type}`,
        })
      }

      // Validate node data
      this.validateNodeData(node)

      // Check for missing labels
      if (!node.data.label) {
        this.warnings.push({
          nodeId: node.id,
          type: 'missing_label',
          message: `Node ${node.id} is missing a label`,
        })
      }
    })
  }

  /**
   * Validate node-specific data
   */
  private validateNodeData(node: WorkflowNode): void {
    switch (node.type) {
      case 'agent':
        if (!node.data.agentType) {
          this.errors.push({
            nodeId: node.id,
            type: 'invalid_config',
            message: `Agent node ${node.id} is missing agentType`,
          })
        }
        break

      case 'condition':
        if (!node.data.condition) {
          this.errors.push({
            nodeId: node.id,
            type: 'invalid_config',
            message: `Condition node ${node.id} is missing condition configuration`,
          })
        } else {
          const { field, operator, value } = node.data.condition
          if (!field || !operator) {
            this.errors.push({
              nodeId: node.id,
              type: 'invalid_config',
              message: `Condition node ${node.id} has incomplete condition`,
            })
          }
        }
        break

      case 'transform':
        if (!node.data.transformScript) {
          this.errors.push({
            nodeId: node.id,
            type: 'invalid_config',
            message: `Transform node ${node.id} is missing transform script`,
          })
        }
        if (!node.data.transformType) {
          this.errors.push({
            nodeId: node.id,
            type: 'invalid_config',
            message: `Transform node ${node.id} is missing transform type`,
          })
        }
        break

      case 'delay':
        if (node.data.delayMs !== undefined && node.data.delayMs < 0) {
          this.errors.push({
            nodeId: node.id,
            type: 'invalid_config',
            message: `Delay node ${node.id} has negative delay`,
          })
        }
        if (node.data.delayMs !== undefined && node.data.delayMs > 300000) {
          this.warnings.push({
            nodeId: node.id,
            type: 'performance',
            message: `Delay node ${node.id} has delay > 5 minutes`,
          })
        }
        break
    }
  }

  /**
   * Validate edges
   */
  private validateEdges(): void {
    const nodeIds = new Set(this.config.nodes.map((n) => n.id))
    const edgeIds = new Set<string>()

    this.config.edges.forEach((edge) => {
      // Check for duplicate edge IDs
      if (edgeIds.has(edge.id)) {
        this.errors.push({
          edgeId: edge.id,
          type: 'invalid_config',
          message: `Duplicate edge ID: ${edge.id}`,
        })
      }
      edgeIds.add(edge.id)

      // Check if source and target nodes exist
      if (!nodeIds.has(edge.source)) {
        this.errors.push({
          edgeId: edge.id,
          type: 'invalid_config',
          message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
        })
      }

      if (!nodeIds.has(edge.target)) {
        this.errors.push({
          edgeId: edge.id,
          type: 'invalid_config',
          message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
        })
      }

      // Check for self-loops
      if (edge.source === edge.target) {
        this.errors.push({
          edgeId: edge.id,
          type: 'invalid_config',
          message: `Edge ${edge.id} creates a self-loop`,
        })
      }
    })
  }

  /**
   * Validate DAG structure (no cycles)
   */
  private validateDAG(): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const outgoingEdges = this.config.edges.filter((e) => e.source === nodeId)

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) {
            return true
          }
        } else if (recursionStack.has(edge.target)) {
          return true
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    for (const node of this.config.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          this.errors.push({
            type: 'circular_dependency',
            message: 'Workflow contains circular dependencies',
          })
          break
        }
      }
    }
  }

  /**
   * Validate agent configuration
   */
  private validateAgentConfiguration(): void {
    const agentNodes = this.config.nodes.filter((n) => n.type === 'agent')
    const validAgentTypes = [
      'enrichment',
      'scoring',
      'insight',
      'research',
      'financial',
      'legal',
      'market',
      'technical',
      'contacts',
    ]

    agentNodes.forEach((node) => {
      const { agentType } = node.data

      if (agentType && !validAgentTypes.includes(agentType)) {
        this.errors.push({
          nodeId: node.id,
          type: 'missing_agent',
          message: `Unknown agent type: ${agentType}`,
        })
      }
    })
  }

  /**
   * Validate connectivity (all nodes reachable)
   */
  private validateConnectivity(): void {
    // Find start nodes (no incoming edges)
    const startNodes = this.config.nodes.filter((node) => {
      return !this.config.edges.some((e) => e.target === node.id)
    })

    // Find end nodes (no outgoing edges)
    const endNodes = this.config.nodes.filter((node) => {
      return !this.config.edges.some((e) => e.source === node.id)
    })

    if (startNodes.length === 0) {
      this.errors.push({
        type: 'missing_start',
        message: 'Workflow has no start node (all nodes have incoming edges)',
      })
    }

    if (startNodes.length > 1) {
      this.warnings.push({
        type: 'performance',
        message: `Workflow has ${startNodes.length} start nodes`,
      })
    }

    if (endNodes.length === 0) {
      this.errors.push({
        type: 'missing_end',
        message: 'Workflow has no end node (all nodes have outgoing edges)',
      })
    }

    // Check if all nodes are reachable from start nodes
    if (startNodes.length > 0) {
      const reachable = new Set<string>()

      const dfs = (nodeId: string) => {
        if (reachable.has(nodeId)) return
        reachable.add(nodeId)

        const outgoingEdges = this.config.edges.filter((e) => e.source === nodeId)
        outgoingEdges.forEach((edge) => dfs(edge.target))
      }

      startNodes.forEach((node) => dfs(node.id))

      const unreachable = this.config.nodes.filter((node) => !reachable.has(node.id))

      unreachable.forEach((node) => {
        this.errors.push({
          nodeId: node.id,
          type: 'disconnected_node',
          message: `Node ${node.id} is not reachable from any start node`,
        })
      })
    }

    // Check for orphaned nodes (no connections)
    const connectedNodes = new Set<string>()
    this.config.edges.forEach((edge) => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    const orphanedNodes = this.config.nodes.filter((node) => !connectedNodes.has(node.id))

    orphanedNodes.forEach((node) => {
      if (node.type !== 'trigger') {
        this.warnings.push({
          nodeId: node.id,
          type: 'unused_output',
          message: `Node ${node.id} has no connections`,
        })
      }
    })
  }

  /**
   * Validate workflow for specific use case
   */
  static validateForExecution(config: WorkflowConfig): WorkflowValidationResult {
    const validator = new WorkflowValidator(config)
    return validator.validate()
  }

  /**
   * Quick validation (structure only)
   */
  static quickValidate(config: WorkflowConfig): boolean {
    const validator = new WorkflowValidator(config)
    validator.validateStructure()
    validator.validateDAG()
    return validator.errors.length === 0
  }
}
