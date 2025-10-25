'use client'

// Visual Workflow Builder - React Flow Canvas
// Drag-and-drop interface for building agent workflows

import React, { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { WorkflowConfig, WorkflowNode, WorkflowEdge } from '@/types/agent-workflow'
import { AgentNode } from './nodes/agent-node'
import { TriggerNode } from './nodes/trigger-node'
import { ConditionNode } from './nodes/condition-node'
import { TransformNode } from './nodes/transform-node'
import { OutputNode } from './nodes/output-node'
import { NodePalette } from './node-palette'
import { NodeConfigPanel } from './node-config-panel'
import { Button } from '@/components/ui/button'
import { Save, Play, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

// Custom node types
const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  condition: ConditionNode,
  transform: TransformNode,
  output: OutputNode,
}

interface WorkflowCanvasProps {
  workflowId?: string
  initialConfig?: WorkflowConfig
  onSave?: (config: WorkflowConfig) => Promise<void>
  onExecute?: () => Promise<void>
  readonly?: boolean
}

export function WorkflowCanvas({
  workflowId,
  initialConfig,
  onSave,
  onExecute,
  readonly = false,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      setNodes(initialConfig.nodes as never)
      setEdges(initialConfig.edges as never)
    }
  }, [initialConfig, setNodes, setEdges])

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (readonly) return

      const edge: Edge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        type: 'default',
      } as Edge

      setEdges((eds) => addEdge(edge, eds))
    },
    [readonly, setEdges]
  )

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop (add new node)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readonly) return

      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!reactFlowBounds) return

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        },
      }

      setNodes((nds) => nds.concat(newNode as never))
    },
    [readonly, setNodes]
  )

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Handle node update from config panel
  const onNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            }
          }
          return node
        })
      )
    },
    [setNodes]
  )

  // Validate workflow
  const validateWorkflow = useCallback(async () => {
    setIsValidating(true)
    setValidationErrors([])

    try {
      const config: WorkflowConfig = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as never,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
        })),
      }

      const response = await fetch('/api/agent-workflows/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const result = await response.json()

      if (!result.valid) {
        const errors = result.errors.map((e: { message: string }) => e.message)
        setValidationErrors(errors)
        toast.error('Workflow validation failed', {
          description: `${errors.length} error(s) found`,
        })
      } else {
        toast.success('Workflow is valid!', {
          description: result.warnings?.length
            ? `${result.warnings.length} warning(s)`
            : 'No issues found',
        })
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast.error('Failed to validate workflow')
    } finally {
      setIsValidating(false)
    }
  }, [nodes, edges])

  // Save workflow
  const handleSave = useCallback(async () => {
    if (!onSave) return

    setIsSaving(true)

    try {
      const config: WorkflowConfig = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as never,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
        })),
      }

      await onSave(config)
      toast.success('Workflow saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, onSave])

  return (
    <div className="flex h-full w-full">
      {/* Node Palette */}
      {!readonly && (
        <div className="w-64 border-r bg-white dark:bg-gray-900 p-4">
          <NodePalette />
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />

          {/* Toolbar */}
          <Panel position="top-right" className="flex gap-2">
            <Button
              onClick={validateWorkflow}
              disabled={isValidating || readonly}
              variant="outline"
              size="sm"
            >
              {validationErrors.length > 0 ? (
                <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              )}
              Validate
            </Button>

            {!readonly && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>

                <Button
                  onClick={onExecute}
                  disabled={validationErrors.length > 0}
                  size="sm"
                  variant="default"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </Button>
              </>
            )}
          </Panel>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Panel position="bottom-center">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  Validation Errors
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Node Configuration Panel */}
      {selectedNode && !readonly && (
        <div className="w-80 border-l bg-white dark:bg-gray-900 p-4 overflow-y-auto">
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(data) => onNodeUpdate(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  )
}
