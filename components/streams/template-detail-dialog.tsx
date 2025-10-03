'use client'

/**
 * Template Detail Dialog
 * Shows comprehensive template information, preview, and configuration
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExtendedGoalTemplate } from '@/lib/templates/template-library'
import {
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  CheckCircle2,
  Users,
  Zap,
  Star,
  Calendar,
  Award,
  Brain,
  AlertCircle,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateDetailDialogProps {
  template: ExtendedGoalTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseTemplate: (template: ExtendedGoalTemplate) => void
}

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', color: 'text-green-600 bg-green-50 border-green-200', icon: '🟢' },
  intermediate: { label: 'Intermediate', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: '🟡' },
  advanced: { label: 'Advanced', color: 'text-red-600 bg-red-50 border-red-200', icon: '🔴' }
}

export function TemplateDetailDialog({
  template,
  open,
  onOpenChange,
  onUseTemplate
}: TemplateDetailDialogProps) {
  if (!template) return null

  const difficultyConfig = template.difficulty_level
    ? DIFFICULTY_CONFIG[template.difficulty_level]
    : DIFFICULTY_CONFIG.intermediate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="text-4xl">{template.icon}</div>
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{template.name}</DialogTitle>
              <DialogDescription className="text-base">
                {template.description}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline">{template.category}</Badge>
                {template.difficulty_level && (
                  <Badge variant="outline" className={cn("border", difficultyConfig.color)}>
                    {difficultyConfig.icon} {difficultyConfig.label}
                  </Badge>
                )}
                {template.industries && template.industries.length > 0 && (
                  <Badge variant="secondary">
                    {template.industries.slice(0, 2).join(', ')}
                    {template.industries.length > 2 && ` +${template.industries.length - 2}`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4">
              {template.typical_timeline_days && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Timeline</p>
                    <p className="text-2xl font-bold">{template.typical_timeline_days}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                </div>
              )}
              {template.use_count > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Used By</p>
                    <p className="text-2xl font-bold">{template.use_count}</p>
                    <p className="text-xs text-muted-foreground">teams</p>
                  </div>
                </div>
              )}
              {template.avg_success_rate !== null && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                  <Star className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Success Rate</p>
                    <p className="text-2xl font-bold">{Math.round(template.avg_success_rate * 100)}%</p>
                    <p className="text-xs text-muted-foreground">average</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Goal Criteria */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Goal Criteria
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(template.default_criteria).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-sm p-3 rounded-lg bg-muted/50">
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : Array.isArray(value)
                          ? value.length > 0 ? value.join(', ') : 'Any'
                          : String(value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Target Metrics */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Target Metrics
              </h4>
              <div className="space-y-2">
                {Object.entries(template.default_metrics).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary" className="text-base font-semibold">
                      {typeof value === 'number' ? value : JSON.stringify(value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Success Criteria */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Success Criteria
              </h4>
              <div className="space-y-2">
                {Object.entries(template.default_success_criteria).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeof value === 'boolean'
                          ? value ? 'Required' : 'Not required'
                          : typeof value === 'number'
                          ? `Target: ${value}`
                          : String(value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Suggested Agents */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI Agent Workflow ({template.suggested_agents.length} agents)
              </h4>
              <div className="space-y-2">
                {template.suggested_agents.map((agent, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {agent.order}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {agent.agent_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Role: {agent.role}
                      </p>
                    </div>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>

            {/* Success Stories */}
            {template.success_stories && template.success_stories.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Success Stories
                  </h4>
                  <div className="space-y-3">
                    {template.success_stories.map((story, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                        <p className="font-medium text-sm mb-1">{story.company}</p>
                        <p className="text-sm text-muted-foreground">{story.result}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Tips & Best Practices */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-2">💡 Best Practices</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Start with the suggested agent workflow for optimal results</li>
                    <li>• Adjust criteria based on your specific market and requirements</li>
                    <li>• Monitor progress daily and refine as you gather insights</li>
                    {template.difficulty_level === 'advanced' && (
                      <li>• Consider involving domain experts for advanced templates</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {template.typical_timeline_days && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Typical completion: {template.typical_timeline_days} days
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              onUseTemplate(template)
              onOpenChange(false)
            }}>
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
