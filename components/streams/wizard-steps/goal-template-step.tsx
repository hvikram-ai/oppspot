'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { GoalTemplateSelector } from '@/components/streams/goal-template-selector'
import { StreamWizardData } from '@/types/stream-wizard'
import { GoalTemplate } from '@/types/streams'
import { Loader2, Sparkles, Rocket } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GoalTemplateStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function GoalTemplateStep({ data, onUpdate }: GoalTemplateStepProps) {
  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/goal-templates')

      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: GoalTemplate | null) => {
    if (template) {
      onUpdate({
        goal_template_id: template.id,
        goal_criteria: template.default_criteria,
        target_metrics: template.default_metrics,
        success_criteria: template.default_success_criteria,
        assigned_agents: template.suggested_agents.map(sa => ({
          agent_type: sa.agent_type,
          name: sa.agent_type,
          role: sa.role,
          order: sa.order,
          is_active: true,
          auto_execute: sa.role === 'primary',
          execution_frequency: sa.role === 'primary' ? 'daily' : 'on_demand',
          config: sa.config || {}
        }))
      })
    } else {
      onUpdate({
        goal_template_id: null,
        goal_criteria: {},
        target_metrics: {},
        success_criteria: {},
        assigned_agents: []
      })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Goal-Oriented Setup
        </h3>
        <p className="text-sm text-muted-foreground">
          Transform your stream into an AI-powered goal achievement workspace
        </p>
      </div>

      {/* Goal-Oriented Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Enable Goal-Oriented Automation
          </CardTitle>
          <CardDescription>
            Let AI agents work autonomously to achieve your objectives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="goal-oriented" className="text-base">
                Use this stream for goal tracking
              </Label>
              <p className="text-sm text-muted-foreground">
                Define clear objectives, assign AI agents, and track progress automatically
              </p>
            </div>
            <Switch
              id="goal-oriented"
              checked={data.isGoalOriented}
              onCheckedChange={(checked) => {
                onUpdate({ isGoalOriented: checked })
                if (!checked) {
                  // Reset goal-related fields
                  onUpdate({
                    goal_template_id: null,
                    goal_criteria: {},
                    target_metrics: {},
                    success_criteria: {},
                    assigned_agents: []
                  })
                }
              }}
            />
          </div>

          {data.isGoalOriented && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                ✨ Great choice! You&apos;ll be able to set goals, define success criteria, and assign AI agents to work toward your objectives.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Template Selector (only show if goal-oriented enabled) */}
      {data.isGoalOriented && (
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <GoalTemplateSelector
                selectedTemplateId={data.goal_template_id}
                onSelectTemplate={handleTemplateSelect}
                templates={templates}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Deadline (optional) */}
      {data.isGoalOriented && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline (Optional)</CardTitle>
            <CardDescription>
              Set a deadline for achieving your goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="deadline">Goal Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={data.goal_deadline || ''}
                onChange={(e) => onUpdate({ goal_deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Set a target date for completing this goal
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
