/**
 * Webhook Configuration Form
 *
 * Configure custom webhook notifications for alerts.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Webhook, TestTube2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface WebhookConfigFormProps {
  initialConfig?: any
  onSaved?: () => void
}

export function WebhookConfigForm({ initialConfig, onSaved }: WebhookConfigFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [severityLevels, setSeverityLevels] = useState<string[]>([])
  const [retryAttempts, setRetryAttempts] = useState(3)
  const [timeoutMs, setTimeoutMs] = useState(10000)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (initialConfig) {
      setEnabled(initialConfig.enabled || false)
      setUrl(initialConfig.url || '')
      setSecret(initialConfig.secret || '')
      setSeverityLevels(initialConfig.severityLevels || [])
      setRetryAttempts(initialConfig.retryAttempts || 3)
      setTimeoutMs(initialConfig.timeoutMs || 10000)
    }
  }, [initialConfig])

  const toggleSeverity = (severity: string) => {
    setSeverityLevels((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    )
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      if (!url) {
        toast({
          title: 'Validation Error',
          description: 'Webhook URL is required',
          variant: 'destructive',
        })
        setIsTesting(false)
        return
      }

      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          secret: secret || undefined,
        }),
      })

      const data = await response.json()

      setTestResult(data)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Test failed')
      }

      toast({
        title: 'Test Successful',
        description: `Webhook responded in ${data.responseTime}ms with status ${data.statusCode}`,
      })
    } catch (error) {
      console.error('[WebhookConfig] Test error:', error)
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
      if (enabled && !url) {
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
        url,
        secret: secret || undefined,
        severityLevels: severityLevels.length > 0 ? severityLevels : undefined,
        retryAttempts,
        timeoutMs,
      }

      const response = await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configKey: 'webhook_settings',
          configValue: config,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: 'Settings Saved',
        description: 'Webhook notification settings have been updated',
      })

      onSaved?.()
    } catch (error) {
      console.error('[WebhookConfig] Save error:', error)
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
          <Label>Enable Webhook Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Send alert notifications to custom HTTP endpoints with retry logic
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <Label htmlFor="url">
          Webhook URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="url"
          type="url"
          placeholder="https://your-api.com/webhooks/alerts"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          The endpoint that will receive POST requests with alert data
        </p>
      </div>

      {/* Secret Key */}
      <div className="space-y-2">
        <Label htmlFor="secret">HMAC Secret Key (Optional)</Label>
        <div className="flex gap-2">
          <Input
            id="secret"
            type={showSecret ? 'text' : 'password'}
            placeholder="Enter a secret for HMAC signatures"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            disabled={!enabled}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSecret(!showSecret)}
            disabled={!enabled}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If provided, requests will include an X-oppSpot-Signature header with HMAC-SHA256
          signature
        </p>
      </div>

      {/* Severity Filter */}
      <div className="space-y-2">
        <Label>Severity Filter (Optional)</Label>
        <p className="text-sm text-muted-foreground">
          Only send alerts matching these severities. Leave empty to send all alerts.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          {['P0', 'P1', 'P2', 'P3'].map((severity) => (
            <div key={severity} className="flex items-center space-x-2">
              <Checkbox
                id={`severity-${severity}`}
                checked={severityLevels.includes(severity)}
                onCheckedChange={() => toggleSeverity(severity)}
                disabled={!enabled}
              />
              <Label htmlFor={`severity-${severity}`} className="cursor-pointer">
                {severity}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Retry Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="retryAttempts">Retry Attempts</Label>
          <Input
            id="retryAttempts"
            type="number"
            min="1"
            max="5"
            value={retryAttempts}
            onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 3)}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">Number of retry attempts (1-5)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeoutMs">Timeout (ms)</Label>
          <Input
            id="timeoutMs"
            type="number"
            min="5000"
            max="30000"
            step="1000"
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 10000)}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">Request timeout (5000-30000ms)</p>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-3 rounded-lg ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 mt-0.5" />
            ) : (
              <Webhook className="h-4 w-4 mt-0.5" />
            )}
            <div className="flex-1 text-sm">
              {testResult.success ? (
                <div>
                  <div className="font-medium">Test Successful</div>
                  <div>
                    Status: {testResult.statusCode} | Response time: {testResult.responseTime}ms
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium">Test Failed</div>
                  <div>{testResult.error}</div>
                  {testResult.responseTime && <div>Response time: {testResult.responseTime}ms</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {enabled && url && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Webhook notifications enabled
            {severityLevels.length > 0 && ` for ${severityLevels.join(', ')}`}
            {secret && ' with HMAC signatures'}
          </span>
        </div>
      )}

      {/* Save & Test Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleTest} disabled={isTesting || !url} className="gap-2">
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube2 className="h-4 w-4" />
              Test Webhook
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
              Save Webhook Settings
            </>
          )}
        </Button>
      </div>

      {/* Webhook Logs Link */}
      {enabled && url && (
        <div className="pt-4 border-t">
          <Button variant="link" asChild className="px-0">
            <a href="/api/webhooks/logs" target="_blank" rel="noopener noreferrer">
              View Webhook Delivery Logs →
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
