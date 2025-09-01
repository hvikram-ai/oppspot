'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertCircle,
  ArrowRight,
  Building2,
  DollarSign,
  Users
} from 'lucide-react'
import Link from 'next/link'

interface Insight {
  id: string
  type: 'opportunity' | 'trend' | 'alert' | 'recommendation'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  metric?: {
    value: string
    change: number
    trend: 'up' | 'down' | 'neutral'
  }
}

interface BusinessInsightsProps {
  userId: string
}

export function BusinessInsights({ userId }: BusinessInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockInsights: Insight[] = [
      {
        id: '1',
        type: 'opportunity',
        title: 'High-growth Tech Sector',
        description: '23 new tech companies registered in your target area this month',
        impact: 'high',
        metric: {
          value: '+23',
          change: 35,
          trend: 'up'
        }
      },
      {
        id: '2',
        type: 'trend',
        title: 'Manufacturing Decline',
        description: 'Manufacturing businesses in Birmingham showing 12% decline',
        impact: 'medium',
        metric: {
          value: '-12%',
          change: -12,
          trend: 'down'
        }
      },
      {
        id: '3',
        type: 'alert',
        title: 'Competitor Activity',
        description: '5 of your saved businesses have new funding rounds',
        impact: 'high',
        metric: {
          value: '£2.3M',
          change: 0,
          trend: 'neutral'
        }
      },
      {
        id: '4',
        type: 'recommendation',
        title: 'Expand Search Radius',
        description: 'Similar businesses found 15 miles outside your current search area',
        impact: 'low',
        metric: {
          value: '+47',
          change: 0,
          trend: 'neutral'
        }
      }
    ]
    
    setTimeout(() => {
      setInsights(mockInsights)
      setLoading(false)
    }, 500)
  }, [userId])

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return Target
      case 'trend':
        return TrendingUp
      case 'alert':
        return AlertCircle
      case 'recommendation':
        return Building2
      default:
        return TrendingUp
    }
  }

  const getImpactColor = (impact: Insight['impact']) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'medium':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>AI-powered market intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
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
            <CardTitle>Business Insights</CardTitle>
            <CardDescription>AI-powered market intelligence</CardDescription>
          </div>
          <Link href="/insights">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => {
            const Icon = getInsightIcon(insight.type)
            const TrendIcon = insight.metric?.trend === 'up' ? TrendingUp : 
                            insight.metric?.trend === 'down' ? TrendingDown : null
            
            return (
              <div 
                key={insight.id} 
                className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getImpactColor(insight.impact)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      {insight.metric && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{insight.metric.value}</span>
                          {TrendIcon && (
                            <TrendIcon className={`h-4 w-4 ${
                              insight.metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                            }`} />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {insight.type}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          insight.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          insight.impact === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {insight.impact} impact
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">£4.2M</p>
            <p className="text-xs text-muted-foreground">Total opportunity</p>
          </div>
          <div className="text-center">
            <Building2 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">312</p>
            <p className="text-xs text-muted-foreground">New matches</p>
          </div>
          <div className="text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">89%</p>
            <p className="text-xs text-muted-foreground">Match rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}