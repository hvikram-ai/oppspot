'use client'

import { useEffect, useState, useCallback } from 'react'
import { useDemoMode } from '@/lib/demo/demo-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Target,
  Zap,
  Award
} from 'lucide-react'

interface BenchmarkMetric {
  value: number
  percentile: number
  vs_median: number
  industry_median: number
  industry_p25: number
  industry_p75: number
}

interface BenchmarkData {
  company_id: string
  overall_percentile: number
  performance_rating: string
  metrics: Record<string, BenchmarkMetric>
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
}

interface BenchmarkCardProps {
  companyId: string
  companyName?: string
}

export function BenchmarkCard({ companyId, companyName }: BenchmarkCardProps) {
  const { isDemoMode } = useDemoMode()
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBenchmarkData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/benchmarks?company_id=${companyId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch benchmark data')
      }

      const data = await response.json()
      setBenchmarkData(data.benchmark)
    } catch (err) {
      console.error('Error fetching benchmark:', err)
      setError('Unable to load benchmark data')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!isDemoMode) {
      fetchBenchmarkData()
    } else {
      setLoading(false)
      setError('Benchmarks are not available in demo mode')
    }
  }, [isDemoMode, fetchBenchmarkData])

  const triggerBenchmarkCalculation = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/benchmarks/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ company_id: companyId })
      })

      if (!response.ok) {
        throw new Error('Failed to calculate benchmarks')
      }

      const data = await response.json()
      setBenchmarkData(data.benchmark)
    } catch (err) {
      console.error('Error calculating benchmark:', err)
      setError('Unable to calculate benchmarks')
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceBadgeColor = (rating: string) => {
    switch (rating) {
      case 'top_performer':
        return 'bg-green-500'
      case 'above_average':
        return 'bg-blue-500'
      case 'average':
        return 'bg-yellow-500'
      case 'below_average':
        return 'bg-orange-500'
      case 'needs_improvement':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600'
    if (percentile >= 50) return 'text-blue-600'
    if (percentile >= 25) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatMetricName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading benchmark data...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button
              onClick={triggerBenchmarkCalculation}
              className="mt-4"
              variant="outline"
            >
              Calculate Benchmarks
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!benchmarkData) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No benchmark data available</p>
            <Button onClick={triggerBenchmarkCalculation}>
              Generate Benchmark Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Industry Benchmark</CardTitle>
            <CardDescription>
              Performance comparison against industry peers
            </CardDescription>
          </div>
          <Badge
            className={`${getPerformanceBadgeColor(benchmarkData.performance_rating)} text-white`}
          >
            {benchmarkData.performance_rating.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Percentile */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Performance</span>
            <span className={`text-lg font-bold ${getPercentileColor(benchmarkData.overall_percentile)}`}>
              {benchmarkData.overall_percentile}th percentile
            </span>
          </div>
          <Progress value={benchmarkData.overall_percentile} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Bottom 25%</span>
            <span>Median</span>
            <span>Top 25%</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Key Metrics</h4>
          {Object.entries(benchmarkData.metrics).slice(0, 4).map(([name, metric]) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">{formatMetricName(name)}</span>
                <div className="flex items-center gap-2">
                  {metric.vs_median > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {metric.vs_median > 0 ? '+' : ''}{metric.vs_median.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={metric.percentile} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-10">
                  {metric.percentile}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Strengths */}
        {benchmarkData.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Award className="h-4 w-4 text-green-500" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {benchmarkData.strengths.slice(0, 3).map((strength, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-green-500" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {benchmarkData.opportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Zap className="h-4 w-4 text-blue-500" />
              Opportunities
            </h4>
            <ul className="space-y-1">
              {benchmarkData.opportunities.slice(0, 3).map((opportunity, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-blue-500" />
                  <span>{opportunity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <Button variant="outline" className="w-full" onClick={() => {
          // Navigate to detailed benchmark view
          window.location.href = `/benchmarks/${companyId}`
        }}>
          <Target className="mr-2 h-4 w-4" />
          View Detailed Analysis
        </Button>
      </CardContent>
    </Card>
  )
}