'use client'

/**
 * Alert Card Component
 * Displays a single alert with actions
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Server,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AlertDetailDialog } from './alert-detail-dialog'

interface AlertCardProps {
  alert: any
  onUpdate: () => void
  isSelected?: boolean
  onToggleSelection?: () => void
}

const severityConfig = {
  P0: { label: 'P0 - Critical', color: 'destructive', icon: AlertTriangle },
  P1: { label: 'P1 - High', color: 'destructive', icon: AlertTriangle },
  P2: { label: 'P2 - Medium', color: 'default', icon: AlertTriangle },
  P3: { label: 'P3 - Low', color: 'secondary', icon: AlertTriangle },
}

const statusConfig = {
  open: { label: 'Open', color: 'destructive', icon: AlertTriangle },
  acknowledged: { label: 'Acknowledged', color: 'default', icon: Eye },
  investigating: { label: 'Investigating', color: 'default', icon: Clock },
  resolved: { label: 'Resolved', color: 'secondary', icon: CheckCircle },
  false_positive: { label: 'False Positive', color: 'secondary', icon: CheckCircle },
}

const categoryLabels: Record<string, string> = {
  database_failure: 'Database',
  api_failure: 'API',
  external_service_failure: 'External Service',
  auth_failure: 'Authentication',
  data_integrity: 'Data Integrity',
  performance_degradation: 'Performance',
  security_incident: 'Security',
  rate_limit_exceeded: 'Rate Limit',
  job_failure: 'Job Failure',
  custom: 'Custom',
}

export function AlertCard({ alert, onUpdate, isSelected = false, onToggleSelection }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const severityInfo = severityConfig[alert.severity as keyof typeof severityConfig]
  const statusInfo = statusConfig[alert.status as keyof typeof statusConfig]
  const SeverityIcon = severityInfo?.icon || AlertTriangle
  const StatusIcon = statusInfo?.icon || Clock

  const handleAcknowledge = async () => {
    try {
      const response = await fetch(`/api/alerts/${alert.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Acknowledged from dashboard' }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const handleResolve = async () => {
    try {
      const response = await fetch(`/api/alerts/${alert.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: 'Resolved from dashboard' }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  return (
    <>
      <Card className={`${alert.status === 'open' && alert.severity === 'P0' ? 'border-destructive' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {onToggleSelection && (
                <div className="mt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggleSelection}
                    aria-label={`Select alert: ${alert.title}`}
                  />
                </div>
              )}
              <div className="mt-1">
                <SeverityIcon
                  className={`h-5 w-5 ${
                    alert.severity === 'P0' || alert.severity === 'P1'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold">{alert.title}</h3>
                  <Badge variant={severityInfo?.color as any}>
                    {severityInfo?.label || alert.severity}
                  </Badge>
                  <Badge variant={statusInfo?.color as any}>
                    {statusInfo?.label || alert.status}
                  </Badge>
                  <Badge variant="outline">
                    {categoryLabels[alert.category] || alert.category}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {alert.message}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    {alert.source_service}
                  </div>
                  {alert.source_endpoint && (
                    <div className="font-mono">{alert.source_endpoint}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </div>
                  {alert.occurrence_count > 1 && (
                    <Badge variant="outline" className="text-xs">
                      {alert.occurrence_count}x
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailDialog(true)}
              >
                View Details
              </Button>

              {alert.status === 'open' && (
                <Button variant="outline" size="sm" onClick={handleAcknowledge}>
                  Acknowledge
                </Button>
              )}

              {alert.status !== 'resolved' && alert.status !== 'false_positive' && (
                <Button variant="default" size="sm" onClick={handleResolve}>
                  Resolve
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Expanded Details */}
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-3 text-sm">
              {/* Full Message */}
              <div>
                <div className="font-semibold mb-1">Full Message:</div>
                <div className="text-muted-foreground bg-muted p-3 rounded-md">
                  {alert.message}
                </div>
              </div>

              {/* Error Stack */}
              {alert.error_stack && (
                <div>
                  <div className="font-semibold mb-1">Error Stack:</div>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                    {alert.error_stack}
                  </pre>
                </div>
              )}

              {/* Context */}
              {alert.context && Object.keys(alert.context).length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Context:</div>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(alert.context, null, 2)}
                  </pre>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <div className="font-semibold">First Occurred:</div>
                  <div className="text-muted-foreground">
                    {new Date(alert.first_occurred_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Last Occurred:</div>
                  <div className="text-muted-foreground">
                    {new Date(alert.last_occurred_at).toLocaleString()}
                  </div>
                </div>
                {alert.acknowledged_at && (
                  <div>
                    <div className="font-semibold">Acknowledged:</div>
                    <div className="text-muted-foreground">
                      {new Date(alert.acknowledged_at).toLocaleString()}
                    </div>
                  </div>
                )}
                {alert.resolved_at && (
                  <div>
                    <div className="font-semibold">Resolved:</div>
                    <div className="text-muted-foreground">
                      {new Date(alert.resolved_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Notes */}
              {alert.resolution_notes && (
                <div className="pt-2 border-t">
                  <div className="font-semibold mb-1">Resolution Notes:</div>
                  <div className="text-muted-foreground">{alert.resolution_notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Detail Dialog */}
      <AlertDetailDialog
        alert={alert}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onUpdate={onUpdate}
      />
    </>
  )
}
