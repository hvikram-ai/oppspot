'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { MetricCard } from '@/components/dashboard/metric-card'
import { TimelineCard } from '@/components/dashboard/timeline-card'
import { DataTable } from '@/components/dashboard/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Flame,
  Activity,
  TrendingUp,
  Target,
  Clock,
  BriefcaseIcon,
  Globe,
  Zap,
  RefreshCw,
  Bell,
  ExternalLink
} from 'lucide-react'

interface Signal {
  id: string
  company_id: string
  signal_type: string
  signal_category: string
  signal_strength: number
  confidence_score: number
  source: string
  title: string
  description: string
  detected_at: string
  company?: {
    id: string
    name: string
    website: string
  }
}

interface IntentScore {
  company_id: string
  intent_score: number
  intent_level: string
  top_signals: any[]
  predicted_timeline: string
  recommended_actions: string[]
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [intentScores, setIntentScores] = useState<Record<string, IntentScore>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('7')
  const [signalTypeFilter, setSignalTypeFilter] = useState('all')
  const [minStrength, setMinStrength] = useState('5')

  const [metrics, setMetrics] = useState({
    hot_leads: 0,
    signals_today: 0,
    avg_intent_score: 0,
    conversion_rate: 0
  })

  useEffect(() => {
    fetchSignals()
  }, [timeRange, signalTypeFilter, minStrength])

  const fetchSignals = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        days: timeRange,
        min_strength: minStrength,
        limit: '100'
      })

      if (signalTypeFilter !== 'all') {
        params.append('signal_type', signalTypeFilter)
      }

      const response = await fetch(`/api/signals?${params}`)
      const data = await response.json()

      if (data.success) {
        setSignals(data.signals || [])
        setIntentScores(data.intent_scores || {})
        calculateMetrics(data.signals, data.intent_scores)
      }
    } catch (error) {
      console.error('Error fetching signals:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (signalData: Signal[], intentData: Record<string, IntentScore>) => {
    const today = new Date().toISOString().split('T')[0]
    const todaySignals = signalData.filter(s =>
      s.detected_at.split('T')[0] === today
    )

    const hotLeads = Object.values(intentData).filter(i => i.intent_level === 'hot').length
    const avgScore = Object.values(intentData).reduce((sum, i) => sum + i.intent_score, 0) /
                     (Object.keys(intentData).length || 1)

    setMetrics({
      hot_leads: hotLeads,
      signals_today: todaySignals.length,
      avg_intent_score: Math.round(avgScore),
      conversion_rate: 12.5 // Mock for now
    })
  }

  const refreshSignals = async (companyId?: string) => {
    try {
      setRefreshing(true)

      if (companyId) {
        const response = await fetch('/api/signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId })
        })

        if (response.ok) {
          await fetchSignals()
        }
      } else {
        await fetchSignals()
      }
    } catch (error) {
      console.error('Error refreshing signals:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'web_activity': return Globe
      case 'job_posting': return BriefcaseIcon
      case 'funding': return TrendingUp
      case 'tech_adoption': return Zap
      default: return Activity
    }
  }

  const getIntentBadgeColor = (level: string) => {
    switch (level) {
      case 'hot': return 'bg-red-500 text-white'
      case 'warm': return 'bg-orange-500 text-white'
      case 'lukewarm': return 'bg-yellow-500 text-white'
      case 'cold': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const formatTimeline = (timeline: string) => {
    switch (timeline) {
      case 'immediate': return 'Next 1-2 weeks'
      case '1-3_months': return '1-3 months'
      case '3-6_months': return '3-6 months'
      case '6+_months': return '6+ months'
      default: return timeline
    }
  }

  // Group signals by company for the table
  const companiesWithSignals = Array.from(
    new Map(signals.map(s => [s.company_id, s.company]))
  ).filter(([_, company]) => company).map(([companyId, company]) => {
    const companySignals = signals.filter(s => s.company_id === companyId)
    const intent = intentScores[companyId]
    const topSignal = companySignals[0]

    return {
      id: companyId,
      company: company!.name,
      website: company!.website,
      intent_score: intent?.intent_score || 0,
      intent_level: intent?.intent_level || 'no_intent',
      signal_count: companySignals.length,
      top_signal: topSignal?.title || '-',
      last_activity: topSignal?.detected_at || '-',
      timeline: intent?.predicted_timeline || 'unknown'
    }
  }).sort((a, b) => b.intent_score - a.intent_score)

  if (loading && signals.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading buying signals...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Buying Signals</h1>
            <p className="text-muted-foreground">
              Real-time detection of purchase intent signals
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => refreshSignals()}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Bell className="mr-2 h-4 w-4" />
              Configure Alerts
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Hot Leads"
            value={metrics.hot_leads}
            description="Ready to buy now"
            trend={{ value: 23, type: 'up', label: 'vs last week' }}
            icon={Flame}
            variant="danger"
          />
          <MetricCard
            title="Signals Today"
            value={metrics.signals_today}
            description="New signals detected"
            trend={{ value: 15, type: 'up', label: 'vs yesterday' }}
            icon={Activity}
            variant="primary"
          />
          <MetricCard
            title="Avg Intent Score"
            value={`${metrics.avg_intent_score}%`}
            description="Overall buying intent"
            icon={TrendingUp}
            variant="success"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversion_rate}%`}
            description="Signals to deals"
            trend={{ value: 5, type: 'up', label: 'improvement' }}
            icon={Target}
            variant="warning"
          />
        </div>

        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies">By Company</TabsTrigger>
            <TabsTrigger value="timeline">Signal Timeline</TabsTrigger>
            <TabsTrigger value="alerts">High Priority</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Companies by Intent Level</CardTitle>
                    <CardDescription>
                      Companies showing buying signals ranked by intent score
                    </CardDescription>
                  </div>
                  <Select value={signalTypeFilter} onValueChange={setSignalTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Signals</SelectItem>
                      <SelectItem value="web_activity">Web Activity</SelectItem>
                      <SelectItem value="job_posting">Job Postings</SelectItem>
                      <SelectItem value="funding">Funding</SelectItem>
                      <SelectItem value="tech_adoption">Tech Adoption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    {
                      id: 'company',
                      header: 'Company',
                      accessor: (row) => (
                        <div>
                          <div className="font-medium">{row.company}</div>
                          <div className="text-xs text-muted-foreground">{row.website}</div>
                        </div>
                      )
                    },
                    {
                      id: 'intent_score',
                      header: 'Intent Score',
                      accessor: (row) => (
                        <div className="flex items-center gap-2">
                          <Progress value={row.intent_score} className="w-20" />
                          <span className="text-sm font-medium">{row.intent_score}%</span>
                        </div>
                      )
                    },
                    {
                      id: 'intent_level',
                      header: 'Level',
                      accessor: (row) => (
                        <Badge className={getIntentBadgeColor(row.intent_level)}>
                          {row.intent_level}
                        </Badge>
                      )
                    },
                    {
                      id: 'signals',
                      header: 'Signals',
                      accessor: (row) => (
                        <div>
                          <div className="font-medium">{row.signal_count} signals</div>
                          <div className="text-xs text-muted-foreground">{row.top_signal}</div>
                        </div>
                      )
                    },
                    {
                      id: 'timeline',
                      header: 'Timeline',
                      accessor: (row) => (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTimeline(row.timeline)}</span>
                        </div>
                      )
                    },
                    {
                      id: 'actions',
                      header: 'Actions',
                      accessor: (row) => (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/business/${row.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => refreshSignals(row.id)}
                          >
                            Analyze
                          </Button>
                        </div>
                      )
                    }
                  ]}
                  data={companiesWithSignals}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <TimelineCard
              title="Recent Buying Signals"
              description="High-value signals detected in the last 7 days"
              events={signals
                .filter(s => s.signal_strength >= 6)
                .slice(0, 20)
                .map(signal => ({
                  id: signal.id,
                  title: signal.title,
                  description: `${signal.company?.name || 'Unknown'}: ${signal.description}`,
                  timestamp: signal.detected_at,
                  type: signal.signal_strength >= 8 ? 'danger' :
                        signal.signal_strength >= 6 ? 'warning' : 'info',
                  icon: getSignalIcon(signal.signal_type),
                  badges: [
                    signal.signal_type,
                    `Strength: ${signal.signal_strength.toFixed(1)}`
                  ]
                }))}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>High Priority Alerts</CardTitle>
                <CardDescription>
                  Companies requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companiesWithSignals
                    .filter(c => c.intent_level === 'hot')
                    .map(company => {
                      const intent = intentScores[company.id]
                      return (
                        <div
                          key={company.id}
                          className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Flame className="h-4 w-4 text-red-500" />
                                {company.company}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Intent Score: {company.intent_score}% •
                                {company.signal_count} signals detected
                              </p>
                              {intent?.recommended_actions && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium mb-1">Recommended Actions:</p>
                                  <ul className="text-sm space-y-1">
                                    {intent.recommended_actions.slice(0, 3).map((action, i) => (
                                      <li key={i} className="flex items-center gap-1">
                                        <span className="text-blue-500">→</span>
                                        {action}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            <Button size="sm" className="ml-4">
                              Contact Now
                            </Button>
                          </div>
                        </div>
                      )
                    })}

                  {companiesWithSignals.filter(c => c.intent_level === 'hot').length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No high priority alerts at this time
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}