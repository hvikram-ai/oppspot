'use client'

/**
 * Admin Alerts Dashboard
 * View and manage system alerts
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Activity, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react'
import { AlertList } from '@/components/admin/alerts/alert-list'
import { AlertStats } from '@/components/admin/alerts/alert-stats'
import { SystemHealthCard } from '@/components/admin/alerts/system-health-card'
import Link from 'next/link'

export default function AdminAlertsPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [isLoading, setIsLoading] = useState(false)
  const [healthData, setHealthData] = useState<any>(null)

  // Fetch system health
  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthData(data)
    } catch (error) {
      console.error('Failed to fetch health:', error)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Refresh health every 60 seconds
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    fetchHealth()
    // Trigger refresh on child components via key change
    setTimeout(() => setIsLoading(false), 500)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage critical system failures
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/alerts/settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <SystemHealthCard data={healthData} onRefresh={fetchHealth} />

      {/* Alert Statistics */}
      <AlertStats />

      {/* Alerts List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            All Alerts
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolved
          </TabsTrigger>
          <TabsTrigger value="critical" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Critical (P0/P1)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <AlertList
            filter={{ status: ['open', 'acknowledged', 'investigating'] }}
            key={isLoading ? 'loading' : 'loaded'}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <AlertList filter={{}} key={isLoading ? 'loading' : 'loaded'} />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <AlertList
            filter={{ status: ['resolved'] }}
            key={isLoading ? 'loading' : 'loaded'}
          />
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <AlertList
            filter={{ severity: ['P0', 'P1'] }}
            key={isLoading ? 'loading' : 'loaded'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
