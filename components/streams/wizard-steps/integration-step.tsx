'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { StreamWizardData } from '@/types/stream-wizard'
import { Bell, Mail, Zap, Sparkles } from 'lucide-react'

interface IntegrationStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function IntegrationStep({ data, onUpdate }: IntegrationStepProps) {
  const handleNotificationChannelToggle = (channel: 'email' | 'in_app' | 'slack') => {
    const channels = data.notificationChannels.includes(channel)
      ? data.notificationChannels.filter(c => c !== channel)
      : [...data.notificationChannels, channel]
    onUpdate({ notificationChannels: channels })
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1">Integration & Setup</h3>
        <p className="text-sm text-muted-foreground">
          Configure integrations and preferences for your stream
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Features
          </CardTitle>
          <CardDescription>Enhance your workflow with AI-powered capabilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-processing">AI Processing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically analyze companies and generate insights
              </p>
            </div>
            <Switch
              id="ai-processing"
              checked={data.aiProcessing}
              onCheckedChange={(checked) => onUpdate({ aiProcessing: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-import">Auto-import Companies</Label>
              <p className="text-sm text-muted-foreground">
                Automatically add discovered companies to this stream
              </p>
            </div>
            <Switch
              id="auto-import"
              checked={data.autoImportCompanies}
              onCheckedChange={(checked) => onUpdate({ autoImportCompanies: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>Stay updated on stream activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about stream changes and activity
              </p>
            </div>
            <Switch
              id="notifications"
              checked={data.enableNotifications}
              onCheckedChange={(checked) => onUpdate({ enableNotifications: checked })}
            />
          </div>

          {data.enableNotifications && (
            <div className="pl-4 border-l-2 space-y-3">
              <Label>Notification Channels</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-notif"
                    checked={data.notificationChannels.includes('email')}
                    onCheckedChange={() => handleNotificationChannelToggle('email')}
                  />
                  <Label htmlFor="email-notif" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="app-notif"
                    checked={data.notificationChannels.includes('in_app')}
                    onCheckedChange={() => handleNotificationChannelToggle('in_app')}
                  />
                  <Label htmlFor="app-notif" className="flex items-center gap-2 cursor-pointer">
                    <Bell className="h-4 w-4" />
                    In-App
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="slack-notif"
                    checked={data.notificationChannels.includes('slack')}
                    onCheckedChange={() => handleNotificationChannelToggle('slack')}
                  />
                  <Label htmlFor="slack-notif" className="flex items-center gap-2 cursor-pointer">
                    <Zap className="h-4 w-4" />
                    Slack
                  </Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
