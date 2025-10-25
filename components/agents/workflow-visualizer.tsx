'use client'

/**
 * Workflow Visualizer
 * Visual representation of agent dependency workflow
 */

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, CheckCircle2, AlertCircle, Loader2, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  agent_type: string
  name: string
  is_active: boolean
  execution_order: number
}

interface Assignment {
  id: string
  agent_id: string
  agent: Agent
  depends_on_agent_ids: string[]
  execution_order: number
  is_active: boolean
  auto_execute: boolean
  total_executions: number
  successful_executions: number
}

interface WorkflowVisualizerProps {
  streamId: string
  assignments: Assignment[]
  onExecuteWorkflow?: () => void
  isExecuting?: boolean
}

interface WorkflowLayer {
  layer: number
  agents: Assignment[]
}

export function WorkflowVisualizer({
  streamId,
  assignments,
  onExecuteWorkflow,
  isExecuting = false
}: WorkflowVisualizerProps) {
  const [layers, setLayers] = useState<WorkflowLayer[]>([])
  const [workflowStatus, setWorkflowStatus] = useState<{
    valid: boolean
    errors: string[]
  } | null>(null)

  /**
   * Compute execution layers for visualization
   */
  const computeLayers = useCallback(() => {
    if (!assignments || assignments.length === 0) {
      setLayers([])
      return
    }

    const agentMap = new Map(assignments.map(a => [a.agent_id, a]))
    const inDegree = new Map<string, number>()
    const processed = new Set<string>()
    const layerList: WorkflowLayer[] = []

    // Calculate in-degree
    for (const assignment of assignments) {
      inDegree.set(assignment.agent_id, assignment.depends_on_agent_ids.length)
    }

    // Compute layers
    let layerNum = 0
    while (processed.size < assignments.length && layerNum < 10) {
      const currentLayer: Assignment[] = []

      // Find agents with in-degree 0
      for (const [agentId, degree] of inDegree) {
        if (degree === 0 && !processed.has(agentId)) {
          const assignment = agentMap.get(agentId)
          if (assignment) {
            currentLayer.push(assignment)
          }
        }
      }

      if (currentLayer.length === 0) break

      layerList.push({
        layer: layerNum,
        agents: currentLayer
      })

      // Update in-degrees
      for (const assignment of currentLayer) {
        processed.add(assignment.agent_id)
        inDegree.set(assignment.agent_id, -1)

        // Find dependents and reduce their in-degree
        for (const other of assignments) {
          if (other.depends_on_agent_ids.includes(assignment.agent_id)) {
            const currentDegree = inDegree.get(other.agent_id) || 0
            inDegree.set(other.agent_id, currentDegree - 1)
          }
        }
      }

      layerNum++
    }

    setLayers(layerList)
  }, [assignments])

  /**
   * Validate workflow for circular dependencies
   */
  const validateWorkflow = useCallback(async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/workflow/validate`)
      if (response.ok) {
        const data = await response.json()
        setWorkflowStatus(data)
      }
    } catch (error) {
      console.error('Error validating workflow:', error)
    }
  }, [streamId])

  useEffect(() => {
    computeLayers()
    validateWorkflow()
  }, [computeLayers, validateWorkflow])

  const getAgentIcon = (agentType: string) => {
    const icons: Record<string, string> = {
      opportunity_bot: '🎯',
      scout_agent: '🔍',
      research_gpt: '📊',
      enrichment_agent: '💎',
      scoring_agent: '⭐'
    }
    return icons[agentType] || '🤖'
  }

  const getAgentColor = (agentType: string) => {
    const colors: Record<string, string> = {
      opportunity_bot: 'bg-purple-500',
      scout_agent: 'bg-blue-500',
      research_gpt: 'bg-green-500',
      enrichment_agent: 'bg-yellow-500',
      scoring_agent: 'bg-orange-500'
    }
    return colors[agentType] || 'bg-gray-500'
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No agents assigned to this stream</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add agents to create a workflow
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Agent Workflow
              </CardTitle>
              <CardDescription>
                {layers.length} execution layer{layers.length !== 1 ? 's' : ''} • {assignments.length} agent{assignments.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            {onExecuteWorkflow && (
              <Button
                onClick={onExecuteWorkflow}
                disabled={isExecuting || workflowStatus?.valid === false}
                size="sm"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Workflow
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        {workflowStatus?.valid === false && (
          <CardContent>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-100">Workflow Validation Errors</h4>
                  <ul className="mt-2 space-y-1">
                    {workflowStatus.errors.map((error, i) => (
                      <li key={i} className="text-sm text-red-800 dark:text-red-200">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Workflow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution Flow</CardTitle>
          <CardDescription>Agents execute from left to right, layer by layer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {layers.map((layer, layerIndex) => (
              <div key={layer.layer} className="relative">
                {/* Layer Label */}
                <div className="absolute -left-12 top-1/2 -translate-y-1/2">
                  <Badge variant="outline" className="text-xs">
                    Layer {layer.layer + 1}
                  </Badge>
                </div>

                {/* Layer Content */}
                <div className="flex items-center gap-4">
                  {/* Agents in this layer */}
                  <div className="flex flex-wrap gap-4 flex-1">
                    {layer.agents.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={cn(
                          "relative group",
                          !assignment.is_active && "opacity-50"
                        )}
                      >
                        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 bg-card hover:bg-accent/50 transition-colors min-w-[140px]">
                          {/* Agent Icon */}
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                            getAgentColor(assignment.agent.agent_type),
                            "text-white shadow-md"
                          )}>
                            {getAgentIcon(assignment.agent.agent_type)}
                          </div>

                          {/* Agent Info */}
                          <div className="text-center">
                            <div className="font-medium text-sm">
                              {assignment.agent.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Order: {assignment.execution_order}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex gap-2 text-xs">
                            {assignment.total_executions > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {assignment.successful_executions}/{assignment.total_executions}
                                <CheckCircle2 className="h-3 w-3 ml-1" />
                              </Badge>
                            )}
                            {assignment.auto_execute && (
                              <Badge variant="outline" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>

                          {/* Dependencies Indicator */}
                          {assignment.depends_on_agent_ids.length > 0 && (
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" title="Has dependencies" />
                            </div>
                          )}
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border text-xs whitespace-nowrap">
                            <div className="font-semibold mb-1">{assignment.agent.name}</div>
                            <div className="space-y-1 text-muted-foreground">
                              <div>Type: {assignment.agent.agent_type}</div>
                              <div>Executions: {assignment.total_executions}</div>
                              {assignment.depends_on_agent_ids.length > 0 && (
                                <div>Dependencies: {assignment.depends_on_agent_ids.length}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Arrow to next layer */}
                  {layerIndex < layers.length - 1 && (
                    <div className="flex items-center">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Dependency Lines (simplified) */}
                {layer.agents.some(a => a.depends_on_agent_ids.length > 0) && (
                  <div className="text-xs text-muted-foreground mt-2 pl-4">
                    {layer.agents
                      .filter(a => a.depends_on_agent_ids.length > 0)
                      .map(a => (
                        <div key={a.id}>
                          {a.agent.name} depends on {a.depends_on_agent_ids.length} agent(s)
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Has dependencies</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Auto</Badge>
                <span className="text-muted-foreground">Auto-executes after dependencies</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">3/5</Badge>
                <span className="text-muted-foreground">Success rate (successful/total)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Agents in the same layer execute in parallel for speed</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Each layer waits for the previous layer to complete</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Context and data are passed from dependencies to dependent agents</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
