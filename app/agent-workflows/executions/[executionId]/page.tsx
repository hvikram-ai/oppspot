'use client'

// Workflow Execution Monitor Page

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { AgentWorkflowExecution, ExecutionLogEntry, NodeExecutionResult } from '@/types/agent-workflow'

export default function ExecutionMonitorPage({
  params,
}: {
  params: Promise<{ executionId: string }>
}) {
  const resolvedParams = use(params)
  const [execution, setExecution] = useState<AgentWorkflowExecution | null>(null)
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load execution details
  useEffect(() => {
    async function loadExecution() {
      try {
        const response = await fetch(`/api/agent-workflows/executions/${resolvedParams.executionId}`)
        if (!response.ok) {
          throw new Error('Failed to load execution')
        }

        const data = await response.json()
        setExecution(data.execution)
        setLogs(data.logs || [])
      } catch (error) {
        console.error('Error loading execution:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadExecution()

    // Poll for updates every 2 seconds if execution is running
    const interval = setInterval(() => {
      if (execution?.status === 'running' || execution?.status === 'pending') {
        loadExecution()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [resolvedParams.executionId, execution?.status])

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading execution...</p>
        </div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Execution not found</p>
          <Link href="/agent-workflows">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusColors = {
    pending: 'bg-gray-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-orange-500',
  }

  const statusIcons = {
    pending: Clock,
    running: Loader2,
    completed: CheckCircle,
    failed: XCircle,
    cancelled: XCircle,
  }

  const StatusIcon = statusIcons[execution.status as keyof typeof statusIcons]

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/agent-workflows">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Workflow Execution</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Execution ID: {execution.id}
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <StatusIcon
              className={`w-6 h-6 ${execution.status === 'running' ? 'animate-spin' : ''}`}
            />
            <span>Status: {execution.status}</span>
            <Badge className={statusColors[execution.status as keyof typeof statusColors]}>
              {execution.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Started At</div>
              <div className="font-medium">
                {execution.started_at
                  ? new Date(execution.started_at).toLocaleString()
                  : 'Not started'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed At</div>
              <div className="font-medium">
                {execution.completed_at
                  ? new Date(execution.completed_at).toLocaleString()
                  : 'In progress'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
              <div className="font-medium">
                {execution.duration_ms
                  ? `${(execution.duration_ms / 1000).toFixed(2)}s`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {execution.error_message && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Error
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {execution.error_message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Node Results */}
      {execution.node_results && Object.keys(execution.node_results).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Node Execution Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(execution.node_results as Record<string, NodeExecutionResult>).map(
                ([nodeId, result]) => (
                  <div
                    key={nodeId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{nodeId}</div>
                      <Badge
                        variant={
                          result.status === 'completed'
                            ? 'default'
                            : result.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {result.status}
                      </Badge>
                    </div>

                    {result.durationMs && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Duration: {result.durationMs}ms
                      </div>
                    )}

                    {result.error && (
                      <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                        Error: {result.error.message}
                      </div>
                    )}

                    {result.output !== undefined && result.output !== null && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Output:
                        </div>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {typeof result.output === 'string'
                            ? result.output
                            : JSON.stringify(result.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No logs available</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`
                    text-sm p-2 rounded border-l-4
                    ${log.level === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
                    ${log.level === 'warn' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    ${log.level === 'info' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}
                    ${log.level === 'debug' ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/10' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-semibold uppercase text-xs mr-2">
                        {log.level}
                      </span>
                      {log.nodeId && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">
                          [{log.nodeId}]
                        </span>
                      )}
                      <span>{log.message}</span>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
