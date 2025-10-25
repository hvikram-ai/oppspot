'use client'

/**
 * Execution History Table
 * Display recent agent execution logs
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ExecutionHistoryItem {
  id: string
  agentId: string
  agentName: string
  agentType: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  errorMessage: string | null
  tokensUsed?: number
  itemsProcessed?: number
}

interface ExecutionHistoryProps {
  history: ExecutionHistoryItem[]
  isLoading?: boolean
}

function getStatusBadge(status: ExecutionHistoryItem['status']) {
  const variants: Record<
    ExecutionHistoryItem['status'],
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
  > = {
    completed: {
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    failed: {
      variant: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
    },
    running: {
      variant: 'secondary',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    queued: {
      variant: 'outline',
      icon: <Clock className="h-3 w-3" />,
    },
    cancelled: {
      variant: 'secondary',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  }

  const config = variants[status]

  return (
    <Badge variant={config.variant} className="flex w-fit items-center gap-1">
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number | null) {
  if (!ms) return 'N/A'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export function ExecutionHistory({ history, isLoading }: ExecutionHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="border-b border-border p-6">
          <h3 className="text-lg font-semibold">Execution History</h3>
          <p className="text-sm text-muted-foreground">Recent agent execution logs</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-4 text-left text-sm font-medium">Agent</th>
                <th className="p-4 text-left text-sm font-medium">Status</th>
                <th className="p-4 text-left text-sm font-medium">Started</th>
                <th className="p-4 text-left text-sm font-medium">Duration</th>
                <th className="p-4 text-left text-sm font-medium">Items</th>
                <th className="p-4 text-left text-sm font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card className="p-12 text-center">
        <h3 className="text-lg font-semibold">No Execution History</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No agent executions found in the selected time range
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <p className="text-sm text-muted-foreground">
          Recent agent execution logs ({history.length} results)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-4 text-left text-sm font-medium">Agent</th>
              <th className="p-4 text-left text-sm font-medium">Status</th>
              <th className="p-4 text-left text-sm font-medium">Started</th>
              <th className="p-4 text-left text-sm font-medium">Completed</th>
              <th className="p-4 text-left text-sm font-medium">Duration</th>
              <th className="p-4 text-left text-sm font-medium">Items</th>
              <th className="p-4 text-left text-sm font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border transition-colors hover:bg-muted/50"
              >
                <td className="p-4">
                  <div>
                    <div className="font-medium">{item.agentName}</div>
                    <div className="text-xs text-muted-foreground">{item.agentType}</div>
                  </div>
                </td>
                <td className="p-4">{getStatusBadge(item.status)}</td>
                <td className="p-4 text-sm">{formatDate(item.startedAt)}</td>
                <td className="p-4 text-sm">{formatDate(item.completedAt)}</td>
                <td className="p-4 text-sm font-medium">{formatDuration(item.durationMs)}</td>
                <td className="p-4 text-sm">
                  {item.itemsProcessed !== undefined ? item.itemsProcessed : 'N/A'}
                </td>
                <td className="p-4 text-sm">
                  {item.tokensUsed !== undefined
                    ? `${(item.tokensUsed / 1000).toFixed(1)}K`
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {history.length >= 50 && (
        <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
          Showing 50 most recent executions
        </div>
      )}
    </Card>
  )
}
