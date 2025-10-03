'use client'

import { AgentAssignmentPanel } from '@/components/streams/agent-assignment-panel'
import { StreamWizardData } from '@/types/stream-wizard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bot, Zap } from 'lucide-react'

interface AgentsStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function AgentsStep({ data, onUpdate }: AgentsStepProps) {
  // Get suggested agents from template or default
  const suggestedAgents = data.goal_template_id
    ? data.assigned_agents.filter(a => a.agent_type) // Agents from template
    : [
        // Default suggestions
        {
          agent_type: 'opportunity_bot',
          role: 'primary' as const,
          order: 1
        },
        {
          agent_type: 'research_gpt',
          role: 'enrichment' as const,
          order: 2
        },
        {
          agent_type: 'scoring_agent',
          role: 'scoring' as const,
          order: 3
        }
      ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Agent Assignment
        </h3>
        <p className="text-sm text-muted-foreground">
          Select AI agents to work on this goal autonomously
        </p>
      </div>

      {/* Auto-assign toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Assign Agents</CardTitle>
          <CardDescription>
            Use recommended agents for this goal type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="auto-assign" className="text-base">
                Enable recommended agents
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign AI agents suggested by the template
              </p>
            </div>
            <Switch
              id="auto-assign"
              checked={data.assign_agents}
              onCheckedChange={(checked) => onUpdate({ assign_agents: checked })}
            />
          </div>

          {data.assign_agents && suggestedAgents.length > 0 && (
            <Alert className="mt-4">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                ⚡ {suggestedAgents.length} recommended agents will be configured for this goal
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      <Card>
        <CardContent className="pt-6">
          <AgentAssignmentPanel
            suggestedAgents={suggestedAgents}
            assignedAgents={data.assigned_agents}
            onAssignedAgentsChange={(agents) => {
              onUpdate({
                assigned_agents: agents,
                assign_agents: agents.length > 0
              })
            }}
          />
        </CardContent>
      </Card>

      {/* Info Card */}
      {data.assigned_agents.length === 0 && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertDescription>
            💡 Tip: You can assign agents now or add them later from the stream settings
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
