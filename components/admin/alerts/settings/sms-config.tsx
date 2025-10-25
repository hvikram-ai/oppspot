/**
 * SMS Configuration Form
 *
 * Configure SMS (Twilio) notifications for alerts.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Save,
  MessageCircle,
  TestTube2,
  CheckCircle,
  AlertTriangle,
  Plus,
  X,
  Eye,
  EyeOff,
  DollarSign,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface SmsConfigFormProps {
  initialConfig?: any
  onSaved?: () => void
}

export function SmsConfigForm({ initialConfig, onSaved }: SmsConfigFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [fromNumber, setFromNumber] = useState('')
  const [toNumbers, setToNumbers] = useState<string[]>([])
  const [newNumber, setNewNumber] = useState('')
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [severityLevels, setSeverityLevels] = useState<string[]>(['P0', 'P1'])
  const [maxPerHour, setMaxPerHour] = useState(5)

  useEffect(() => {
    if (initialConfig) {
      setEnabled(initialConfig.enabled || false)
      setAccountSid(initialConfig.accountSid || '')
      setAuthToken(initialConfig.authToken || '')
      setFromNumber(initialConfig.fromNumber || '')
      setToNumbers(initialConfig.toNumbers || [])
      setSeverityLevels(initialConfig.severityLevels || ['P0', 'P1'])
      setMaxPerHour(initialConfig.maxPerHour || 5)
    }
  }, [initialConfig])

  const toggleSeverity = (severity: string) => {
    setSeverityLevels((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    )
  }

  const handleAddNumber = () => {
    const number = newNumber.trim()

    if (!number) return

    // Basic phone number validation (international format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(number)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Phone number must be in international format (e.g., +14155551234)',
        variant: 'destructive',
      })
      return
    }

    if (toNumbers.includes(number)) {
      toast({
        title: 'Duplicate Number',
        description: 'This phone number is already in the list',
        variant: 'destructive',
      })
      return
    }

    setToNumbers([...toNumbers, number])
    setNewNumber('')
  }

  const handleRemoveNumber = (number: string) => {
    setToNumbers(toNumbers.filter((n) => n !== number))
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      if (!accountSid || !authToken || !fromNumber || toNumbers.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'All fields are required to test SMS',
          variant: 'destructive',
        })
        setIsTesting(false)
        return
      }

      const response = await fetch('/api/notifications/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toNumbers[0], // Send to first number
          accountSid,
          authToken,
          fromNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Test failed')
      }

      toast({
        title: 'Test Successful',
        description: `SMS sent to ${toNumbers[0]}. Check your phone!`,
      })
    } catch (error) {
      console.error('[SmsConfig] Test error:', error)
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test SMS',
        variant: 'destructive',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (enabled && (!accountSid || !authToken || !fromNumber || toNumbers.length === 0)) {
        toast({
          title: 'Validation Error',
          description: 'All fields are required when SMS notifications are enabled',
          variant: 'destructive',
        })
        setIsSaving(false)
        return
      }

      const config = {
        enabled,
        accountSid,
        authToken,
        fromNumber,
        toNumbers,
        severityLevels,
        maxPerHour,
      }

      const response = await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configKey: 'sms_settings',
          configValue: config,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: 'Settings Saved',
        description: 'SMS notification settings have been updated',
      })

      onSaved?.()
    } catch (error) {
      console.error('[SmsConfig] Save error:', error)
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
      {/* Cost Warning */}
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> SMS notifications cost money per message. Twilio charges per SMS
          sent. Rate limiting is enabled by default to prevent excessive costs.
        </AlertDescription>
      </Alert>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable SMS Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Send critical alerts via SMS using Twilio (costs apply)
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Twilio Account SID */}
      <div className="space-y-2">
        <Label htmlFor="accountSid">
          Twilio Account SID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="accountSid"
          type="text"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={accountSid}
          onChange={(e) => setAccountSid(e.target.value)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Find this in your{' '}
          <a
            href="https://console.twilio.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Twilio Console
          </a>
        </p>
      </div>

      {/* Twilio Auth Token */}
      <div className="space-y-2">
        <Label htmlFor="authToken">
          Twilio Auth Token <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="authToken"
            type={showAuthToken ? 'text' : 'password'}
            placeholder="Your auth token"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            disabled={!enabled}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAuthToken(!showAuthToken)}
            disabled={!enabled}
          >
            {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* From Number */}
      <div className="space-y-2">
        <Label htmlFor="fromNumber">
          Twilio Phone Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fromNumber"
          type="tel"
          placeholder="+14155551234"
          value={fromNumber}
          onChange={(e) => setFromNumber(e.target.value)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Your Twilio phone number in international format (must start with +)
        </p>
      </div>

      {/* Recipient Numbers */}
      <div className="space-y-2">
        <Label>
          Recipient Phone Numbers <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Add phone numbers that should receive SMS alerts (international format)
        </p>

        {/* Number List */}
        {toNumbers.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
            {toNumbers.map((number) => (
              <Badge key={number} variant="secondary" className="pl-3 pr-1">
                {number}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                  onClick={() => handleRemoveNumber(number)}
                  disabled={!enabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Number Input */}
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="+14155551234"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddNumber()
              }
            }}
            disabled={!enabled}
          />
          <Button
            variant="outline"
            onClick={handleAddNumber}
            disabled={!enabled || !newNumber.trim()}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="space-y-2">
        <Label>Severity Filter</Label>
        <p className="text-sm text-muted-foreground">
          Only send SMS for these severities (default: P0, P1 only)
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          {['P0', 'P1', 'P2', 'P3'].map((severity) => (
            <div key={severity} className="flex items-center space-x-2">
              <Checkbox
                id={`sms-severity-${severity}`}
                checked={severityLevels.includes(severity)}
                onCheckedChange={() => toggleSeverity(severity)}
                disabled={!enabled}
              />
              <Label htmlFor={`sms-severity-${severity}`} className="cursor-pointer">
                {severity} {severity === 'P0' ? '(Critical)' : severity === 'P1' ? '(High)' : ''}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="space-y-2">
        <Label htmlFor="maxPerHour">Rate Limit (per recipient)</Label>
        <Input
          id="maxPerHour"
          type="number"
          min="1"
          max="20"
          value={maxPerHour}
          onChange={(e) => setMaxPerHour(parseInt(e.target.value) || 5)}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          Maximum SMS per hour per recipient to prevent excessive costs (1-20)
        </p>
      </div>

      {/* Cost Estimate */}
      {enabled && toNumbers.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cost Estimate:</strong> With {toNumbers.length} recipient(s) and a limit of{' '}
            {maxPerHour} SMS/hour, you could send up to{' '}
            {toNumbers.length * maxPerHour * 24} SMS/day. At ~$0.01/SMS, this could cost up to $
            {((toNumbers.length * maxPerHour * 24 * 0.01).toFixed(2))} per day if fully utilized.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Indicator */}
      {enabled && accountSid && authToken && fromNumber && toNumbers.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            SMS notifications enabled for {severityLevels.join(', ')} alerts to {toNumbers.length}{' '}
            recipient{toNumbers.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Save & Test Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={
            isTesting || !accountSid || !authToken || !fromNumber || toNumbers.length === 0
          }
          className="gap-2"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <TestTube2 className="h-4 w-4" />
              Send Test SMS
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
              Save SMS Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
