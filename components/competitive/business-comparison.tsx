'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Star, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  DollarSign,
  Globe,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'

interface Business {
  id: string
  name: string
  rating: number
  review_count: number
  categories?: string[]
  price_level?: number
  verified?: boolean
  website?: string
  phone?: string
  address?: any
  description?: string
  created_at?: string
}

interface ComparisonMetrics {
  rating: {
    highest: number
    lowest: number
    average: number
    winner: string
  }
  reviews: {
    highest: number
    lowest: number
    total: number
    winner: string
  }
  categories?: any
  pricing?: any
}

interface BusinessComparisonProps {
  businesses: Business[]
  metrics?: ComparisonMetrics
  insights?: any
}

export function BusinessComparison({ 
  businesses, 
  metrics,
  insights 
}: BusinessComparisonProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const getWinner = (businessId: string, metric: 'rating' | 'reviews') => {
    return metrics?.[metric]?.winner === businessId
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-blue-600'
    if (rating >= 3.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPriceLabel = (level?: number) => {
    if (!level) return 'N/A'
    return '$'.repeat(level)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Business Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map(business => (
              <Card key={business.id} className="relative">
                {/* Winner badges */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {getWinner(business.id, 'rating') && (
                    <Badge className="bg-yellow-500">
                      <Award className="h-3 w-3 mr-1" />
                      Top Rated
                    </Badge>
                  )}
                  {getWinner(business.id, 'reviews') && (
                    <Badge className="bg-blue-500">
                      <Users className="h-3 w-3 mr-1" />
                      Most Reviews
                    </Badge>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="text-lg flex items-start justify-between">
                    <span>{business.name}</span>
                    {business.verified && (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    {business.categories?.join(', ')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className={`h-5 w-5 ${getRatingColor(business.rating)}`} />
                      <span className={`font-semibold ${getRatingColor(business.rating)}`}>
                        {business.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {business.review_count} reviews
                    </span>
                  </div>

                  {/* Progress bar comparing to highest */}
                  {metrics && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Rating Score</span>
                          <span>{((business.rating / 5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={(business.rating / 5) * 100} 
                          className="h-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Review Volume</span>
                          <span>
                            {metrics.reviews.highest > 0 
                              ? ((business.review_count / metrics.reviews.highest) * 100).toFixed(0)
                              : 0}%
                          </span>
                        </div>
                        <Progress 
                          value={
                            metrics.reviews.highest > 0 
                              ? (business.review_count / metrics.reviews.highest) * 100
                              : 0
                          } 
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Quick Info */}
                  <div className="space-y-2 text-sm">
                    {business.price_level && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{getPriceLabel(business.price_level)}</span>
                      </div>
                    )}
                    {business.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-primary">Has Website</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>Phone Available</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Stats */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comparison Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">
                      {metrics.rating.average.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reviews</p>
                    <p className="text-2xl font-bold">
                      {metrics.reviews.total.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating Gap</p>
                    <p className="text-2xl font-bold">
                      {(metrics.rating.highest - metrics.rating.lowest).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">
                      {metrics.categories?.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6 mt-6">
          {/* Detailed Metrics Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
              <CardDescription>
                Side-by-side comparison of key performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Metric</th>
                      {businesses.map(b => (
                        <th key={b.id} className="text-center py-2 px-4">
                          {b.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3">Rating</td>
                      {businesses.map(b => (
                        <td key={b.id} className="text-center px-4">
                          <span className={`font-semibold ${getRatingColor(b.rating)}`}>
                            {b.rating.toFixed(1)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Reviews</td>
                      {businesses.map(b => (
                        <td key={b.id} className="text-center px-4">
                          {b.review_count.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Price Level</td>
                      {businesses.map(b => (
                        <td key={b.id} className="text-center px-4">
                          {getPriceLabel(b.price_level)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Verified</td>
                      {businesses.map(b => (
                        <td key={b.id} className="text-center px-4">
                          {b.verified ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Website</td>
                      {businesses.map(b => (
                        <td key={b.id} className="text-center px-4">
                          {b.website ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strengths" className="space-y-6 mt-6">
          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map(business => (
              <Card key={business.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{business.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Strengths
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {business.rating >= 4.5 && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Excellent ratings
                        </li>
                      )}
                      {business.review_count > 100 && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          High review volume
                        </li>
                      )}
                      {business.verified && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Verified business
                        </li>
                      )}
                      {business.website && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Online presence
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {business.rating < 4.0 && (
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          Rating below 4.0
                        </li>
                      )}
                      {business.review_count < 50 && (
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          Limited reviews
                        </li>
                      )}
                      {!business.website && (
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          No website
                        </li>
                      )}
                      {!business.description && (
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          Missing description
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6 mt-6">
          {/* AI Insights */}
          {insights && (
            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
                <CardDescription>
                  AI-generated analysis and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {insights.summary || 'Comparative analysis of selected businesses'}
                  </p>
                </div>

                {insights.market_position && (
                  <div>
                    <h4 className="font-semibold mb-2">Market Position</h4>
                    <div className="space-y-2">
                      {insights.market_position.map((pos: unknown) => (
                        <div key={(pos as any).id} className="flex items-center justify-between">
                          <span className="text-sm">{(pos as any).name}</span>
                          <Badge variant={
                            (pos as any).position === 'Market leader' ? 'default' :
                            (pos as any).position === 'Top competitor' ? 'secondary' :
                            'outline'
                          }>
                            {(pos as any).position}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}