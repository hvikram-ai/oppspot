'use client'

/**
 * Workflow Notification Preferences Component
 * Allows users to configure which workflow notifications they want to receive
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, Mail, Smartphone, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface NotificationPreferences {
  // Email notifications
  email_approval_requested: boolean
  email_approval_reminder: boolean
  email_task_assigned: boolean
  email_task_due_soon: boolean
  email_task_overdue: boolean
  email_workflow_completed: boolean
  email_document_uploaded: boolean

  // In-app notifications
  inapp_approval_requested: boolean
  inapp_approval_reminder: boolean
  inapp_task_assigned: boolean
  inapp_task_due_soon: boolean
  inapp_task_overdue: boolean
  inapp_workflow_completed: boolean
  inapp_document_uploaded: boolean

  // Quiet hours
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
}

export function WorkflowNotificationPreferences({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    // Email - default all enabled except document uploads
    email_approval_requested: true,
    email_approval_reminder: true,
    email_task_assigned: true,
    email_task_due_soon: true,
    email_task_overdue: true,
    email_workflow_completed: true,
    email_document_uploaded: false,

    // In-app - all enabled
    inapp_approval_requested: true,
    inapp_approval_reminder: true,
    inapp_task_assigned: true,
    inapp_task_due_soon: true,
    inapp_task_overdue: true,
    inapp_workflow_completed: true,
    inapp_document_uploaded: true,

    // Quiet hours - disabled by default
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/settings/workflow-notifications?userId=${userId}`)
      const result = await response.json()

      if (result.success && result.data) {
        setPreferences(result.data)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/workflow-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Preferences Saved',
          description: 'Your notification preferences have been updated.'
        })
      } else {
        throw new Error(result.error || 'Failed to save preferences')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save preferences',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const notificationTypes = [
    {
      key: 'approval_requested',
      label: 'Approval Requested',
      description: 'When you are assigned an approval request'
    },
    {
      key: 'approval_reminder',
      label: 'Approval Reminders',
      description: 'Reminders for pending approvals approaching deadline'
    },
    {
      key: 'task_assigned',
      label: 'Task Assigned',
      description: 'When a task is assigned to you'
    },
    {
      key: 'task_due_soon',
      label: 'Task Due Soon',
      description: 'Reminders when tasks are approaching due date'
    },
    {
      key: 'task_overdue',
      label: 'Task Overdue',
      description: 'Notifications when tasks become overdue'
    },
    {
      key: 'workflow_completed',
      label: 'Workflow Completed',
      description: 'When a workflow you participated in is completed'
    },
    {
      key: 'document_uploaded',
      label: 'Document Uploaded',
      description: 'When documents are uploaded to data rooms you have access to'
    }
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading preferences...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose which workflow events trigger email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2">
              <div className="flex-1">
                <Label htmlFor={`email-${key}`} className="font-medium">
                  {label}
                </Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={`email-${key}`}
                checked={preferences[`email_${key}` as keyof NotificationPreferences] as boolean}
                onCheckedChange={(checked) =>
                  updatePreference(`email_${key}` as keyof NotificationPreferences, checked)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-600" />
            <CardTitle>In-App Notifications</CardTitle>
          </div>
          <CardDescription>
            Notifications shown in the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2">
              <div className="flex-1">
                <Label htmlFor={`inapp-${key}`} className="font-medium">
                  {label}
                </Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={`inapp-${key}`}
                checked={preferences[`inapp_${key}` as keyof NotificationPreferences] as boolean}
                onCheckedChange={(checked) =>
                  updatePreference(`inapp_${key}` as keyof NotificationPreferences, checked)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-indigo-600" />
            <CardTitle>Quiet Hours</CardTitle>
          </div>
          <CardDescription>
            Pause non-urgent notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="quiet-hours-enabled" className="font-medium">
              Enable Quiet Hours
            </Label>
            <Switch
              id="quiet-hours-enabled"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Select
                    value={preferences.quiet_hours_start}
                    onValueChange={(value) => updatePreference('quiet_hours_start', value)}
                  >
                    <SelectTrigger id="quiet-start">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Select
                    value={preferences.quiet_hours_end}
                    onValueChange={(value) => updatePreference('quiet_hours_end', value)}
                  >
                    <SelectTrigger id="quiet-end">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => updatePreference('timezone', value)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="Asia/Hong_Kong">Hong Kong</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Non-urgent notifications will be queued and delivered after quiet hours end.
                Urgent notifications (e.g., expiring approvals) will still be sent.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={loadPreferences} disabled={saving}>
          Reset
        </Button>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? (
            'Saving...'
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
