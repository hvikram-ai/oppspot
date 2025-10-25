/**
 * Alert Settings Page
 *
 * Visual configuration UI for alert notification channels.
 * Allows admins to configure email, Slack, webhooks, and SMS without SQL.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailConfigForm } from '@/components/admin/alerts/settings/email-config'
import { SlackConfigForm } from '@/components/admin/alerts/settings/slack-config'
import { WebhookConfigForm } from '@/components/admin/alerts/settings/webhook-config'
import { SmsConfigForm } from '@/components/admin/alerts/settings/sms-config'
import { Loader2, Settings, Mail, MessageSquare, Webhook, MessageCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AlertSettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<any>(null)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/alerts/settings')

      if (!response.ok) {
        throw new Error('Failed to load settings')
      }

      const data = await response.json()
      setSettings(data.settings)
    } catch (error) {
      console.error('[Settings] Failed to load:', error)
      toast({
        title: 'Error',
        description: 'Failed to load alert settings',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSettingsSaved = () => {
    toast({
      title: 'Settings Saved',
      description: 'Alert notification settings have been updated successfully',
    })
    loadSettings()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Alert Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure notification channels for system alerts
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="slack" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Slack
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            SMS
          </TabsTrigger>
        </TabsList>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email delivery for alert notifications. Emails are sent via Resend.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailConfigForm
                initialConfig={settings?.email_settings}
                onSaved={handleSettingsSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slack Settings */}
        <TabsContent value="slack">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Slack Notifications
              </CardTitle>
              <CardDescription>
                Send alerts to Slack channels using incoming webhooks. Rich formatting with color
                coding by severity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SlackConfigForm
                initialConfig={settings?.slack_settings}
                onSaved={handleSettingsSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Settings */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Custom Webhooks
              </CardTitle>
              <CardDescription>
                Send alerts to any HTTP endpoint. Includes retry logic and HMAC signatures for
                security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookConfigForm
                initialConfig={settings?.webhook_settings}
                onSaved={handleSettingsSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                SMS Notifications (Twilio)
              </CardTitle>
              <CardDescription>
                Send critical alerts via SMS. Requires a Twilio account. Costs apply per message
                sent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmsConfigForm
                initialConfig={settings?.sms_settings}
                onSaved={handleSettingsSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
