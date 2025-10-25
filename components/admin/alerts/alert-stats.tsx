'use client'

/**
 * Alert Statistics Component
 * Displays alert metrics and charts
 */

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react'

export function AlertStats() {
  const [stats, setStats] = useState<any>(null)
  const [timeWindow, setTimeWindow] = useState<'1h' | '24h' | '7d'>('24h')
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/alerts/stats?window=${timeWindow}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [timeWindow])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const openCount = stats.byStatus?.open || 0
  const acknowledgedCount = stats.byStatus?.acknowledged || 0
  const investigatingCount = stats.byStatus?.investigating || 0
  const resolvedCount = stats.byStatus?.resolved || 0

  const p0Count = stats.bySeverity?.P0 || 0
  const p1Count = stats.bySeverity?.P1 || 0
  const p2Count = stats.bySeverity?.P2 || 0
  const p3Count = stats.bySeverity?.P3 || 0

  const totalCritical = p0Count + p1Count
  const totalAlerts = stats.total || 0

  return (
    <div className="space-y-4">
      {/* Time Window Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Alert Statistics</h2>
        <Tabs value={timeWindow} onValueChange={(v) => setTimeWindow(v as '1h' | '24h' | '7d')}>
          <TabsList>
            <TabsTrigger value="1h">Last Hour</TabsTrigger>
            <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAlerts}</div>
            <div className="text-xs text-muted-foreground mt-1">
              in the last {timeWindow === '1h' ? 'hour' : timeWindow === '24h' ? '24 hours' : '7 days'}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className={totalCritical > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical (P0/P1)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{totalCritical}</div>
            <div className="text-xs text-muted-foreground mt-1">
              P0: {p0Count} · P1: {p1Count}
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openCount + acknowledgedCount + investigatingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Open: {openCount} · Ack: {acknowledgedCount} · Investigating: {investigatingCount}
            </div>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{resolvedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalAlerts > 0
                ? `${Math.round((resolvedCount / totalAlerts) * 100)}% resolution rate`
                : 'No alerts'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">P0</Badge>
                <span className="text-sm">Critical</span>
              </div>
              <span className="font-semibold">{p0Count}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">P1</Badge>
                <span className="text-sm">High</span>
              </div>
              <span className="font-semibold">{p1Count}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">P2</Badge>
                <span className="text-sm">Medium</span>
              </div>
              <span className="font-semibold">{p2Count}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">P3</Badge>
                <span className="text-sm">Low</span>
              </div>
              <span className="font-semibold">{p3Count}</span>
            </div>
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byCategory && Object.keys(stats.byCategory).length > 0 ? (
              Object.entries(stats.byCategory)
                .sort((a: any, b: any) => b[1] - a[1])
                .map(([category, count]: [string, any]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
