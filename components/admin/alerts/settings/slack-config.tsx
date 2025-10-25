/**
 * Slack Configuration Form
 *
 * Configure Slack webhook notifications for alerts.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, MessageSquare, TestTube2, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface SlackConfigFormProps {
  initialConfig?: any
  onSaved?: () => void
}

export function SlackConfigForm({ initialConfig, onSaved }: SlackConfigFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [channel, setChannel] = useState('')
  const [username, setUsername] = useState('oppSpot Alerts')
  const [iconEmoji, setIconEmoji] = useState(':warning:')
  const [mentionOn, setMentionOn] = useState<string[]>([])

  useEffect(() => {
    if (initialConfig) {
      setEnabled(initialConfig.enabled || false)
      setWebhookUrl(initialConfig.webhook_url || '')
      setChannel(initialConfig.channel || '')
      setUsername(initialConfig.username || 'oppSpot Alerts')
      setIconEmoji(initialConfig.icon_emoji || ':warning:')
      setMentionOn(initialConfig.mention_on || [])
    }
  }, [initialConfig])

  const toggleMention = (severity: string) => {
    setMentionOn((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    )
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      if (!webhookUrl) {
        toast({
          title: 'Validation Error',
          description: 'Webhook URL is required',
          variant: 'destructive',
        })
        setIsTesting(false)
        return
      }

      const response = await fetch('/api/notifications/slack/test', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Test failed')
      }

      toast({
        title: 'Test Successful',
        description: 'Check your Slack channel for the test message',
      })
    } catch (error) {
      console.error('[SlackConfig] Test error:', error)
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test message',
        variant: 'destructive',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (enabled && !webhookUrl) {
        toast({
          title: 'Validation Error',
          description: 'Webhook URL is required when notifications are enabled',
          variant: 'destructive',
        })
        setIsSaving(false)
        return
      }

      const config = {
        enabled,
        webhook_url: webhookUrl,
        channel: channel || undefined,
        username,
        icon_emoji: iconEmoji,
        mention_on: mentionOn,
      }

      const response = await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configKey: 'slack_settings',
          configValue: config,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: 'Settings Saved',
        description: 'Slack notification settings have been updated',
      })

      onSaved?.()
    } catch (error) {
      console.error('[SlackConfig] Save error:', error)
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
          <Label>Enable Slack Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Send alert notifications to Slack channels via incoming webhooks
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <Label htmlFor="webhookUrl">
          Webhook URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="webhookUrl"
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Create an incoming webhook at{' '}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            api.slack.com/messaging/webhooks
          </a>
        </p>
      </div>

      {/* Channel Override */}
      <div className="space-y-2">
        <Label htmlFor="channel">Channel Override (Optional)</Label>
        <Input
          id="channel"
          type="text"
          placeholder="#alerts"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Override the default channel configured in the webhook (optional)
        </p>
      </div>

      {/* Bot Name */}
      <div className="space-y-2">
        <Label htmlFor="username">Bot Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="oppSpot Alerts"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={!enabled}
        />
      </div>

      {/* Bot Icon */}
      <div className="space-y-2">
        <Label htmlFor="iconEmoji">Bot Icon Emoji</Label>
        <Input
          id="iconEmoji"
          type="text"
          placeholder=":warning:"
          value={iconEmoji}
          onChange={(e) => setIconEmoji(e.target.value)}
          disabled={!enabled}
        />
      </div>

      {/* Mention Settings */}
      <div className="space-y-2">
        <Label>@channel Mentions</Label>
        <p className="text-sm text-muted-foreground">
          Select which severity levels should trigger @channel mentions
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          {['P0', 'P1', 'P2', 'P3'].map((severity) => (
            <div key={severity} className="flex items-center space-x-2">
              <Checkbox
                id={`mention-${severity}`}
                checked={mentionOn.includes(severity)}
                onCheckedChange={() => toggleMention(severity)}
                disabled={!enabled}
              />
              <Label htmlFor={`mention-${severity}`} className="cursor-pointer">
                {severity} {severity === 'P0' ? '(Critical)' : severity === 'P1' ? '(High)' : ''}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Status Indicator */}
      {enabled && webhookUrl && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Slack notifications enabled
            {mentionOn.length > 0 && ` with @channel for ${mentionOn.join(', ')}`}
          </span>
        </div>
      )}

      {/* Save & Test Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || !webhookUrl}
          className="gap-2"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube2 className="h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Slack Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
