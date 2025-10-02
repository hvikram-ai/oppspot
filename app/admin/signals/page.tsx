'use client'

/**
 * Buying Signals Dashboard
 * Real-time feed of detected buying signals
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Briefcase,
  Users,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'

interface BuyingSignal {
  id: string
  company_id: string
  signal_type: string
  signal_strength: 'very_strong' | 'strong' | 'moderate' | 'weak'
  confidence_score: number
  signal_data: any
  detected_at: string
  detected_by: string
  status: 'active' | 'acted_upon' | 'expired' | 'false_positive'
  created_at: string
}

const signalTypeIcons: Record<string, any> = {
  funding_round: TrendingUp,
  executive_change: Users,
  job_posting: Briefcase,
  technology_adoption: Globe,
  expansion: TrendingUp,
  website_activity: Globe,
  competitor_mention: AlertCircle,
  companies_house_filing: FileText,
  news_mention: FileText,
  social_media_activity: Globe,
}

const signalTypeLabels: Record<string, string> = {
  funding_round: 'Funding Round',
  executive_change: 'Executive Change',
  job_posting: 'Job Posting',
  technology_adoption: 'Technology Adoption',
  expansion: 'Expansion',
  website_activity: 'Website Activity',
  competitor_mention: 'Competitor Mention',
  companies_house_filing: 'Companies House Filing',
  news_mention: 'News Mention',
  social_media_activity: 'Social Media Activity',
}

const strengthColors: Record<string, string> = {
  very_strong: 'bg-red-500',
  strong: 'bg-orange-500',
  moderate: 'bg-yellow-500',
  weak: 'bg-gray-400',
}

export default function BuyingSignalsPage() {
  const [signals, setSignals] = useState<BuyingSignal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSignals()
  }, [])

  const loadSignals = async () => {
    try {
      // TODO: Create API endpoint for signals
      // const response = await fetch('/api/signals')
      // const data = await response.json()
      // setSignals(data.signals || [])

      // Mock data for now
      setSignals([])
    } catch (err: any) {
      console.error('Failed to load signals:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSignalStatus = async (
    signalId: string,
    status: 'acted_upon' | 'false_positive'
  ) => {
    try {
      // TODO: Create API endpoint
      // await fetch(`/api/signals/${signalId}`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ status })
      // })
      loadSignals()
    } catch (err: any) {
      console.error('Failed to update signal:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading signals...</div>
      </div>
    )
  }

  const activeSignals = signals.filter(s => s.status === 'active')
  const actedUpon = signals.filter(s => s.status === 'acted_upon')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Buying Signals</h1>
        <p className="text-muted-foreground">
          Real-time feed of detected buying signals from Scout Agents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {activeSignals.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Acted Upon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {actedUpon.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {signals.length > 0
                ? Math.round(
                    signals.reduce((sum, s) => sum + s.confidence_score, 0) /
                      signals.length
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signals List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeSignals.length})</TabsTrigger>
          <TabsTrigger value="acted">Acted Upon ({actedUpon.length})</TabsTrigger>
          <TabsTrigger value="all">All ({signals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeSignals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active signals. Scout agents will detect them automatically!
              </CardContent>
            </Card>
          ) : (
            activeSignals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onUpdateStatus={updateSignalStatus}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="acted" className="space-y-4 mt-4">
          {actedUpon.map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onUpdateStatus={updateSignalStatus}
            />
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {signals.map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onUpdateStatus={updateSignalStatus}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SignalCard({
  signal,
  onUpdateStatus
}: {
  signal: BuyingSignal
  onUpdateStatus: (id: string, status: 'acted_upon' | 'false_positive') => void
}) {
  const Icon = signalTypeIcons[signal.signal_type] || AlertCircle

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 ${strengthColors[signal.signal_strength]} bg-opacity-20 rounded-lg`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {signalTypeLabels[signal.signal_type]}
                </CardTitle>
                <Badge
                  variant={
                    signal.status === 'active'
                      ? 'default'
                      : signal.status === 'acted_upon'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {signal.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Detected by {signal.detected_by} •{' '}
                {new Date(signal.detected_at).toLocaleString()}
              </CardDescription>
            </div>
          </div>
          {signal.status === 'active' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onUpdateStatus(signal.id, 'acted_upon')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Act Upon
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(signal.id, 'false_positive')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                False Positive
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Strength</div>
            <div className="font-medium capitalize">{signal.signal_strength.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Confidence</div>
            <div className="font-medium">{signal.confidence_score}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Company</div>
            <div className="font-medium">{signal.company_id.slice(0, 8)}...</div>
          </div>
          <div>
            <div className="text-muted-foreground">Data</div>
            <div className="font-medium text-xs">
              {JSON.stringify(signal.signal_data).slice(0, 50)}...
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
