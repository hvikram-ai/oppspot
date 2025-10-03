'use client'

/**
 * Agent List Component
 * Display and manage agents assigned to a stream
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Brain,
  Plus,
  MoreVertical,
  Edit,
  Play,
  Pause,
  Trash2,
  Target,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  GitBranch,
  List
} from 'lucide-react'
import { AgentConfigDialog } from './agent-config-dialog'
import { WorkflowVisualizer } from './workflow-visualizer'
import { formatDistanceToNow } from 'date-fns'

const AGENT_ICONS: Record<string, typeof Brain> = {
  opportunity_bot: Target,
  enrichment_agent: Sparkles,
  scoring_agent: Zap
}

interface Agent {
  id: string
  agent_type: string
  name: string
  description?: string
  is_active: boolean
  auto_execute: boolean
  execution_order: number
  configuration: Record<string, any>
  total_executions?: number
  successful_executions?: number
  last_executed_at?: string
  avg_execution_time_ms?: number
}

interface AgentListProps {
  streamId: string
  agents: Agent[]
  onAgentAdded?: () => void
  onAgentUpdated?: () => void
  onAgentDeleted?: () => void
  onExecuteAgent?: (agentId: string) => void
}

export function AgentList({
  streamId,
  agents,
  onAgentAdded,
  onAgentUpdated,
  onAgentDeleted,
  onExecuteAgent
}: AgentListProps) {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'workflow'>('list')
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false)

  const handleAddAgent = async (agentConfig: any) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentConfig)
      })

      if (!response.ok) throw new Error('Failed to add agent')

      onAgentAdded?.()
    } catch (error) {
      console.error('Error adding agent:', error)
      throw error
    }
  }

  const handleUpdateAgent = async (agentConfig: any) => {
    if (!editingAgent) return

    try {
      const response = await fetch(`/api/streams/${streamId}/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentConfig)
      })

      if (!response.ok) throw new Error('Failed to update agent')

      onAgentUpdated?.()
      setEditingAgent(null)
    } catch (error) {
      console.error('Error updating agent:', error)
      throw error
    }
  }

  const handleDeleteAgent = async () => {
    if (!deletingAgent) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/streams/${streamId}/agents/${deletingAgent.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete agent')

      onAgentDeleted?.()
      setDeletingAgent(null)
    } catch (error) {
      console.error('Error deleting agent:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !agent.is_active })
      })

      if (!response.ok) throw new Error('Failed to toggle agent')

      onAgentUpdated?.()
    } catch (error) {
      console.error('Error toggling agent:', error)
    }
  }

  const handleExecuteWorkflow = async () => {
    setIsExecutingWorkflow(true)
    try {
      const response = await fetch(`/api/streams/${streamId}/workflow/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        alert('Workflow execution started! Agents will run in sequence.')
      }
    } catch (error) {
      console.error('Error executing workflow:', error)
    } finally {
      setIsExecutingWorkflow(false)
    }
  }

  // Sort agents by execution order
  const sortedAgents = [...agents].sort((a, b) => a.execution_order - b.execution_order)

  // Transform agents for workflow visualizer
  const assignments = agents.map(agent => ({
    id: agent.id,
    agent_id: agent.id,
    agent: {
      id: agent.id,
      agent_type: agent.agent_type,
      name: agent.name,
      is_active: agent.is_active,
      execution_order: agent.execution_order
    },
    depends_on_agent_ids: [], // Would need to fetch this from API
    execution_order: agent.execution_order,
    is_active: agent.is_active,
    auto_execute: agent.auto_execute,
    total_executions: agent.total_executions || 0,
    successful_executions: agent.successful_executions || 0
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Agents ({agents.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Autonomous agents working on this stream
          </p>
        </div>
        <div className="flex gap-2">
          {agents.length > 0 && (
            <Button
              variant="outline"
              onClick={handleExecuteWorkflow}
              disabled={isExecutingWorkflow}
            >
              <Play className="h-4 w-4 mr-2" />
              Execute Workflow
            </Button>
          )}
          <Button onClick={() => setIsConfigDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {agents.length > 0 && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'workflow')}>
          <TabsList>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              Agent List
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <GitBranch className="h-4 w-4 mr-2" />
              Workflow View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-4">
            <WorkflowVisualizer
              streamId={streamId}
              assignments={assignments}
              onExecuteWorkflow={handleExecuteWorkflow}
              isExecuting={isExecutingWorkflow}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4">

            {/* Agent List */}
            {sortedAgents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Agents Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add AI agents to automate discovery, enrichment, and scoring
            </p>
            <Button onClick={() => setIsConfigDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Agent
            </Button>
          </CardContent>
        </Card>
            ) : (
              <div className="space-y-3">
                {sortedAgents.map((agent) => {
            const Icon = AGENT_ICONS[agent.agent_type] || Brain
            const successRate = agent.total_executions
              ? Math.round((agent.successful_executions! / agent.total_executions) * 100)
              : 0

            return (
              <Card key={agent.id} className={!agent.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icon */}
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {agent.auto_execute && (
                            <Badge variant="outline" className="text-xs">
                              Auto
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Order: {agent.execution_order}
                          </Badge>
                        </div>

                        {agent.description && (
                          <CardDescription className="text-sm">
                            {agent.description}
                          </CardDescription>
                        )}

                        {/* Execution Stats */}
                        {agent.total_executions && agent.total_executions > 0 && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>{agent.total_executions} runs</span>
                            </div>
                            {agent.successful_executions !== undefined && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{successRate}% success</span>
                              </div>
                            )}
                            {agent.last_executed_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatDistanceToNow(new Date(agent.last_executed_at), {
                                    addSuffix: true
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {agent.is_active && onExecuteAgent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onExecuteAgent(agent.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingAgent(agent)
                              setIsConfigDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Configuration
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(agent)}>
                            {agent.is_active ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingAgent(agent)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Agent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Show simple list for no agents */}
      {agents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Agents Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add AI agents to automate discovery, enrichment, and scoring
            </p>
            <Button onClick={() => setIsConfigDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <AgentConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={(open) => {
          setIsConfigDialogOpen(open)
          if (!open) setEditingAgent(null)
        }}
        streamId={streamId}
        existingAgent={editingAgent}
        existingAgents={agents}
        onSave={editingAgent ? handleUpdateAgent : handleAddAgent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAgent?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
