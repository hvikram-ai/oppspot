'use client'

/**
 * ICP Learning Engine Dashboard
 * View and manage Ideal Customer Profiles with auto-learning
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  TrendingUp,
  Target,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'
import { ProtectedLayout } from '@/components/layout/protected-layout'

interface ICPProfile {
  id: string
  version: number
  name: string
  description: string
  is_active: boolean
  criteria: {
    industries?: string[]
    employee_range?: { min?: number; max?: number }
    revenue_range?: { min?: number; max?: number }
    locations?: string[]
    tech_stack?: string[]
    growth_indicators?: string[]
    funding_stages?: string[]
  }
  confidence_scores: Record<string, number>
  metrics: {
    won_deals: number
    lost_deals: number
    win_rate: number
    avg_deal_size: number
    avg_sales_cycle_days: number
  }
  training_data_count: number
  last_trained_at: string | null
}

export default function ICPPage() {
  const [profiles, setProfiles] = useState<ICPProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<ICPProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/icp')
      const data = await response.json()

      if (data.success) {
        setProfiles(data.profiles || [])
        const active = data.profiles?.find((p: ICPProfile) => p.is_active)
        setActiveProfile(active || null)
      }
    } catch (error) {
      console.error('Failed to load ICP profiles:', error)
      toast.error('Failed to load ICP profiles')
    } finally {
      setLoading(false)
    }
  }

  const trainNewICP = async () => {
    try {
      setTraining(true)
      toast.info('Training new ICP from deal data...')

      const response = await fetch('/api/icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'train' })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadProfiles()
      } else {
        toast.error(data.error || 'Training failed')
      }
    } catch (error) {
      console.error('Failed to train ICP:', error)
      toast.error('Failed to train ICP')
    } finally {
      setTraining(false)
    }
  }

  if (loading) {
    return (

      <ProtectedLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (


    <ProtectedLayout>
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            ICP Learning Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Auto-refining Ideal Customer Profile from your closed deals
          </p>
        </div>
        <Button
          onClick={trainNewICP}
          disabled={training}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {training ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Train New ICP
            </>
          )}
        </Button>
      </div>

      {/* No ICP State */}
      {profiles.length === 0 && (
        <Alert className="mb-8 border-purple-200 bg-purple-50">
          <Brain className="h-4 w-4 text-purple-600" />
          <AlertDescription className="ml-2">
            <strong>No ICP profiles yet.</strong> Train your first ICP from historical deal data to unlock AI-powered targeting recommendations.
          </AlertDescription>
        </Alert>
      )}

      {/* Active ICP Overview */}
      {activeProfile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">
                    {(activeProfile.metrics.win_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Won Deals</p>
                  <p className="text-2xl font-bold">{activeProfile.metrics.won_deals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                  <p className="text-2xl font-bold">
                    £{(activeProfile.metrics.avg_deal_size / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sales Cycle</p>
                  <p className="text-2xl font-bold">
                    {activeProfile.metrics.avg_sales_cycle_days}d
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ICP Profiles List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profiles.map((profile) => (
          <Card key={profile.id} className={profile.is_active ? 'border-purple-300 shadow-lg' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    {profile.name}
                  </CardTitle>
                  {profile.is_active && (
                    <Badge className="bg-purple-600">Active</Badge>
                  )}
                  <Badge variant="outline">v{profile.version}</Badge>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription className="mt-2">
                {profile.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Criteria */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Target Criteria</h4>
                <div className="space-y-2 text-sm">
                  {profile.criteria.industries && profile.criteria.industries.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-muted-foreground">Industries:</span>
                      {profile.criteria.industries.slice(0, 3).map(ind => (
                        <Badge key={ind} variant="secondary">{ind}</Badge>
                      ))}
                      {profile.criteria.industries.length > 3 && (
                        <Badge variant="secondary">+{profile.criteria.industries.length - 3} more</Badge>
                      )}
                    </div>
                  )}

                  {profile.criteria.employee_range && (
                    <div>
                      <span className="text-muted-foreground">Employees:</span>{' '}
                      {profile.criteria.employee_range.min || 0} - {profile.criteria.employee_range.max || '∞'}
                    </div>
                  )}

                  {profile.criteria.locations && profile.criteria.locations.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-muted-foreground">Locations:</span>
                      {profile.criteria.locations.slice(0, 3).map(loc => (
                        <Badge key={loc} variant="secondary">{loc}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Confidence Scores */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Confidence Levels</h4>
                <div className="space-y-2">
                  {Object.entries(profile.confidence_scores).slice(0, 3).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                        <span>{Math.round(value)}%</span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Info */}
              <div className="pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Trained on {profile.training_data_count} deals</span>
                </div>
                {profile.last_trained_at && (
                  <span>
                    {new Date(profile.last_trained_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Version History */}
      {profiles.length > 1 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">ICP Evolution</CardTitle>
            <CardDescription>
              Track how your ICP has evolved over {profiles.length} versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profiles.slice(0, 5).map((profile, index) => (
                <div key={profile.id} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${profile.is_active ? 'bg-purple-600' : 'bg-gray-300'}`} />
                    {index < Math.min(profiles.length - 1, 4) && (
                      <div className="w-px h-8 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{profile.version}</span>
                      {profile.is_active && <Badge className="bg-purple-600 text-xs">Current</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {profile.metrics.won_deals} won • {(profile.metrics.win_rate * 100).toFixed(0)}% win rate
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {profile.last_trained_at && new Date(profile.last_trained_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  </ProtectedLayout>

  )
}
