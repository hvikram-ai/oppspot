'use client'

/**
 * Agent Assignment Panel Component
 * Allows users to assign AI agents to work on their stream/goal
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SuggestedAgent, AgentAssignmentRole } from '@/types/streams'
import {
  Bot,
  Play,
  Pause,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Clock,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface AgentAssignmentPanelProps {
  suggestedAgents: SuggestedAgent[]
  assignedAgents: AssignedAgentConfig[]
  onAssignedAgentsChange: (agents: AssignedAgentConfig[]) => void
}

export interface AssignedAgentConfig {
  agent_type: string
  name: string
  role: AgentAssignmentRole
  order: number
  is_active: boolean
  auto_execute: boolean
  execution_frequency: string
  config: Record<string, unknown>
}

const AGENT_INFO: Record<string, { name: string; description: string; icon: string; color: string }> = {
  opportunity_bot: {
    name: 'OpportunityBot™',
    description: '24/7 autonomous deal finder scanning for ICP matches',
    icon: '🎯',
    color: 'from-green-500 to-emerald-600'
  },
  scout_agent: {
    name: 'Scout Agent',
    description: 'Monitors buying signals like funding, hiring, expansion',
    icon: '🔍',
    color: 'from-blue-500 to-cyan-600'
  },
  research_gpt: {
    name: 'ResearchGPT™',
    description: 'Deep company intelligence and analysis',
    icon: '🧠',
    color: 'from-purple-500 to-pink-600'
  },
  scoring_agent: {
    name: 'Scoring Agent',
    description: 'Lead scoring and prioritization',
    icon: '📊',
    color: 'from-orange-500 to-red-600'
  }
}

const FREQUENCY_OPTIONS = [
  { value: 'on_demand', label: 'On Demand' },
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'triggered', label: 'Event Triggered' }
]

const ROLE_OPTIONS: { value: AgentAssignmentRole; label: string; description: string }[] = [
  { value: 'primary', label: 'Primary', description: 'Main agent for this goal' },
  { value: 'enrichment', label: 'Enrichment', description: 'Adds additional data' },
  { value: 'scoring', label: 'Scoring', description: 'Ranks and prioritizes' },
  { value: 'monitoring', label: 'Monitoring', description: 'Watches for signals' },
  { value: 'notification', label: 'Notification', description: 'Sends alerts' }
]

export function AgentAssignmentPanel({
  suggestedAgents,
  assignedAgents,
  onAssignedAgentsChange
}: AgentAssignmentPanelProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())

  const toggleExpanded = (agentType: string) => {
    const newExpanded = new Set(expandedAgents)
    if (newExpanded.has(agentType)) {
      newExpanded.delete(agentType)
    } else {
      newExpanded.add(agentType)
    }
    setExpandedAgents(newExpanded)
  }

  const isAgentAssigned = (agentType: string) => {
    return assignedAgents.some(a => a.agent_type === agentType)
  }

  const getAssignedAgent = (agentType: string) => {
    return assignedAgents.find(a => a.agent_type === agentType)
  }

  const toggleAgent = (agent: SuggestedAgent) => {
    const existing = getAssignedAgent(agent.agent_type)

    if (existing) {
      // Remove agent
      onAssignedAgentsChange(assignedAgents.filter(a => a.agent_type !== agent.agent_type))
    } else {
      // Add agent
      const newAgent: AssignedAgentConfig = {
        agent_type: agent.agent_type,
        name: AGENT_INFO[agent.agent_type]?.name || agent.agent_type,
        role: agent.role,
        order: agent.order,
        is_active: true,
        auto_execute: agent.role === 'primary', // Auto-execute primary agents
        execution_frequency: agent.role === 'primary' ? 'daily' : 'on_demand',
        config: agent.config || {}
      }
      onAssignedAgentsChange([...assignedAgents, newAgent].sort((a, b) => a.order - b.order))
    }
  }

  const updateAgent = (agentType: string, updates: Partial<AssignedAgentConfig>) => {
    onAssignedAgentsChange(
      assignedAgents.map(agent =>
        agent.agent_type === agentType ? { ...agent, ...updates } : agent
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Assign AI Agents</h3>
        <p className="text-sm text-muted-foreground">
          Select agents to work on this goal. They'll execute autonomously based on your criteria.
        </p>
      </div>

      {/* Suggested Agents */}
      <div className="space-y-3">
        {suggestedAgents.map((agent) => {
          const info = AGENT_INFO[agent.agent_type]
          const assigned = getAssignedAgent(agent.agent_type)
          const isExpanded = expandedAgents.has(agent.agent_type)

          return (
            <Card
              key={agent.agent_type}
              className={cn(
                "transition-all",
                assigned && "border-primary ring-1 ring-primary/20"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br",
                      info?.color || "from-gray-400 to-gray-500"
                    )}>
                      {info?.icon || '🤖'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{info?.name || agent.agent_type}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {ROLE_OPTIONS.find(r => r.value === agent.role)?.label || agent.role}
                        </Badge>
                        {agent.order && (
                          <Badge variant="secondary" className="text-xs">
                            Step {agent.order}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {info?.description || 'AI agent'}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!assigned}
                      onCheckedChange={() => toggleAgent(agent)}
                    />
                    {assigned && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(agent.agent_type)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {assigned && isExpanded && (
                <CardContent className="space-y-4 border-t pt-4">
                  {/* Active Status */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${agent.agent_type}-active`} className="text-sm">
                      Agent Active
                    </Label>
                    <Switch
                      id={`${agent.agent_type}-active`}
                      checked={assigned.is_active}
                      onCheckedChange={(checked) => updateAgent(agent.agent_type, { is_active: checked })}
                    />
                  </div>

                  {/* Auto Execute */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${agent.agent_type}-auto`} className="text-sm">
                        Auto Execute
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Run automatically on schedule
                      </p>
                    </div>
                    <Switch
                      id={`${agent.agent_type}-auto`}
                      checked={assigned.auto_execute}
                      onCheckedChange={(checked) => updateAgent(agent.agent_type, { auto_execute: checked })}
                    />
                  </div>

                  {/* Execution Frequency */}
                  {assigned.auto_execute && (
                    <div className="space-y-2">
                      <Label className="text-sm">Execution Frequency</Label>
                      <Select
                        value={assigned.execution_frequency}
                        onValueChange={(value) => updateAgent(agent.agent_type, { execution_frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Role */}
                  <div className="space-y-2">
                    <Label className="text-sm">Agent Role</Label>
                    <Select
                      value={assigned.role}
                      onValueChange={(value: AgentAssignmentRole) => updateAgent(agent.agent_type, { role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      {assignedAgents.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-2">
                  {assignedAgents.length} {assignedAgents.length === 1 ? 'agent' : 'agents'} assigned
                </p>
                <div className="space-y-1.5">
                  {assignedAgents.map((agent, idx) => (
                    <div key={agent.agent_type} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{idx + 1}.</span>
                        <span>{agent.name}</span>
                      </div>
                      <span>→</span>
                      <span>{agent.auto_execute ? `Auto (${agent.execution_frequency})` : 'Manual'}</span>
                      {agent.is_active ? (
                        <Badge variant="outline" className="text-xs">
                          <Check className="h-2.5 w-2.5 mr-0.5" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Pause className="h-2.5 w-2.5 mr-0.5" />
                          Paused
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
