'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Clock, DollarSign, Users } from 'lucide-react'
import useSWR from 'swr'

interface Metrics {
  time_saved_hours: number
  pipeline_value: number
  active_leads: number
  research_credits_remaining: number
}

interface Trend {
  current: number
  previous: number
  change_percent: number
  direction: 'up' | 'down' | 'flat'
}

interface MetricsData {
  metrics: Metrics
  trends: {
    time_saved: Trend
    pipeline_value: Trend
  }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function ImpactMetrics() {
  const { data, error } = useSWR<MetricsData>('/api/dashboard/metrics?period=week', fetcher, {
    refreshInterval: 60000 // Refresh every minute
  })

  if (error || !data) {
    return null
  }

  const { metrics, trends } = data

  const metricCards = [
    {
      title: 'Time Saved This Week',
      value: `${metrics.time_saved_hours.toFixed(1)} hours`,
      trend: trends.time_saved,
      icon: Clock,
      color: 'text-blue-600',
      dataMetric: 'time_saved'
    },
    {
      title: 'Pipeline Value',
      value: `£${(metrics.pipeline_value / 1000).toFixed(0)}k`,
      trend: trends.pipeline_value,
      icon: DollarSign,
      color: 'text-green-600',
      dataMetric: 'pipeline_value'
    },
    {
      title: 'Active Leads',
      value: metrics.active_leads.toString(),
      trend: null,
      icon: Users,
      color: 'text-purple-600',
      dataMetric: 'active_leads'
    }
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" data-testid="impact-metrics">
      {metricCards.map((metric) => {
        const Icon = metric.icon
        const TrendIcon = metric.trend?.direction === 'up' ? TrendingUp :
          metric.trend?.direction === 'down' ? TrendingDown : null

        const trendColor = metric.trend?.direction === 'up' ? 'text-green-600' :
          metric.trend?.direction === 'down' ? 'text-red-600' : 'text-gray-600'

        return (
          <Card
            key={metric.dataMetric}
            data-metric={metric.dataMetric}
            className="cursor-pointer hover:shadow-md transition-shadow touch-manipulation w-full"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 flex-shrink-0 ${metric.color}`} />
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold truncate">{metric.value}</div>
              {metric.trend && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {TrendIcon && <TrendIcon className={`h-3 w-3 flex-shrink-0 ${trendColor}`} />}
                  <span className={`text-xs ${trendColor}`} data-testid="trend-indicator">
                    {metric.trend.direction === 'up' ? '↑' : metric.trend.direction === 'down' ? '↓' : '→'}
                    {' '}
                    {Math.abs(metric.trend.change_percent).toFixed(1)}% vs last week
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1 break-words">
                {metric.dataMetric === 'time_saved' && 'Manual research time saved'}
                {metric.dataMetric === 'pipeline_value' && 'Estimated opportunity value'}
                {metric.dataMetric === 'active_leads' && 'Companies in your pipeline'}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
