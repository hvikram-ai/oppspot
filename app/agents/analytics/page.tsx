'use client'

/**
 * Agent Analytics Dashboard
 * Comprehensive view of agent performance, costs, and reliability
 */

import { useEffect, useState, useCallback } from 'react'
import { OverviewCards } from '@/components/agents/analytics/overview-cards'
import { AgentPerformanceChart } from '@/components/agents/analytics/agent-performance-chart'
import { ExecutionHistory } from '@/components/agents/analytics/execution-history'
import { ErrorAnalysis } from '@/components/agents/analytics/error-analysis'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AnalyticsData {
  overview: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    successRate: number
    averageDuration: number
    totalDuration: number
    activeAgents: number
    totalAgents: number
  }
  performance: Array<{
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
  }>
  history: Array<{
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
  }>
  errors: Array<{
    errorType: string
    errorMessage: string
    count: number
    lastOccurrence: string
    affectedAgents: string[]
  }>
}

export default function AgentAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/agents/analytics?timeRange=${timeRange}&metric=all`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setLastRefresh(new Date())
      } else {
        console.error('Failed to fetch analytics:', result.error)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleRefresh = () => {
    fetchAnalytics()
  }

  const handleExport = () => {
    if (!data) return

    const csvData = data.history
      .map((item) => ({
        Agent: item.agentName,
        Type: item.agentType,
        Status: item.status,
        Started: item.startedAt || 'N/A',
        Duration: item.durationMs ? `${item.durationMs}ms` : 'N/A',
        Items: item.itemsProcessed || 'N/A',
        Tokens: item.tokensUsed || 'N/A',
      }))
      .map((row) => Object.values(row).join(','))

    const csv = ['Agent,Type,Status,Started,Duration,Items,Tokens', ...csvData].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-analytics-${timeRange}-${new Date().toISOString()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Agent Analytics</h1>
              <p className="mt-1 text-muted-foreground">
                Monitor agent performance, reliability, and costs
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!data || isLoading}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Overview Cards */}
          <OverviewCards metrics={data?.overview} isLoading={isLoading} />

          {/* Agent Performance */}
          <AgentPerformanceChart performance={data?.performance || []} isLoading={isLoading} />

          {/* Error Analysis & Execution History */}
          <div className="grid gap-8 lg:grid-cols-2">
            <ErrorAnalysis errors={data?.errors || []} isLoading={isLoading} />
            <div className="lg:col-span-2">
              <ExecutionHistory history={data?.history || []} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
