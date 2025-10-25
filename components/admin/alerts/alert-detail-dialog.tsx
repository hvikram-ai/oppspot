'use client'

/**
 * Alert Detail Dialog
 * Full-screen dialog for viewing and managing alert details
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle, Clock, Server, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AlertDetailDialogProps {
  alert: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function AlertDetailDialog({
  alert,
  open,
  onOpenChange,
  onUpdate,
}: AlertDetailDialogProps) {
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAcknowledge = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/alerts/${alert.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: acknowledgeNotes }),
      })

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResolve = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/alerts/${alert.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes }),
      })

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!alert) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <AlertTriangle
              className={`h-6 w-6 ${
                alert.severity === 'P0' || alert.severity === 'P1'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            />
            {alert.title}
          </DialogTitle>
          <DialogDescription>
            Alert ID: {alert.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={alert.severity === 'P0' || alert.severity === 'P1' ? 'destructive' : 'default'}>
              {alert.severity}
            </Badge>
            <Badge variant="outline">{alert.status}</Badge>
            <Badge variant="outline">{alert.category}</Badge>
            {alert.occurrence_count > 1 && (
              <Badge variant="secondary">{alert.occurrence_count} occurrences</Badge>
            )}
          </div>

          {/* Message */}
          <div>
            <Label className="text-base font-semibold">Message</Label>
            <div className="mt-2 text-sm text-muted-foreground bg-muted p-4 rounded-md">
              {alert.message}
            </div>
          </div>

          {/* Source Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Service</Label>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Server className="h-4 w-4" />
                {alert.source_service}
              </div>
            </div>
            {alert.source_endpoint && (
              <div>
                <Label className="text-sm font-semibold">Endpoint</Label>
                <div className="mt-1 text-sm font-mono text-muted-foreground">
                  {alert.source_method} {alert.source_endpoint}
                </div>
              </div>
            )}
          </div>

          {/* Error Stack */}
          {alert.error_stack && (
            <div>
              <Label className="text-base font-semibold">Error Stack Trace</Label>
              <pre className="mt-2 text-xs bg-muted p-4 rounded-md overflow-x-auto font-mono">
                {alert.error_stack}
              </pre>
            </div>
          )}

          {/* Context */}
          {alert.context && Object.keys(alert.context).length > 0 && (
            <div>
              <Label className="text-base font-semibold">Additional Context</Label>
              <pre className="mt-2 text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(alert.context, null, 2)}
              </pre>
            </div>
          )}

          {/* Tags */}
          {alert.tags && alert.tags.length > 0 && (
            <div>
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {alert.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">First Occurred</Label>
              <div className="mt-1 text-sm text-muted-foreground">
                {new Date(alert.first_occurred_at).toLocaleString()}
                <div className="text-xs">
                  ({formatDistanceToNow(new Date(alert.first_occurred_at), { addSuffix: true })})
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Last Occurred</Label>
              <div className="mt-1 text-sm text-muted-foreground">
                {new Date(alert.last_occurred_at).toLocaleString()}
                <div className="text-xs">
                  ({formatDistanceToNow(new Date(alert.last_occurred_at), { addSuffix: true })})
                </div>
              </div>
            </div>
            {alert.acknowledged_at && (
              <div>
                <Label className="text-sm font-semibold">Acknowledged</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {new Date(alert.acknowledged_at).toLocaleString()}
                </div>
              </div>
            )}
            {alert.resolved_at && (
              <div>
                <Label className="text-sm font-semibold">Resolved</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {new Date(alert.resolved_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Notification Status */}
          {alert.channels_notified && alert.channels_notified.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">Notifications Sent</Label>
              <div className="mt-2 flex gap-2">
                {alert.channels_notified.map((channel: string) => (
                  <Badge key={channel} variant="secondary">
                    {channel}
                  </Badge>
                ))}
              </div>
              {alert.notification_sent_at && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(alert.notification_sent_at), { addSuffix: true })}
                </div>
              )}
            </div>
          )}

          {/* Resolution Notes (if exists) */}
          {alert.resolution_notes && (
            <div>
              <Label className="text-base font-semibold">Resolution Notes</Label>
              <div className="mt-2 text-sm text-muted-foreground bg-muted p-4 rounded-md">
                {alert.resolution_notes}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          {alert.status === 'open' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="acknowledgeNotes">Acknowledge Alert (Optional Notes)</Label>
                <Textarea
                  id="acknowledgeNotes"
                  placeholder="Add any notes about this acknowledgment..."
                  value={acknowledgeNotes}
                  onChange={(e) => setAcknowledgeNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleAcknowledge}
                disabled={isSubmitting}
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Acknowledge Alert
              </Button>
            </div>
          )}

          {alert.status !== 'resolved' && alert.status !== 'false_positive' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="resolutionNotes">Resolve Alert (Required Notes)</Label>
                <Textarea
                  id="resolutionNotes"
                  placeholder="Describe how this issue was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="mt-2"
                  rows={4}
                  required
                />
              </div>
              <Button
                onClick={handleResolve}
                disabled={isSubmitting || !resolutionNotes.trim()}
                variant="default"
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Alert
              </Button>
            </div>
          )}

          {/* Runbook Link */}
          {alert.runbook_url && (
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <a href={alert.runbook_url} target="_blank" rel="noopener noreferrer">
                  View Runbook Documentation →
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
