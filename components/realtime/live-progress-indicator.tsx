'use client'

/**
 * Live Progress Indicator
 *
 * Real-time progress bar with animated updates
 */

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { ConnectionStatus } from './connection-status'
import type { SubscriptionStatus } from '@/lib/realtime/realtime-service'

interface LiveProgressIndicatorProps {
  title: string
  percentage: number
  status?: string
  currentStep?: string
  completed?: number
  total?: number
  lastUpdated?: string
  connectionStatus: SubscriptionStatus
  variant?: 'default' | 'compact'
  showConnectionStatus?: boolean
}

export function LiveProgressIndicator({
  title,
  percentage,
  status,
  currentStep,
  completed,
  total,
  lastUpdated,
  connectionStatus,
  variant = 'default',
  showConnectionStatus = true
}: LiveProgressIndicatorProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(percentage)
  const [isUpdating, setIsUpdating] = useState(false)

  // Animate progress changes
  useEffect(() => {
    if (percentage !== animatedPercentage) {
      setIsUpdating(true)
      const timeout = setTimeout(() => {
        setAnimatedPercentage(percentage)
        setTimeout(() => setIsUpdating(false), 500)
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [percentage, animatedPercentage])

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'scanning':
      case 'running':
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'scanning':
      case 'running':
      case 'in_progress':
        return 'bg-blue-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'failed':
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{percentage}%</span>
            {showConnectionStatus && (
              <ConnectionStatus status={connectionStatus} showText={false} size="sm" />
            )}
          </div>
        </div>
        <Progress
          value={animatedPercentage}
          className={`h-2 transition-all duration-500 ${
            isUpdating ? 'animate-pulse' : ''
          }`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-semibold">{title}</h3>
          </div>
          {currentStep && (
            <p className="text-sm text-muted-foreground">{currentStep}</p>
          )}
        </div>
        {showConnectionStatus && <ConnectionStatus status={connectionStatus} />}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <Progress
          value={animatedPercentage}
          className={`h-3 transition-all duration-500 ${
            isUpdating ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        {completed !== undefined && total !== undefined && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {completed} / {total}
            </Badge>
            <span className="text-xs text-muted-foreground">items</span>
          </div>
        )}
        {status && (
          <Badge variant="outline" className="gap-1">
            <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
            {status}
          </Badge>
        )}
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Multiple Progress Indicators
 */
interface MultiProgressIndicatorProps {
  items: Array<{
    id: string
    title: string
    percentage: number
    status?: string
  }>
  connectionStatus: SubscriptionStatus
}

export function MultiProgressIndicator({
  items,
  connectionStatus
}: MultiProgressIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Active Tasks</h3>
        <ConnectionStatus status={connectionStatus} size="sm" />
      </div>
      {items.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          No active tasks
        </div>
      ) : (
        items.map((item) => (
          <LiveProgressIndicator
            key={item.id}
            title={item.title}
            percentage={item.percentage}
            status={item.status}
            connectionStatus={connectionStatus}
            variant="compact"
            showConnectionStatus={false}
          />
        ))
      )}
    </div>
  )
}
