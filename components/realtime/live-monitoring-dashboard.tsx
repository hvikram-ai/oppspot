'use client'

/**
 * Live Monitoring Dashboard
 *
 * Comprehensive real-time monitoring dashboard showing:
 * - Stream progress
 * - Scan progress
 * - Agent executions
 * - Signal alerts
 * - System health
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  useAllStreamsProgress,
  useScanProgress,
  useSignalAlerts,
  useAgentExecutions,
  useRealtimeNotifications
} from '@/hooks/use-realtime'
import { LiveProgressIndicator, MultiProgressIndicator } from './live-progress-indicator'
import { ConnectionStatus, MultiConnectionStatus } from './connection-status'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  Bell,
  Bot,
  Search,
  TrendingUp,
  Workflow,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

interface LiveMonitoringDashboardProps {
  orgId?: string
  userId?: string
  activeScanId?: string
  activeStreamId?: string
}

export function LiveMonitoringDashboard({
  orgId,
  userId,
  activeScanId,
  activeStreamId
}: LiveMonitoringDashboardProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null)
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(orgId || null)

  // Fetch user and org info if not provided
  useEffect(() => {
    if (!userId || !orgId) {
      const fetchUserInfo = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)

          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single() as { data: { org_id: string } | null; error: unknown }

          if (profile?.org_id) {
            setCurrentOrgId(profile.org_id)
          }
        }
      }
      fetchUserInfo()
    }
  }, [userId, orgId])

  // Real-time subscriptions
  const streamsProgress = useAllStreamsProgress(currentOrgId)
  const scanProgress = useScanProgress(activeScanId || null)
  const signalAlerts = useSignalAlerts(currentUserId)
  const agentExecutions = useAgentExecutions(activeStreamId || null)
  const notifications = useRealtimeNotifications(currentUserId)

  const activeStreams = streamsProgress.updates.filter(
    (s) => s.goal_status === 'in_progress' || s.goal_status === 'on_track'
  )

  const runningAgents = agentExecutions.executions.filter(
    (e) => e.status === 'running'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Monitoring</h1>
          <p className="text-muted-foreground">Real-time system activity dashboard</p>
        </div>
        <ConnectionStatus status={streamsProgress.status} />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStreams.length}</div>
            <p className="text-xs text-muted-foreground">
              {streamsProgress.isConnected ? 'Live updates' : 'Offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningAgents.length}</div>
            <p className="text-xs text-muted-foreground">
              {agentExecutions.isConnected ? 'Live updates' : 'Offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signalAlerts.unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              {signalAlerts.isConnected ? 'Live monitoring' : 'Offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              {notifications.isConnected ? 'Live updates' : 'Offline'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="streams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="streams">Streams</TabsTrigger>
          <TabsTrigger value="scans">Scans</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Streams</CardTitle>
                  <CardDescription>Real-time stream progress monitoring</CardDescription>
                </div>
                <ConnectionStatus status={streamsProgress.status} size="sm" />
              </div>
            </CardHeader>
            <CardContent>
              {activeStreams.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No active streams
                </div>
              ) : (
                <div className="space-y-4">
                  {activeStreams.map((stream) => (
                    <LiveProgressIndicator
                      key={stream.id}
                      title={`Stream ${stream.id.substring(0, 8)}`}
                      percentage={stream.current_progress.percentage}
                      status={stream.goal_status}
                      completed={stream.current_progress.completed}
                      total={stream.current_progress.total}
                      lastUpdated={stream.current_progress.last_updated}
                      connectionStatus={streamsProgress.status}
                      showConnectionStatus={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Acquisition Scans</CardTitle>
                  <CardDescription>Real-time scan progress</CardDescription>
                </div>
                {activeScanId && <ConnectionStatus status={scanProgress.status} size="sm" />}
              </div>
            </CardHeader>
            <CardContent>
              {!activeScanId ? (
                <div className="text-center text-muted-foreground py-8">
                  No active scan selected
                </div>
              ) : scanProgress.progress ? (
                <LiveProgressIndicator
                  title="Current Scan"
                  percentage={scanProgress.progress.progress_percentage}
                  status={scanProgress.progress.status}
                  currentStep={scanProgress.progress.current_step}
                  completed={scanProgress.progress.targets_analyzed}
                  total={scanProgress.progress.targets_identified}
                  lastUpdated={scanProgress.progress.updated_at}
                  connectionStatus={scanProgress.status}
                  showConnectionStatus={false}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Waiting for scan data...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agent Executions</CardTitle>
                  <CardDescription>Real-time agent activity</CardDescription>
                </div>
                {activeStreamId && (
                  <ConnectionStatus status={agentExecutions.status} size="sm" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!activeStreamId ? (
                <div className="text-center text-muted-foreground py-8">
                  No active stream selected
                </div>
              ) : runningAgents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No agents currently running
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {runningAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Bot className="h-5 w-5 text-blue-500 animate-pulse" />
                          <div>
                            <p className="font-medium">Agent {agent.agent_id.substring(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              Started {new Date(agent.started_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          {agent.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Signal Alerts</CardTitle>
                  <CardDescription>Live signal monitoring</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{signalAlerts.unreadCount} unread</Badge>
                  <ConnectionStatus status={signalAlerts.status} size="sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {signalAlerts.alerts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No alerts yet
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {signalAlerts.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 rounded-lg border p-4"
                      >
                        <AlertTriangle
                          className={`h-5 w-5 ${
                            alert.priority === 'urgent'
                              ? 'text-red-500'
                              : alert.priority === 'high'
                              ? 'text-orange-500'
                              : 'text-yellow-500'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{alert.business_name}</p>
                              <p className="text-sm text-muted-foreground">{alert.signal_type}</p>
                            </div>
                            <Badge variant="outline">{alert.priority}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time connection status</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiConnectionStatus
                subscriptions={[
                  { name: 'Streams', status: streamsProgress.status },
                  { name: 'Scans', status: scanProgress.status },
                  { name: 'Agents', status: agentExecutions.status },
                  { name: 'Signals', status: signalAlerts.status },
                  { name: 'Notifications', status: notifications.status }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
