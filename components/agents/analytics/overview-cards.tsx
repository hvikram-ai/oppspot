'use client'

/**
 * Overview Metrics Cards
 * Display key agent performance metrics at a glance
 */

import { Activity, CheckCircle2, Clock, TrendingUp, XCircle, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface OverviewMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  averageDuration: number
  totalDuration: number
  activeAgents: number
  totalAgents: number
}

interface OverviewCardsProps {
  metrics?: OverviewMetrics
  isLoading?: boolean
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  trend?: { value: number; isPositive: boolean }
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    purple: 'bg-purple-500/10 text-purple-500',
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold">{value}</h3>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
      </div>
    </Card>
  )
}

export function OverviewCards({ metrics, isLoading }: OverviewCardsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Executions"
        value={metrics.totalExecutions.toLocaleString()}
        subtitle="Agent runs in period"
        icon={Activity}
        color="blue"
      />

      <MetricCard
        title="Success Rate"
        value={`${metrics.successRate.toFixed(1)}%`}
        subtitle={`${metrics.successfulExecutions} successful`}
        icon={CheckCircle2}
        color="green"
      />

      <MetricCard
        title="Average Duration"
        value={formatDuration(metrics.averageDuration)}
        subtitle="Per execution"
        icon={Clock}
        color="purple"
      />

      <MetricCard
        title="Active Agents"
        value={`${metrics.activeAgents}/${metrics.totalAgents}`}
        subtitle="Agents ready to run"
        icon={Zap}
        color="yellow"
      />
    </div>
  )
}
