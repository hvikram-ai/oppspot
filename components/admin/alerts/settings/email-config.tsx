/**
 * Email Configuration Form
 *
 * Configure email notification settings for alerts.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Mail, Plus, X, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface EmailConfigFormProps {
  initialConfig?: any
  onSaved?: () => void
}

export function EmailConfigForm({ initialConfig, onSaved }: EmailConfigFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [fromEmail, setFromEmail] = useState('')
  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    if (initialConfig) {
      setEnabled(initialConfig.enabled || false)
      setFromEmail(initialConfig.from || 'alerts@oppspot.ai')
      setAdminEmails(initialConfig.admin_emails || [])
    }
  }, [initialConfig])

  const handleAddEmail = () => {
    const email = newEmail.trim()

    if (!email) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    if (adminEmails.includes(email)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email is already in the list',
        variant: 'destructive',
      })
      return
    }

    setAdminEmails([...adminEmails, email])
    setNewEmail('')
  }

  const handleRemoveEmail = (email: string) => {
    setAdminEmails(adminEmails.filter((e) => e !== email))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (enabled && adminEmails.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'At least one admin email is required when notifications are enabled',
          variant: 'destructive',
        })
        setIsSaving(false)
        return
      }

      const config = {
        enabled,
        from: fromEmail,
        admin_emails: adminEmails,
      }

      const response = await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configKey: 'email_settings',
          configValue: config,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: 'Settings Saved',
        description: 'Email notification settings have been updated',
      })

      onSaved?.()
    } catch (error) {
      console.error('[EmailConfig] Save error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Email Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Send alert notifications via email to configured recipients
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* From Email */}
      <div className="space-y-2">
        <Label htmlFor="fromEmail">From Email Address</Label>
        <Input
          id="fromEmail"
          type="email"
          placeholder="alerts@oppspot.ai"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          The email address that alerts will be sent from
        </p>
      </div>

      {/* Admin Emails */}
      <div className="space-y-2">
        <Label>Admin Email Recipients</Label>
        <p className="text-sm text-muted-foreground">
          Add email addresses that should receive alert notifications
        </p>

        {/* Email List */}
        {adminEmails.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
            {adminEmails.map((email) => (
              <Badge key={email} variant="secondary" className="pl-3 pr-1">
                {email}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                  onClick={() => handleRemoveEmail(email)}
                  disabled={!enabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Email Input */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="admin@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddEmail()
              }
            }}
            disabled={!enabled}
          />
          <Button
            variant="outline"
            onClick={handleAddEmail}
            disabled={!enabled || !newEmail.trim()}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Status Indicator */}
      {enabled && adminEmails.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Email notifications enabled for {adminEmails.length} recipient
            {adminEmails.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Email Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
