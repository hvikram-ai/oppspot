'use client'

/**
 * Stream Progress Dashboard Component
 * Shows real-time progress toward goal completion with metrics and insights
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Stream, StreamProgressResponse, GoalStatus } from '@/types/streams'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Star,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreamProgressDashboardProps {
  stream: Stream
  progressData?: StreamProgressResponse
}

const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  not_started: { label: 'Not Started', color: 'text-gray-500', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-blue-500', icon: Activity },
  on_track: { label: 'On Track', color: 'text-green-500', icon: TrendingUp },
  at_risk: { label: 'At Risk', color: 'text-orange-500', icon: AlertCircle },
  completed: { label: 'Completed', color: 'text-green-600', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-500', icon: AlertCircle },
  paused: { label: 'Paused', color: 'text-gray-400', icon: Clock }
}

export function StreamProgressDashboard({ stream, progressData }: StreamProgressDashboardProps) {
  const progress = progressData?.progress || stream.current_progress
  const goalStatus = progressData?.goal_status || stream.goal_status
  const StatusIcon = GOAL_STATUS_CONFIG[goalStatus].icon

  const percentage = progress.percentage || 0
  const completed = progress.completed || 0
  const total = progress.total || stream.target_metrics.companies_to_find || 0

  // Calculate days remaining
  const daysRemaining = stream.goal_deadline
    ? Math.ceil((new Date(stream.goal_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      {/* Goal Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">
                {stream.name}
              </CardTitle>
              <CardDescription>
                {stream.description}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1", GOAL_STATUS_CONFIG[goalStatus].color)}
            >
              <StatusIcon className="h-3 w-3" />
              {GOAL_STATUS_CONFIG[goalStatus].label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Progress */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Goal Progress</CardTitle>
              <span className="text-3xl font-bold">{percentage}%</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={percentage} className="h-3" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{completed} of {total} {stream.target_metrics.companies_to_find ? 'companies' : 'items'}</span>
              <span>{total - completed} remaining</span>
            </div>

            {/* Target Metric */}
            {stream.target_metrics.min_quality_score && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average Quality Score</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {progress.quality_score?.toFixed(1) || 'N/A'} / 5.0
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stream.goal_deadline ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Deadline</span>
                  <span className="text-sm font-medium">
                    {new Date(stream.goal_deadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days Remaining</span>
                  <Badge variant={daysRemaining && daysRemaining < 7 ? "destructive" : "secondary"}>
                    <Clock className="h-3 w-3 mr-1" />
                    {daysRemaining} days
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {percentage >= 70 ? "✅ On track" : percentage >= 50 ? "⚠️ Needs attention" : "❌ Behind schedule"}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No deadline set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      {progressData?.quality_metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Quality Score</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  {progressData.quality_metrics.avg_quality_score.toFixed(1)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">High Quality</p>
                <p className="text-2xl font-bold text-green-600">
                  {progressData.quality_metrics.high_quality_count}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Signals Detected</p>
                <p className="text-2xl font-bold text-blue-600">
                  {progressData.quality_metrics.signals_detected}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Breakdown */}
      {progress.items_by_stage && Object.keys(progress.items_by_stage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(progress.items_by_stage).map(([stageId, count]) => {
                const stage = stream.stages.find(s => s.id === stageId)
                const stagePercentage = total > 0 ? Math.round((count as number / total) * 100) : 0

                return (
                  <div key={stageId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage?.color || '#gray' }}
                        />
                        <span>{stage?.name || stageId}</span>
                      </div>
                      <span className="font-medium">{count} ({stagePercentage}%)</span>
                    </div>
                    <Progress value={stagePercentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Agent Executions */}
      {progressData?.recent_agent_executions && progressData.recent_agent_executions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Recent Agent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressData.recent_agent_executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {execution.agent_name}
                      </Badge>
                      <Badge
                        variant={execution.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {execution.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {execution.results_summary.items_created && (
                        <span>{execution.results_summary.items_created} items created</span>
                      )}
                      {execution.results_summary.avg_score && (
                        <span className="ml-2">• Avg score: {execution.results_summary.avg_score.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(execution.started_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Criteria Progress */}
      {stream.success_criteria && Object.keys(stream.success_criteria).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Success Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stream.success_criteria.min_qualified && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Qualified</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {completed} / {stream.success_criteria.min_qualified}
                    </span>
                    {completed >= stream.success_criteria.min_qualified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
              {stream.success_criteria.min_researched && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Researched</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {progress.items_by_stage?.['research'] || 0} / {stream.success_criteria.min_researched}
                    </span>
                    {(progress.items_by_stage?.['research'] || 0) >= stream.success_criteria.min_researched ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
