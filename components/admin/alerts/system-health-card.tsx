'use client'

/**
 * System Health Card Component
 * Displays real-time health status of all critical services
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Shield, Zap, Mail } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SystemHealthCardProps {
  data: any
  onRefresh: () => void
}

const serviceIcons: Record<string, any> = {
  database: Database,
  supabase_auth: Shield,
  openrouter: Zap,
  resend: Mail,
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: 'default',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badge: 'default',
  },
  down: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'destructive',
  },
  unhealthy: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'destructive',
  },
}

export function SystemHealthCard({ data, onRefresh }: SystemHealthCardProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>Loading health status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const overallStatus = data.status || 'unknown'
  const services = data.services || []
  const config = statusConfig[overallStatus as keyof typeof statusConfig] || statusConfig.down
  const StatusIcon = config.icon

  // Calculate stats
  const healthyCount = services.filter((s: any) => s.status === 'healthy').length
  const degradedCount = services.filter((s: any) => s.status === 'degraded').length
  const downCount = services.filter((s: any) => s.status === 'down').length

  return (
    <Card className={overallStatus === 'unhealthy' ? 'border-destructive' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                System Health
                <Badge variant={config.badge as any}>
                  {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {healthyCount === services.length
                  ? 'All systems operational'
                  : `${downCount + degradedCount} service${downCount + degradedCount !== 1 ? 's' : ''} experiencing issues`}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service: any) => {
            const serviceConfig = statusConfig[service.status as keyof typeof statusConfig]
            const ServiceStatusIcon = serviceConfig?.icon || XCircle
            const ServiceIcon = serviceIcons[service.name] || Database

            return (
              <div
                key={service.name}
                className={`p-4 rounded-lg border ${serviceConfig?.borderColor || 'border-gray-200'} ${serviceConfig?.bgColor || 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ServiceIcon className="h-5 w-5 text-muted-foreground" />
                  <ServiceStatusIcon className={`h-4 w-4 ${serviceConfig?.color || 'text-gray-600'}`} />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-sm capitalize">
                    {service.name.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={serviceConfig?.badge as any || 'secondary'}
                      className="text-xs"
                    >
                      {service.status}
                    </Badge>
                    {service.responseTimeMs !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {service.responseTimeMs}ms
                      </span>
                    )}
                  </div>
                  {service.error && (
                    <div className="text-xs text-destructive truncate" title={service.error}>
                      {service.error}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">{healthyCount} Healthy</span>
            </div>
            {degradedCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-muted-foreground">{degradedCount} Degraded</span>
              </div>
            )}
            {downCount > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">{downCount} Down</span>
              </div>
            )}
          </div>
          {data.timestamp && (
            <div className="text-xs text-muted-foreground">
              Last checked {formatDistanceToNow(new Date(data.timestamp), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
