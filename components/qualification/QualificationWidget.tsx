'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Target,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap,
  BarChart3
} from 'lucide-react'

interface QualificationWidgetProps {
  compact?: boolean
}

export function QualificationWidget({ compact = false }: QualificationWidgetProps) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    qualified: 0,
    nurture: 0,
    disqualified: 0,
    conversionRate: 0,
    activeAlerts: 0,
    pendingActions: 0
  })

  const [recentQualifications, setRecentQualifications] = useState<Array<{
    created_at: string
    framework: string
    [key: string]: unknown
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQualificationData()
  }, [])

  const fetchQualificationData = async () => {
    try {
      const response = await fetch('/api/qualification/dashboard')
      if (response.ok) {
        const data = await response.json()

        if (data.stats) {
          setStats({
            totalLeads: data.stats.totalLeads || 0,
            qualified: data.stats.qualified || 0,
            nurture: data.stats.nurture || 0,
            disqualified: data.stats.disqualified || 0,
            conversionRate: data.stats.totalLeads > 0
              ? Math.round((data.stats.qualified / data.stats.totalLeads) * 100)
              : 0,
            activeAlerts: data.stats.recentAlerts || 0,
            pendingActions: data.stats.activeAssignments || 0
          })
        }

        // Get most recent qualifications
        interface QualificationBase {
          created_at: string;
          [key: string]: unknown;
        }
        const allQualifications = [
          ...(data.bantQualifications || []).map((q: QualificationBase) => ({ ...q, framework: 'BANT' })),
          ...(data.meddicQualifications || []).map((q: QualificationBase) => ({ ...q, framework: 'MEDDIC' }))
        ]

        setRecentQualifications(
          allQualifications
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        )
      }
    } catch (error) {
      console.error('Error fetching qualification data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Lead Qualification</CardTitle>
            </div>
            <Link href="/qualification">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                <p className="text-2xl font-bold text-green-600">{stats.qualified}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                <p className="text-2xl font-bold text-yellow-600">{stats.nurture}</p>
                <p className="text-xs text-muted-foreground">Nurture</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                <p className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
            </div>

            {/* Active Alerts */}
            {stats.activeAlerts > 0 && (
              <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">{stats.activeAlerts} active alerts</span>
                </div>
                <Link href="/qualification?tab=alerts">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Review
                  </Button>
                </Link>
              </div>
            )}

            {/* Pending Actions */}
            {stats.pendingActions > 0 && (
              <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">{stats.pendingActions} pending actions</span>
                </div>
                <Link href="/qualification?tab=pipeline">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View
                  </Button>
                </Link>
              </div>
            )}
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
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Qualification Pipeline
            </CardTitle>
            <CardDescription>
              Lead qualification status and insights
            </CardDescription>
          </div>
          <Link href="/qualification">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Full Dashboard
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overview Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <div className="text-center p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{stats.qualified}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
              <div className="text-center p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-2xl font-bold text-yellow-600">{stats.nurture}</p>
                <p className="text-xs text-muted-foreground">Nurture</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
            </div>

            {/* Qualification Distribution */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Qualification Distribution</span>
                <span className="text-muted-foreground">{stats.totalLeads} total</span>
              </div>
              <div className="flex h-8 overflow-hidden rounded-full bg-muted">
                {stats.totalLeads > 0 && (
                  <>
                    <div
                      className="bg-green-600 transition-all"
                      style={{ width: `${(stats.qualified / stats.totalLeads) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-600 transition-all"
                      style={{ width: `${(stats.nurture / stats.totalLeads) * 100}%` }}
                    />
                    <div
                      className="bg-red-600 transition-all"
                      style={{ width: `${(stats.disqualified / stats.totalLeads) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded-full" />
                  Qualified ({Math.round((stats.qualified / Math.max(stats.totalLeads, 1)) * 100)}%)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full" />
                  Nurture ({Math.round((stats.nurture / Math.max(stats.totalLeads, 1)) * 100)}%)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-600 rounded-full" />
                  Disqualified ({Math.round((stats.disqualified / Math.max(stats.totalLeads, 1)) * 100)}%)
                </span>
              </div>
            </div>

            {/* Recent Qualifications */}
            {recentQualifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Qualifications</h4>
                <div className="space-y-2">
                  {recentQualifications.map((qual, index) => {
                    const leadId = qual.lead_id as string | undefined;
                    return (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Lead #{leadId?.slice(0, 8)}</span>
                            <span className="text-xs text-muted-foreground">{qual.framework}</span>
                          </div>
                        </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{qual.overall_score as number}%</p>
                          <Badge
                            variant={
                              qual.qualification_status === 'qualified' || qual.forecast_category === 'commit'
                                ? 'default'
                                : qual.qualification_status === 'nurture' || qual.forecast_category === 'best_case'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {(qual.qualification_status || qual.forecast_category) as string}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Link href="/qualification" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  View Pipeline
                </Button>
              </Link>
              <Link href="/qualification?tab=alerts" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  {stats.activeAlerts > 0 && (
                    <Badge variant="destructive" className="mr-2 h-5 px-1">
                      {stats.activeAlerts}
                    </Badge>
                  )}
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Alerts
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}