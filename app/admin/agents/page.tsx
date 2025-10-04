'use client'

/**
 * AI Agents Admin Dashboard
 * Manage autonomous AI agents (OpportunityBot, Scout Agent, etc.)
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AgentWizard } from '@/components/agents/agent-wizard'
import { toast } from 'sonner'
import {
  Play,
  Pause,
  Trash2,
  Plus,
  Bot,
  Search,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react'

interface AgentMetrics {
  durationMs?: number
  itemsProcessed?: number
  apiCalls?: number
  tokensUsed?: number
  cost?: number
}

interface Agent {
  id: string
  name: string
  agent_type: string
  description: string
  is_active: boolean
  schedule_cron: string | null
  last_run_at: string | null
  next_run_at: string | null
  configuration: Record<string, unknown>
  created_at: string
}

interface AgentExecution {
  id: string
  agent_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  output_data: unknown
  error_message: string | null
  metrics: AgentMetrics | null
  created_at: string
}

const agentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  opportunity_bot: TrendingUp,
  scout_agent: Search,
  research_gpt: Bot,
  scoring_agent: Activity,
  writer_agent: Bot,
  relationship_agent: Bot,
}

const agentTypeLabels: Record<string, string> = {
  opportunity_bot: 'OpportunityBot',
  scout_agent: 'Scout Agent',
  research_gpt: 'ResearchGPT',
  scoring_agent: 'Scoring Agent',
  writer_agent: 'Writer Agent',
  relationship_agent: 'Relationship Agent',
}

export default function AgentsAdminPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [executions] = useState<AgentExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  useEffect(() => {
    loadAgents()
    loadExecutions()
  }, [])

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()

      if (data.success) {
        setAgents(data.agents || [])
      }
    } catch (err: unknown) {
      console.error('Failed to load agents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExecutions = async () => {
    try {
      // TODO: Create API endpoint for executions
      // const response = await fetch('/api/agents/executions')
      // const data = await response.json()
      // setExecutions(data.executions || [])
    } catch (err: unknown) {
      console.error('Failed to load executions:', err)
    }
  }

  const runAgent = async (agentId: string) => {
    setRunningAgentId(agentId)
    setError(null)

    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ async: true })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Agent queued successfully! Check Inngest dashboard for progress.`)
        loadExecutions()
      } else {
        throw new Error(data.error || 'Failed to run agent')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run agent')
    } finally {
      setRunningAgentId(null)
    }
  }

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        loadAgents()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle agent')
    }
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadAgents()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent')
    }
  }

  const handleCreateAgent = async (data: {
    name: string;
    agent_type: string;
    description: string;
    configuration: Record<string, unknown>;
    schedule_cron?: string
  }) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Agent "${data.name}" created successfully!`)
        loadAgents()
      } else {
        throw new Error(result.error || 'Failed to create agent')
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading agents...</div>
      </div>
    )
  }

  const activeAgents = agents.filter(a => a.is_active)
  const inactiveAgents = agents.filter(a => !a.is_active)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">
            Manage autonomous AI agents for deal finding and signal monitoring
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Agent Creation Wizard */}
      <AgentWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onComplete={handleCreateAgent}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAgents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.schedule_cron).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAgents.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveAgents.length})</TabsTrigger>
          <TabsTrigger value="all">All ({agents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeAgents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active agents. Create one to get started!
              </CardContent>
            </Card>
          ) : (
            activeAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onRun={runAgent}
                onToggle={toggleAgent}
                onDelete={deleteAgent}
                isRunning={runningAgentId === agent.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4 mt-4">
          {inactiveAgents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No inactive agents
              </CardContent>
            </Card>
          ) : (
            inactiveAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onRun={runAgent}
                onToggle={toggleAgent}
                onDelete={deleteAgent}
                isRunning={runningAgentId === agent.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onRun={runAgent}
              onToggle={toggleAgent}
              onDelete={deleteAgent}
              isRunning={runningAgentId === agent.id}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AgentCard({
  agent,
  onRun,
  onToggle,
  onDelete,
  isRunning
}: {
  agent: Agent
  onRun: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  isRunning: boolean
}) {
  const Icon = agentTypeIcons[agent.agent_type] || Bot

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                {agent.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {agent.description || agentTypeLabels[agent.agent_type]}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRun(agent.id)}
              disabled={isRunning || !agent.is_active}
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Now'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggle(agent.id, agent.is_active)}
            >
              {agent.is_active ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(agent.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Type</div>
            <div className="font-medium">{agentTypeLabels[agent.agent_type]}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Schedule</div>
            <div className="font-medium">
              {agent.schedule_cron ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {agent.schedule_cron}
                </span>
              ) : (
                'Manual'
              )}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Run</div>
            <div className="font-medium">
              {agent.last_run_at
                ? new Date(agent.last_run_at).toLocaleString()
                : 'Never'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Next Run</div>
            <div className="font-medium">
              {agent.next_run_at
                ? new Date(agent.next_run_at).toLocaleString()
                : 'Not scheduled'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
