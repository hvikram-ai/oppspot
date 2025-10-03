'use client'

/**
 * Live Progress Card
 * Real-time progress tracking with animations
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useStreamProgress } from '@/hooks/use-stream-progress'
import {
  Activity,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
  Sparkles,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface LiveProgressCardProps {
  streamId: string
  targetMetrics?: {
    companies_to_find?: number
    min_quality_score?: number
  }
  className?: string
}

export function LiveProgressCard({
  streamId,
  targetMetrics,
  className
}: LiveProgressCardProps) {
  const { progress, activities, isConnected, activeAgents } = useStreamProgress(streamId)

  const [previousCompleted, setPreviousCompleted] = useState(0)
  const [showIncrement, setShowIncrement] = useState(false)
  const [increment, setIncrement] = useState(0)

  // Track progress changes for animation
  useEffect(() => {
    if (progress && progress.completed > previousCompleted) {
      const diff = progress.completed - previousCompleted
      setIncrement(diff)
      setShowIncrement(true)
      setPreviousCompleted(progress.completed)

      // Hide increment after animation
      const timer = setTimeout(() => setShowIncrement(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [progress?.completed, previousCompleted])

  const completed = progress?.completed || 0
  const total = progress?.total || targetMetrics?.companies_to_find || 100
  const percentage = progress?.percentage || 0
  const qualityScore = progress?.quality_score || 0

  const recentActivities = activities.slice(0, 5)

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4">
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </Badge>
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Live Progress
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Companies Found</span>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {showIncrement && (
                  <motion.span
                    initial={{ opacity: 0, y: -10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    className="text-sm font-bold text-green-600"
                  >
                    +{increment}
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="text-2xl font-bold">
                {completed}
              </span>
              <span className="text-sm text-muted-foreground">/ {total}</span>
            </div>
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Progress
              value={percentage}
              className="h-3"
            />
          </motion.div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{percentage}% complete</span>
            <span>{total - completed} remaining</span>
          </div>
        </div>

        {/* Quality Score */}
        {qualityScore > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Avg Quality Score</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold">{qualityScore.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
          </div>
        )}

        {/* Active Agents */}
        {activeAgents.size > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              Active Agents ({activeAgents.size})
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(activeAgents).map((agentId) => {
                const activity = activities.find(a => a.agent_id === agentId)
                return (
                  <motion.div
                    key={agentId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge variant="secondary" className="gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      {activity?.agent_name || 'Agent'}
                    </Badge>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Recent Activity
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {recentActivities.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No activity yet. Agents will update here as they work.
                </div>
              ) : (
                recentActivities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      activity.activity_type === 'completed' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                      activity.activity_type === 'failed' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                      activity.activity_type === 'started' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                      activity.activity_type === 'progress' && "bg-muted/50"
                    )}
                  >
                    <div className="mt-0.5">
                      {activity.activity_type === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {activity.activity_type === 'failed' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {activity.activity_type === 'started' && (
                        <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                      )}
                      {activity.activity_type === 'progress' && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {activity.agent_name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{activity.message}</p>

                      {activity.data && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {activity.data.items_created && (
                            <span>+{activity.data.items_created} companies</span>
                          )}
                          {activity.data.avg_score && (
                            <span>Avg: {activity.data.avg_score.toFixed(1)}/5</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Updated Timestamp */}
        {progress?.last_updated && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(progress.last_updated).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
