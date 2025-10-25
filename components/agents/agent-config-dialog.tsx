'use client'

/**
 * Agent Configuration Dialog
 * Configure AI agents for a stream
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Brain, Sparkles, Target, Zap, Info, Plus, Save, GitBranch, ArrowRight } from 'lucide-react'
import { OpportunityBotConfig } from './config-forms/opportunity-bot-config'
import { EnrichmentAgentConfig } from './config-forms/enrichment-agent-config'
import { ScoringAgentConfig } from './config-forms/scoring-agent-config'

const AGENT_TYPES = [
  {
    id: 'opportunity_bot',
    name: 'OpportunityBot',
    description: 'Discovers companies matching your ICP criteria',
    icon: Target,
    color: 'text-blue-600',
    capabilities: ['Company Discovery', 'ICP Matching', 'Buying Signal Detection']
  },
  {
    id: 'enrichment_agent',
    name: 'Enrichment Agent',
    description: 'Enriches companies with additional data',
    icon: Sparkles,
    color: 'text-purple-600',
    capabilities: ['Data Enrichment', 'Tech Stack Detection', 'Social Media Analysis']
  },
  {
    id: 'scoring_agent',
    name: 'Scoring Agent',
    description: 'Scores and prioritizes companies',
    icon: Zap,
    color: 'text-yellow-600',
    capabilities: ['Quality Scoring', 'Prioritization', 'Lead Ranking']
  },
]

interface AgentConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamId?: string
  existingAgent?: Record<string, unknown>
  existingAgents?: Array<{
    id: string
    name: string
    agent_type: string
    execution_order?: number
  }> // All agents in the stream
  onSave?: (agentConfig: Record<string, unknown>) => void
}

export function AgentConfigDialog({
  open,
  onOpenChange,
  streamId,
  existingAgent,
  existingAgents = [],
  onSave
}: AgentConfigDialogProps) {
  const [selectedType, setSelectedType] = useState<string>((existingAgent?.agent_type as string) || 'opportunity_bot')
  const [step, setStep] = useState<'select-type' | 'configure'>('select-type')
  const [isSaving, setIsSaving] = useState(false)

  // Basic agent info
  const [agentName, setAgentName] = useState((existingAgent?.name as string) || '')
  const [agentDescription, setAgentDescription] = useState((existingAgent?.description as string) || '')
  const [isActive, setIsActive] = useState((existingAgent?.is_active as boolean) ?? true)
  const [autoExecute, setAutoExecute] = useState((existingAgent?.auto_execute as boolean) ?? false)
  const [executionOrder, setExecutionOrder] = useState((existingAgent?.execution_order as number) || 1)
  const [dependsOnAgentIds, setDependsOnAgentIds] = useState<string[]>(
    (existingAgent?.depends_on_agent_ids as string[]) || []
  )

  // Agent-specific configuration
  const [configuration, setConfiguration] = useState<Record<string, any>>(
    (existingAgent?.configuration as Record<string, any>) || {}
  )

  useEffect(() => {
    if (existingAgent) {
      setStep('configure')
      setSelectedType(existingAgent.agent_type as string)
      setAgentName(existingAgent.name as string)
      setAgentDescription((existingAgent.description as string) || '')
      setIsActive((existingAgent.is_active as boolean) ?? true)
      setAutoExecute((existingAgent.auto_execute as boolean) ?? false)
      setExecutionOrder((existingAgent.execution_order as number) || 1)
      setDependsOnAgentIds((existingAgent.depends_on_agent_ids as string[]) || [])
      setConfiguration((existingAgent.configuration as Record<string, any>) || {})
    }
  }, [existingAgent])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const agentConfig = {
        agent_type: selectedType,
        name: agentName,
        description: agentDescription,
        is_active: isActive,
        auto_execute: autoExecute,
        execution_order: executionOrder,
        depends_on_agent_ids: dependsOnAgentIds,
        configuration,
        stream_id: streamId
      }

      if (onSave) {
        await onSave(agentConfig)
      }

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error saving agent:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setStep('select-type')
    setSelectedType('opportunity_bot')
    setAgentName('')
    setAgentDescription('')
    setIsActive(true)
    setAutoExecute(false)
    setExecutionOrder(1)
    setDependsOnAgentIds([])
    setConfiguration({})
  }

  const handleNext = () => {
    if (step === 'select-type') {
      // Auto-fill name based on type
      if (!agentName) {
        const agentType = AGENT_TYPES.find(t => t.id === selectedType)
        setAgentName(agentType?.name || '')
      }
      setStep('configure')
    }
  }

  const handleBack = () => {
    setStep('select-type')
  }

  const selectedAgentType = AGENT_TYPES.find(t => t.id === selectedType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {existingAgent ? 'Edit Agent Configuration' : 'Configure AI Agent'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select-type'
              ? 'Choose the type of AI agent to add to your stream'
              : `Configure ${selectedAgentType?.name} for your stream`}
          </DialogDescription>
        </DialogHeader>

        {step === 'select-type' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {AGENT_TYPES.map((agentType) => {
                const Icon = agentType.icon
                const isSelected = selectedType === agentType.id

                return (
                  <Card
                    key={agentType.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedType(agentType.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-muted`}>
                          <Icon className={`h-6 w-6 ${agentType.color}`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{agentType.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {agentType.description}
                          </CardDescription>
                        </div>
                        {isSelected && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {agentType.capabilities.map((capability) => (
                          <Badge key={capability} variant="outline" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {step === 'configure' && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    placeholder="e.g., Sales Lead Finder"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A friendly name to identify this agent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-description">Description (Optional)</Label>
                  <Textarea
                    id="agent-description"
                    placeholder="What does this agent do?"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Agent can be executed when active
                    </p>
                  </div>
                  <Switch
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="configuration" className="space-y-4">
              {selectedType === 'opportunity_bot' && (
                <OpportunityBotConfig
                  configuration={configuration}
                  onChange={setConfiguration}
                />
              )}
              {selectedType === 'enrichment_agent' && (
                <EnrichmentAgentConfig
                  configuration={configuration}
                  onChange={setConfiguration}
                />
              )}
              {selectedType === 'scoring_agent' && (
                <ScoringAgentConfig
                  configuration={configuration}
                  onChange={setConfiguration}
                />
              )}
            </TabsContent>

            <TabsContent value="execution" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-execute">Auto-Execute</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically run when dependencies complete
                    </p>
                  </div>
                  <Switch
                    id="auto-execute"
                    checked={autoExecute}
                    onCheckedChange={setAutoExecute}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="execution-order">Execution Order</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="execution-order"
                      min={1}
                      max={10}
                      step={1}
                      value={[executionOrder]}
                      onValueChange={([value]) => setExecutionOrder(value)}
                      className="flex-1"
                    />
                    <Badge variant="outline" className="min-w-[3rem] justify-center">
                      {executionOrder}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lower numbers execute first. Use this to create agent workflows.
                  </p>
                </div>

                {/* Dependencies Selector */}
                {existingAgents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Agent Dependencies
                      </CardTitle>
                      <CardDescription className="text-xs">
                        This agent will wait for selected agents to complete before executing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {existingAgents.filter(a => a.id !== existingAgent?.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No other agents available</p>
                      ) : (
                        <div className="space-y-2">
                          {existingAgents
                            .filter(a => a.id !== existingAgent?.id)
                            .map((agent) => (
                              <div
                                key={agent.id}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                              >
                                <Checkbox
                                  id={`dep-${agent.id}`}
                                  checked={dependsOnAgentIds.includes(agent.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setDependsOnAgentIds([...dependsOnAgentIds, agent.id])
                                    } else {
                                      setDependsOnAgentIds(dependsOnAgentIds.filter(id => id !== agent.id))
                                    }
                                  }}
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`dep-${agent.id}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {agent.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {agent.agent_type} • Order: {agent.execution_order}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {agent.execution_order}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      )}

                      {dependsOnAgentIds.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="flex-1 text-xs">
                              <p className="font-medium text-blue-900 dark:text-blue-100">Execution Flow:</p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                {existingAgents
                                  .filter(a => dependsOnAgentIds.includes(a.id))
                                  .map(a => a.name)
                                  .join(' → ')} → <strong>{agentName || 'This Agent'}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Agent Workflow Example
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p>Create multi-agent workflows by selecting dependencies:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>OpportunityBot discovers companies (no dependencies)</li>
                      <li>Enrichment Agent enriches them (depends on OpportunityBot)</li>
                      <li>Scoring Agent scores results (depends on Enrichment Agent)</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          {step === 'configure' && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {step === 'select-type' ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving || !agentName}>
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {existingAgent ? 'Update Agent' : 'Add Agent'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
