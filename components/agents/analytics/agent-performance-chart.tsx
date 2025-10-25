'use client'

/**
 * Agent Performance Chart
 * Visualize individual agent performance metrics
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface AgentPerformance {
  agentId: string
  agentName: string
  agentType: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  averageDuration: number
  lastExecutionAt: string | null
  totalTokensUsed?: number
  estimatedCost?: number
}

interface AgentPerformanceChartProps {
  performance: AgentPerformance[]
  isLoading?: boolean
}

function PerformanceRow({ agent }: { agent: AgentPerformance }) {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-500'
    if (rate >= 80) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="flex items-center justify-between border-b border-border p-4 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h4 className="font-medium">{agent.agentName}</h4>
          <Badge variant="secondary" className="text-xs">
            {agent.agentType}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {agent.totalExecutions} runs
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(agent.averageDuration)}
          </span>
          <span>Last: {formatDate(agent.lastExecutionAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Success Rate */}
        <div className="text-right">
          <div className={`text-lg font-semibold ${getSuccessRateColor(agent.successRate)}`}>
            {agent.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
        </div>

        {/* Execution Counts */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1 text-sm font-medium text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              {agent.successfulExecutions}
            </div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-sm font-medium text-red-500">
              <XCircle className="h-4 w-4" />
              {agent.failedExecutions}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Cost */}
        {agent.estimatedCost !== undefined && (
          <div className="text-right">
            <div className="text-sm font-medium">${agent.estimatedCost.toFixed(4)}</div>
            <div className="text-xs text-muted-foreground">
              {((agent.totalTokensUsed || 0) / 1000).toFixed(1)}K tokens
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between border-b border-border p-4">
      <div className="flex-1 space-y-2">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-6">
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function AgentPerformanceChart({ performance, isLoading }: AgentPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="border-b border-border p-6">
          <h3 className="text-lg font-semibold">Agent Performance</h3>
          <p className="text-sm text-muted-foreground">
            Individual agent metrics and execution stats
          </p>
        </div>
        <div>
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </Card>
    )
  }

  if (performance.length === 0) {
    return (
      <Card className="p-12 text-center">
        <h3 className="text-lg font-semibold">No Agent Activity</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No agent executions found in the selected time range
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold">Agent Performance</h3>
        <p className="text-sm text-muted-foreground">
          Individual agent metrics and execution stats
        </p>
      </div>
      <div>
        {performance.map((agent) => (
          <PerformanceRow key={agent.agentId} agent={agent} />
        ))}
      </div>
    </Card>
  )
}
