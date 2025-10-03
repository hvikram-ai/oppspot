'use client'

/**
 * Task Runner Status Component
 * Shows the status of the agent task runner and queue statistics
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, RefreshCw, Activity, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

export function TaskRunnerStatus() {
  const [status, setStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchStatus()
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/agents/task-runner')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Error fetching task runner status:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleControl = async (action: 'start' | 'stop') => {
    try {
      const response = await fetch('/api/agents/task-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        fetchStatus()
      }
    } catch (error) {
      console.error('Error controlling task runner:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!status) return null

  const { runner, stats } = status
  const isRunning = runner?.status === 'running'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Task Runner
            </CardTitle>
            <CardDescription className="text-xs">Background agent execution service</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? 'default' : 'secondary'} className="gap-1">
              {isRunning ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Running
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  Stopped
                </>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStatus()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Statistics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-900 dark:text-yellow-100">Pending</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {stats?.pending || 0}
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Processing</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {stats?.processing || 0}
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-900 dark:text-green-100">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {stats?.completed || 0}
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-900 dark:text-red-100">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {stats?.failed || 0}
            </div>
          </div>
        </div>

        {/* Runner Details */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Polling interval: {runner?.polling_interval}ms</div>
          <div>Max concurrent tasks: {runner?.max_concurrent_tasks}</div>
          <div>Total tasks processed: {stats?.total || 0}</div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 pt-2 border-t">
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleControl('stop')}
              className="flex-1"
            >
              <Pause className="h-3 w-3 mr-2" />
              Stop Runner
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleControl('start')}
              className="flex-1"
            >
              <Play className="h-3 w-3 mr-2" />
              Start Runner
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
