'use client'

/**
 * Real-time Stream Card
 *
 * Displays stream information with live progress updates
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useStreamProgress } from '@/hooks/use-realtime'
import { ConnectionStatus } from '@/components/realtime/connection-status'
import {
  Workflow,
  Calendar,
  Target,
  TrendingUp,
  Users,
  ExternalLink,
  Activity
} from 'lucide-react'

interface StreamCardRealtimeProps {
  streamId: string
  name: string
  description?: string
  type: string
  targetMetrics?: {
    companies_to_find?: number
    min_quality_score?: number
  }
  createdAt: string
  createdBy?: string
  memberCount?: number
  showLiveIndicator?: boolean
}

export function StreamCardRealtime({
  streamId,
  name,
  description,
  type,
  targetMetrics,
  createdAt,
  createdBy,
  memberCount,
  showLiveIndicator = true
}: StreamCardRealtimeProps) {
  const { progress, status, isConnected } = useStreamProgress(streamId)

  // Use real-time data if available, fallback to props
  const currentProgress = useMemo(() => {
    if (progress?.current_progress) {
      return progress.current_progress
    }
    return {
      completed: 0,
      total: targetMetrics?.companies_to_find || 0,
      percentage: 0,
      last_updated: new Date().toISOString()
    }
  }, [progress, targetMetrics])

  const goalStatus = progress?.goal_status || 'not_started'

  const getStatusColor = () => {
    switch (goalStatus) {
      case 'completed':
        return 'bg-green-500'
      case 'on_track':
        return 'bg-blue-500'
      case 'in_progress':
        return 'bg-yellow-500'
      case 'at_risk':
        return 'bg-orange-500'
      case 'blocked':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = () => {
    return goalStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{name}</CardTitle>
              {showLiveIndicator && isConnected && (
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              )}
            </div>
            {description && (
              <CardDescription className="mt-2">{description}</CardDescription>
            )}
          </div>
          {showLiveIndicator && <ConnectionStatus status={status} showText={false} size="sm" />}
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          {memberCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentProgress.completed} / {currentProgress.total}
              </span>
              <span className="text-sm font-medium">{currentProgress.percentage}%</span>
            </div>
          </div>
          <Progress
            value={currentProgress.percentage}
            className="h-2 transition-all duration-500"
          />
        </div>

        {/* Status & Metrics */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1">
            <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
            {getStatusLabel()}
          </Badge>

          {targetMetrics?.min_quality_score && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Quality: {targetMetrics.min_quality_score.toFixed(1)}+</span>
            </div>
          )}
        </div>

        {/* Last Updated */}
        {progress && (
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(currentProgress.last_updated).toLocaleString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/streams/${streamId}`}>
              <span>View Details</span>
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid of Real-time Stream Cards
 */
interface StreamGridRealtimeProps {
  streams: Array<{
    id: string
    name: string
    description?: string | null
    stream_type: string
    target_metrics?: Record<string, unknown> | null
    created_at: string
    created_by: string
    memberCount?: number
  }>
}

export function StreamGridRealtime({ streams }: StreamGridRealtimeProps) {
  if (streams.length === 0) {
    return (
      <div className="text-center py-12">
        <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No streams yet</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {streams.map((stream) => (
        <StreamCardRealtime
          key={stream.id}
          streamId={stream.id}
          name={stream.name}
          description={stream.description || undefined}
          type={stream.stream_type}
          targetMetrics={stream.target_metrics as { companies_to_find?: number; min_quality_score?: number } | undefined}
          createdAt={stream.created_at}
          createdBy={stream.created_by}
          memberCount={stream.memberCount}
        />
      ))}
    </div>
  )
}
