'use client'

/**
 * Stream Insights Panel Component
 * Displays AI-generated insights, recommendations, and alerts for the stream
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StreamInsight, InsightType, InsightSeverity } from '@/types/streams'
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Settings,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreamInsightsPanelProps {
  insights: StreamInsight[]
  onMarkAsRead?: (insightId: string) => void
  onTakeAction?: (insightId: string) => void
  onDismiss?: (insightId: string) => void
}

const INSIGHT_TYPE_CONFIG: Record<InsightType, { label: string; icon: typeof Lightbulb; color: string }> = {
  progress_update: { label: 'Progress Update', icon: TrendingUp, color: 'text-blue-600' },
  quality_assessment: { label: 'Quality Assessment', icon: CheckCircle2, color: 'text-green-600' },
  recommendation: { label: 'Recommendation', icon: Lightbulb, color: 'text-purple-600' },
  risk_alert: { label: 'Risk Alert', icon: AlertTriangle, color: 'text-orange-600' },
  milestone_achieved: { label: 'Milestone', icon: Target, color: 'text-green-600' },
  optimization_suggestion: { label: 'Optimization', icon: Settings, color: 'text-blue-600' }
}

const SEVERITY_CONFIG: Record<InsightSeverity, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  info: { label: 'Info', variant: 'secondary' },
  success: { label: 'Success', variant: 'default' },
  warning: { label: 'Warning', variant: 'outline' },
  critical: { label: 'Critical', variant: 'destructive' }
}

export function StreamInsightsPanel({
  insights,
  onMarkAsRead,
  onTakeAction,
  onDismiss
}: StreamInsightsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'actionable'>('all')

  const filteredInsights = insights.filter(insight => {
    if (filter === 'unread') return !insight.is_read
    if (filter === 'actionable') return insight.is_actionable && !insight.action_taken
    return true
  })

  const unreadCount = insights.filter(i => !i.is_read).length
  const actionableCount = insights.filter(i => i.is_actionable && !i.action_taken).length

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Insights</h3>
          <p className="text-sm text-muted-foreground">
            Recommendations and alerts from your agents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({insights.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'actionable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('actionable')}
          >
            Action Required ({actionableCount})
          </Button>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {filteredInsights.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all'
                  ? 'No insights yet. Your agents will generate insights as they work.'
                  : filter === 'unread'
                  ? 'All insights have been read.'
                  : 'No actionable insights at the moment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredInsights.map((insight) => {
            const typeConfig = INSIGHT_TYPE_CONFIG[insight.insight_type]
            const Icon = typeConfig.icon

            return (
              <Card
                key={insight.id}
                className={cn(
                  "transition-all",
                  !insight.is_read && "border-l-4 border-l-primary",
                  insight.is_actionable && !insight.action_taken && "shadow-md"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        insight.severity === 'critical' ? 'bg-red-100 text-red-600' :
                        insight.severity === 'warning' ? 'bg-orange-100 text-orange-600' :
                        insight.severity === 'success' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{insight.title}</CardTitle>
                          <Badge variant={SEVERITY_CONFIG[insight.severity].variant} className="text-xs">
                            {SEVERITY_CONFIG[insight.severity].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {typeConfig.label}
                          </Badge>
                          {!insight.is_read && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          {insight.description}
                        </CardDescription>
                        {insight.agent && (
                          <p className="text-xs text-muted-foreground">
                            Generated by {insight.agent.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {!insight.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onMarkAsRead?.(insight.id)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {/* Insight Data */}
                {insight.data && Object.keys(insight.data).length > 0 && (
                  <CardContent className="border-t pt-3 pb-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                      {Object.entries(insight.data).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}

                {/* Actions */}
                {insight.is_actionable && !insight.action_taken && (
                  <CardContent className="border-t pt-3 pb-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onTakeAction?.(insight.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Take Action
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDismiss?.(insight.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                )}

                {/* Action Taken Badge */}
                {insight.action_taken && (
                  <CardContent className="border-t pt-3 pb-3">
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Action taken {insight.action_taken_at && `on ${new Date(insight.action_taken_at).toLocaleDateString()}`}
                    </Badge>
                  </CardContent>
                )}

                {/* Timestamp */}
                <CardContent className="border-t pt-2 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(insight.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
