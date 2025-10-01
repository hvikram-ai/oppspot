'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react'
import type { BenchmarkComparison } from '@/lib/benchmarking/types/benchmarking'

interface BenchmarkDashboardProps {
  companyId: string
  companyName?: string
}

export function BenchmarkDashboard({ companyId, companyName }: BenchmarkDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [comparison, setComparison] = useState<BenchmarkComparison | null>(null)
  const [peers, setPeers] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBenchmarkData()
  }, [companyId])

  const fetchBenchmarkData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Fetch benchmark comparison
      const response = await fetch('/api/benchmarking/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          comparison_type: 'both',
          include_ai_insights: true,
          force_refresh: forceRefresh
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch benchmarks')
      }

      setComparison(data.comparison)

      // Fetch peers
      const peersResponse = await fetch('/api/benchmarking/peers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          max_peers: 10,
          include_competitors: true
        })
      })

      const peersData = await peersResponse.json()
      if (peersData.success) {
        setPeers(peersData.peers)
      }

    } catch (err) {
      console.error('Error fetching benchmark data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load benchmarks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getQuartileLabel = (quartile?: number) => {
    if (!quartile) return 'N/A'
    const labels = ['Bottom', '3rd', '2nd', 'Top']
    return `${labels[quartile - 1]} Quartile`
  }

  const getQuartileColor = (quartile?: number) => {
    if (!quartile) return 'secondary'
    const colors = ['destructive', 'secondary', 'default', 'success'] as const
    return colors[quartile - 1]
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'improving') return <ChevronUp className="h-4 w-4 text-green-500" />
    if (trend === 'declining') return <ChevronDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!comparison) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No benchmark data available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Benchmark Analysis</h2>
          {companyName && (
            <p className="text-muted-foreground">{companyName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBenchmarkData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Performance
          </CardTitle>
          <CardDescription>
            Compared to industry and peer companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{comparison.overall_score || 0}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress
                value={comparison.overall_score || 0}
                className="mt-2"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Percentile Rank</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{comparison.percentile_rank || 0}</span>
                <span className="text-sm text-muted-foreground">th percentile</span>
              </div>
              <Badge
                variant={getQuartileColor(comparison.quartile)}
                className="mt-2"
              >
                {getQuartileLabel(comparison.quartile)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Comparison Type</p>
              <Badge variant="outline" className="capitalize">
                {comparison.comparison_type}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {peers.length} peer companies analyzed
              </p>
            </div>
          </div>

          {/* AI Insights */}
          {comparison.ai_insights && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">AI Insights</p>
              <p className="text-sm text-muted-foreground">{comparison.ai_insights}</p>
              {comparison.ai_confidence_score && (
                <Badge variant="outline" className="mt-2">
                  {(comparison.ai_confidence_score * 100).toFixed(0)}% confidence
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <MetricsCard
            title="Financial Metrics"
            metrics={comparison.comparison_results.financial_metrics || []}
          />
        </TabsContent>

        <TabsContent value="operational">
          <MetricsCard
            title="Operational Metrics"
            metrics={comparison.comparison_results.operational_metrics || []}
          />
        </TabsContent>

        <TabsContent value="growth">
          <MetricsCard
            title="Growth Metrics"
            metrics={comparison.comparison_results.growth_metrics || []}
          />
        </TabsContent>

        <TabsContent value="efficiency">
          <MetricsCard
            title="Efficiency Metrics"
            metrics={comparison.comparison_results.efficiency_metrics || []}
          />
        </TabsContent>
      </Tabs>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Strengths
            </CardTitle>
            <CardDescription>
              Areas where you outperform the benchmark
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {comparison.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ChevronUp className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Improvement Areas
            </CardTitle>
            <CardDescription>
              Areas below benchmark performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {comparison.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ChevronDown className="h-4 w-4 text-red-500 mt-0.5" />
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {comparison.recommendations && comparison.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Actionable steps to improve performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparison.recommendations.map((rec, index) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.description}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Badge variant="outline" className="text-xs">
                        {rec.priority} priority
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rec.estimated_impact} impact
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peer Companies */}
      {peers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Peer Companies
            </CardTitle>
            <CardDescription>
              Similar companies used for comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {peers.slice(0, 5).map((peer) => (
                <div key={peer.company_id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{peer.company_name}</p>
                    <div className="flex gap-2 mt-1">
                      {peer.matching_criteria?.map((criteria: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {criteria}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {(peer.similarity_score * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Similarity</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricsCard({ title, metrics }: { title: string; metrics: any[] }) {
  if (!metrics || metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No metrics available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">{metric.metric_label}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm">
                    Value: <span className="font-medium">{metric.company_value?.toFixed(2)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Benchmark: {metric.benchmark_value?.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    metric.percentile >= 75 ? 'success' :
                    metric.percentile >= 50 ? 'default' :
                    metric.percentile >= 25 ? 'secondary' :
                    'destructive'
                  }
                >
                  {metric.percentile}th %ile
                </Badge>
                {metric.trend && getTrendIcon(metric.trend)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}