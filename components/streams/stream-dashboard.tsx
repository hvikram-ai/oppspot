'use client'

/**
 * Stream Dashboard Component
 * Comprehensive dashboard showing stream progress, insights, and agent activity
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Stream, StreamInsight, GoalStatus } from '@/types/streams'
import {
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Star,
  BarChart3,
  Lightbulb,
  Brain,
  Loader2,
  RefreshCw,
  Calendar,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StreamInsightsPanel } from './stream-insights-panel'
import { LiveProgressCard } from './live-progress-card'
import { formatDistanceToNow } from 'date-fns'

interface AgentExecution {
  id: string
  agent_id: string
  agent_name: string
  agent_type: string
  status: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  results_summary: {
    items_created?: number
    items_updated?: number
    items_qualified?: number
    avg_score?: number
  }
}

interface DashboardData {
  stream: Stream
  progress: {
    completed: number
    total: number
    percentage: number
    quality_score?: number
    signals_detected?: number
    items_by_stage?: Record<string, number>
  }
  goal_status: GoalStatus
  insights: StreamInsight[]
  recent_agent_executions: AgentExecution[]
  quality_metrics: {
    avg_quality_score: number
    high_quality_count: number
    signals_detected: number
  }
}

interface StreamDashboardProps {
  streamId: string
  initialData?: DashboardData
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

export function StreamDashboard({ streamId, initialData }: StreamDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)

  const fetchDashboardData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const response = await fetch(`/api/streams/${streamId}/dashboard`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')

      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const generateInsights = async () => {
    setIsGeneratingInsights(true)
    try {
      const response = await fetch(`/api/streams/${streamId}/insights/generate`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to generate insights')

      const result = await response.json()
      console.log(`Generated ${result.count} insights`)

      // Refresh dashboard to show new insights
      await fetchDashboardData(true)
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      fetchDashboardData()
    }
  }, [streamId])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { stream, progress, goal_status, insights, recent_agent_executions, quality_metrics } = data
  const StatusIcon = GOAL_STATUS_CONFIG[goal_status].icon
  const percentage = progress.percentage || 0
  const completed = progress.completed || 0
  const total = progress.total || stream.target_metrics.companies_to_find || 0

  // Calculate days remaining
  const daysRemaining = stream.goal_deadline
    ? Math.ceil((new Date(stream.goal_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Get unread insights and actionable insights
  const unreadInsights = insights.filter(i => !i.is_read).length
  const actionableInsights = insights.filter(i => i.is_actionable && !i.action_taken).length

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Stream Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time insights, progress tracking, and agent activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={isGeneratingInsights}
          >
            <Brain className={cn("h-4 w-4 mr-2", isGeneratingInsights && "animate-pulse")} />
            {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Goal Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Goal Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("h-5 w-5", GOAL_STATUS_CONFIG[goal_status].color)} />
              <span className={cn("font-semibold", GOAL_STATUS_CONFIG[goal_status].color)}>
                {GOAL_STATUS_CONFIG[goal_status].label}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{percentage}%</div>
              <Progress value={percentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {completed} of {total} completed
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Quality Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">
                {quality_metrics.avg_quality_score.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {quality_metrics.high_quality_count} high quality
            </div>
          </CardContent>
        </Card>

        {/* Time Remaining */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Time Remaining</CardDescription>
          </CardHeader>
          <CardContent>
            {stream.goal_deadline ? (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{daysRemaining}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(stream.goal_deadline).toLocaleDateString()}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No deadline set</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
            {(unreadInsights > 0 || actionableInsights > 0) && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadInsights + actionableInsights}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Brain className="h-4 w-4 mr-2" />
            Agent Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Live Progress Card */}
          <LiveProgressCard
            streamId={streamId}
            targetMetrics={stream.target_metrics}
          />

          {/* Progress Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Breakdown</CardTitle>
              <CardDescription>Track progress across workflow stages</CardDescription>
            </CardHeader>
            <CardContent>
              {progress.items_by_stage && Object.keys(progress.items_by_stage).length > 0 ? (
                <div className="space-y-4">
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
                            <span className="font-medium">{stage?.name || stageId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{count} items</span>
                            <Badge variant="secondary">{stagePercentage}%</Badge>
                          </div>
                        </div>
                        <Progress value={stagePercentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stage data available yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Success Criteria */}
          {stream.success_criteria && Object.keys(stream.success_criteria).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Success Criteria
                </CardTitle>
                <CardDescription>Track milestones toward goal completion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stream.success_criteria.min_qualified && (
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">Minimum Qualified</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min((completed / stream.success_criteria.min_qualified) * 100, 100)}
                          className="w-24 h-2"
                        />
                        <span className="text-sm font-medium w-20 text-right">
                          {completed} / {stream.success_criteria.min_qualified}
                        </span>
                        {completed >= stream.success_criteria.min_qualified ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                  {stream.success_criteria.min_researched && (
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">Minimum Researched</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(((progress.items_by_stage?.['research'] || 0) / stream.success_criteria.min_researched) * 100, 100)}
                          className="w-24 h-2"
                        />
                        <span className="text-sm font-medium w-20 text-right">
                          {progress.items_by_stage?.['research'] || 0} / {stream.success_criteria.min_researched}
                        </span>
                        {(progress.items_by_stage?.['research'] || 0) >= stream.success_criteria.min_researched ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" />
                Quality Metrics
              </CardTitle>
              <CardDescription>Measure the quality of discovered opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-3xl font-bold">
                      {quality_metrics.avg_quality_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">out of 5.0</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">High Quality</p>
                  <p className="text-3xl font-bold text-green-600">
                    {quality_metrics.high_quality_count}
                  </p>
                  <p className="text-xs text-muted-foreground">items</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Signals Detected</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {quality_metrics.signals_detected}
                  </p>
                  <p className="text-xs text-muted-foreground">total signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <StreamInsightsPanel
            insights={insights}
            onMarkAsRead={async (insightId) => {
              try {
                const response = await fetch(`/api/streams/${streamId}/insights`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ insight_id: insightId, is_read: true })
                })
                if (response.ok) {
                  await fetchDashboardData(true)
                }
              } catch (error) {
                console.error('Error marking insight as read:', error)
              }
            }}
            onTakeAction={async (insightId) => {
              try {
                const response = await fetch(`/api/streams/${streamId}/insights`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ insight_id: insightId, action_taken: true })
                })
                if (response.ok) {
                  await fetchDashboardData(true)
                }
              } catch (error) {
                console.error('Error taking action on insight:', error)
              }
            }}
            onDismiss={async (insightId) => {
              try {
                const response = await fetch(`/api/streams/${streamId}/insights`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ insight_id: insightId, is_read: true })
                })
                if (response.ok) {
                  await fetchDashboardData(true)
                }
              } catch (error) {
                console.error('Error dismissing insight:', error)
              }
            }}
          />
        </TabsContent>

        {/* Agent Activity Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Recent Agent Executions
              </CardTitle>
              <CardDescription>
                Track AI agent performance and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recent_agent_executions && recent_agent_executions.length > 0 ? (
                <div className="space-y-3">
                  {recent_agent_executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-start justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-medium">
                            {execution.agent_name}
                          </Badge>
                          <Badge
                            variant={execution.status === 'completed' ? 'default' :
                                   execution.status === 'failed' ? 'destructive' : 'secondary'}
                          >
                            {execution.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {execution.agent_type}
                          </span>
                        </div>

                        {/* Execution Results */}
                        <div className="flex items-center gap-4 text-sm">
                          {execution.results_summary.items_created !== undefined && (
                            <div className="flex items-center gap-1">
                              <Plus className="h-3 w-3 text-green-600" />
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">{execution.results_summary.items_created}</span>
                            </div>
                          )}
                          {execution.results_summary.items_updated !== undefined && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3 text-blue-600" />
                              <span className="text-muted-foreground">Updated:</span>
                              <span className="font-medium">{execution.results_summary.items_updated}</span>
                            </div>
                          )}
                          {execution.results_summary.avg_score !== undefined && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-muted-foreground">Avg Score:</span>
                              <span className="font-medium">{execution.results_summary.avg_score.toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        {/* Execution Time */}
                        <div className="text-xs text-muted-foreground">
                          {execution.duration_ms && (
                            <span>Duration: {(execution.duration_ms / 1000).toFixed(1)}s • </span>
                          )}
                          {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No agent executions yet. Agents will start working once configured.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
