'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Target,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  Lightbulb,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AnalyticsDashboardProps {
  category?: string
  locationId?: string
}

export function AnalyticsDashboard({ category, locationId }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Analytics data
  const [trendAnalysis, setTrendAnalysis] = useState<any>(null)
  const [forecasts, setForecasts] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [marketMetrics, setMarketMetrics] = useState<any>(null)

  useEffect(() => {
    if (category) {
      fetchAnalytics()
    }
  }, [category, locationId, selectedPeriod])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch all analytics data in parallel
      const [trendsRes, forecastsRes, opportunitiesRes, metricsRes] = await Promise.all([
        fetch(`/api/analytics/trends?entityType=category&entityId=${category}&periodDays=${selectedPeriod}`),
        fetch(`/api/analytics/forecasts?category=${category}${locationId ? `&locationId=${locationId}` : ''}`),
        fetch(`/api/analytics/opportunities?category=${category}${locationId ? `&locationId=${locationId}` : ''}&minScore=0.5`),
        fetch(`/api/analytics/collect?category=${category}${locationId ? `&locationId=${locationId}` : ''}&days=${selectedPeriod}`)
      ])

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json()
        setTrendAnalysis(trendsData.analysis)
      }

      if (forecastsRes.ok) {
        const forecastsData = await forecastsRes.json()
        setForecasts(forecastsData.forecasts)
      }

      if (opportunitiesRes.ok) {
        const opportunitiesData = await opportunitiesRes.json()
        setOpportunities(opportunitiesData.opportunities)
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMarketMetrics(metricsData.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshAnalytics = async () => {
    setRefreshing(true)
    
    try {
      // Trigger new analysis generation
      await fetch('/api/analytics/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'category',
          entityId: category,
          periodDays: parseInt(selectedPeriod),
          force: true
        })
      })
      
      // Refresh data
      await fetchAnalytics()
      toast.success('Analytics refreshed successfully')
    } catch (error) {
      console.error('Error refreshing analytics:', error)
      toast.error('Failed to refresh analytics')
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'volatile':
        return <Activity className="h-4 w-4 text-orange-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'underserved_market':
        return <Users className="h-4 w-4" />
      case 'emerging_trend':
        return <TrendingUp className="h-4 w-4" />
      case 'seasonal_opportunity':
        return <Calendar className="h-4 w-4" />
      case 'competitor_weakness':
        return <Target className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const captureOpportunity = async (opportunityId: string) => {
    try {
      const response = await fetch('/api/analytics/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          action: 'capture'
        })
      })

      if (response.ok) {
        toast.success('Opportunity captured successfully')
        fetchAnalytics()
      } else {
        toast.error('Failed to capture opportunity')
      }
    } catch (error) {
      console.error('Error capturing opportunity:', error)
      toast.error('Failed to capture opportunity')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAnalytics}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Trend</CardTitle>
            {getTrendIcon(trendAnalysis?.trendDirection)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {trendAnalysis?.trendDirection || 'Stable'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={(trendAnalysis?.trendStrength || 0) * 100} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {((trendAnalysis?.trendStrength || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {opportunities.filter(o => o.opportunity_score > 0.7).length} high-value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demand Forecast</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecasts[0]?.predicted_demand?.toFixed(0) || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Next {forecasts[0]?.forecast_horizon_days || 30} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((trendAnalysis?.confidenceScore || 0) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Analysis reliability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Market Insights</CardTitle>
              <CardDescription>
                Key findings and recommendations based on current data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendAnalysis?.insights && trendAnalysis.insights.length > 0 ? (
                <div className="space-y-3">
                  {trendAnalysis.insights.map((insight: string, index: number) => (
                    <Alert key={index}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{insight}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No insights available</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Opportunity</CardTitle>
              </CardHeader>
              <CardContent>
                {opportunities[0] ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {getOpportunityIcon(opportunities[0].type)}
                      <span className="font-medium">{opportunities[0].type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {opportunities[0].description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        Score: {(opportunities[0].opportunity_score * 100).toFixed(0)}%
                      </Badge>
                      <Button size="sm" onClick={() => captureOpportunity(opportunities[0].id)}>
                        Capture
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No opportunities identified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Saturation Level</span>
                    <Badge variant={marketMetrics?.features?.market_saturation?.mean > 0.7 ? 'destructive' : 'secondary'}>
                      {((marketMetrics?.features?.market_saturation?.mean || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Growth Rate</span>
                    <div className="flex items-center gap-1">
                      {marketMetrics?.features?.growth_rate?.trend > 0 ? (
                        <ArrowUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {marketMetrics?.features?.growth_rate?.mean?.toFixed(1) || '0'}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Competition Level</span>
                    <Badge variant="outline">
                      {marketMetrics?.features?.business_count?.max || 0} businesses
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>
                Historical patterns and trend indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendAnalysis ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Direction & Strength</h4>
                      <div className="flex items-center gap-3">
                        {getTrendIcon(trendAnalysis.trendDirection)}
                        <div>
                          <p className="font-medium capitalize">{trendAnalysis.trendDirection}</p>
                          <p className="text-sm text-muted-foreground">
                            Strength: {(trendAnalysis.trendStrength * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volatility</span>
                          <span>{(trendAnalysis.metrics?.volatility * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Momentum</span>
                          <span>{(trendAnalysis.metrics?.momentum * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {trendAnalysis.predictions && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Short-term Predictions</h4>
                      <div className="grid gap-2 md:grid-cols-3">
                        {Object.entries(trendAnalysis.predictions).map(([period, pred]: [string, any]) => (
                          <div key={period} className="p-3 border rounded-lg">
                            <p className="text-sm text-muted-foreground">{period}</p>
                            <p className="font-medium">{pred.value?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              Confidence: {(pred.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demand Forecasts</CardTitle>
              <CardDescription>
                Predicted demand levels for different time horizons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forecasts.length > 0 ? (
                <div className="space-y-4">
                  {forecasts.map((forecast, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">
                            {forecast.forecast_horizon_days}-Day Forecast
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Generated: {format(new Date(forecast.forecast_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={forecast.model_accuracy > 0.7 ? 'default' : 'secondary'}>
                          {(forecast.model_accuracy * 100).toFixed(0)}% accurate
                        </Badge>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Predicted Demand</p>
                          <p className="text-xl font-bold">{forecast.predicted_demand.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Range</p>
                          <p className="text-sm">
                            {forecast.lower_bound.toFixed(0)} - {forecast.upper_bound.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Model</p>
                          <p className="text-sm capitalize">{forecast.model_type}</p>
                        </div>
                      </div>

                      {forecast.factors?.topFactors && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Contributing Factors</p>
                          <div className="flex flex-wrap gap-2">
                            {forecast.factors.topFactors.map((factor: any, i: number) => (
                              <Badge key={i} variant="outline">
                                {factor.name}: {factor.impact}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No forecasts available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Opportunities</CardTitle>
              <CardDescription>
                Identified opportunities ranked by potential value
              </CardDescription>
            </CardHeader>
            <CardContent>
              {opportunities.length > 0 ? (
                <div className="space-y-3">
                  {opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getOpportunityIcon(opportunity.type)}
                            <span className="font-medium capitalize">
                              {opportunity.type.replace(/_/g, ' ')}
                            </span>
                            <Badge variant="secondary">
                              Score: {(opportunity.opportunity_score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {opportunity.description}
                          </p>
                          
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span>${(opportunity.potential_value / 1000).toFixed(0)}k value</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {Math.ceil((new Date(opportunity.time_window_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3 text-muted-foreground" />
                              <span>{(opportunity.confidence_score * 100).toFixed(0)}% confidence</span>
                            </div>
                            {opportunity.location_id && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>Location-specific</span>
                              </div>
                            )}
                          </div>

                          {opportunity.recommended_actions && (
                            <div className="mt-3">
                              <details className="cursor-pointer">
                                <summary className="text-sm font-medium">
                                  Recommended Actions ({opportunity.recommended_actions.length})
                                </summary>
                                <ul className="mt-2 space-y-1">
                                  {opportunity.recommended_actions.map((action: string, i: number) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <ChevronRight className="h-3 w-3 mt-0.5" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <Button
                            size="sm"
                            onClick={() => captureOpportunity(opportunity.id)}
                            disabled={opportunity.status !== 'active'}
                          >
                            {opportunity.status === 'active' ? 'Capture' : opportunity.status}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No opportunities identified</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}