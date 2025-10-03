'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, AlertCircle, Clock, Zap, Target, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface Prediction {
  id: string
  company_id: string
  buying_probability: number
  predicted_timeline_days: number
  confidence_level: 'high' | 'medium' | 'low'
  signal_count_30d: number
  signal_count_60d: number
  signal_count_90d: number
  signal_velocity: number
  strongest_signals: string[]
  composite_signals: string[]
  recommended_actions: string[]
  priority_score: number
  prediction_date: string
  businesses?: {
    id: string
    name: string
    website: string
    location: string
    industry: string
    employee_count: number
  }
}

export default function TimeTravelPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => {
    fetchPredictions()
  }, [])

  const fetchPredictions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/timetravel/predict')
      const data = await response.json()

      if (data.success) {
        setPredictions(data.predictions || [])
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPredictions = predictions.filter(p => {
    if (filter === 'all') return true
    return p.confidence_level === filter
  })

  const getConfidenceBadge = (level: string) => {
    const colors = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-gray-500'
    }
    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {level.toUpperCase()}
      </Badge>
    )
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-green-600 font-bold'
    if (probability >= 50) return 'text-yellow-600 font-semibold'
    return 'text-gray-600'
  }

  const getTimelineIcon = (days: number) => {
    if (days <= 30) return <Zap className="w-4 h-4 text-red-500" />
    if (days <= 60) return <Clock className="w-4 h-4 text-yellow-500" />
    return <Clock className="w-4 h-4 text-blue-500" />
  }

  const formatSignal = (signal: string) => {
    return signal
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading predictions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            TimeTravel™ Predictions
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered buying intent predictions 30-90 days before active search
          </p>
        </div>
        <Button onClick={fetchPredictions} variant="outline">
          Refresh Predictions
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {predictions.filter(p => p.confidence_level === 'high').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hot Leads (&gt;70%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {predictions.filter(p => p.buying_probability >= 70).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              30-Day Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {predictions.filter(p => p.predicted_timeline_days <= 30).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All Predictions</TabsTrigger>
          <TabsTrigger value="high">High Confidence</TabsTrigger>
          <TabsTrigger value="medium">Medium Confidence</TabsTrigger>
          <TabsTrigger value="low">Low Confidence</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredPredictions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No predictions found. Run signal analysis on companies to generate predictions.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPredictions.map((prediction) => (
              <Card key={prediction.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">
                        {prediction.businesses?.name || 'Unknown Company'}
                      </CardTitle>
                      <CardDescription>
                        {prediction.businesses?.industry} • {prediction.businesses?.location}
                        {prediction.businesses?.employee_count &&
                          ` • ${prediction.businesses.employee_count} employees`
                        }
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getConfidenceBadge(prediction.confidence_level)}
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {prediction.priority_score}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className={`text-3xl font-bold ${getProbabilityColor(prediction.buying_probability)}`}>
                        {prediction.buying_probability}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Buying Probability
                      </div>
                    </div>

                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-3xl font-bold flex items-center justify-center gap-2">
                        {getTimelineIcon(prediction.predicted_timeline_days)}
                        {prediction.predicted_timeline_days}d
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Predicted Timeline
                      </div>
                    </div>

                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {prediction.signal_count_30d}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Signals (30d)
                      </div>
                    </div>
                  </div>

                  {/* Strongest Signals */}
                  {prediction.strongest_signals && prediction.strongest_signals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Strongest Signals
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {prediction.strongest_signals.map((signal, idx) => (
                          <Badge key={idx} variant="secondary">
                            {formatSignal(signal)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Composite Signals */}
                  {prediction.composite_signals && prediction.composite_signals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Composite Patterns
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {prediction.composite_signals.map((signal, idx) => (
                          <Badge key={idx} variant="default" className="bg-purple-600">
                            {formatSignal(signal)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Recommended Actions
                      </h4>
                      <ul className="space-y-1">
                        {prediction.recommended_actions.map((action, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ArrowUpRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Link href={`/business/${prediction.company_id}`}>
                      <Button variant="default">View Details</Button>
                    </Link>
                    {prediction.businesses?.website && (
                      <Link href={prediction.businesses.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">Visit Website</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
