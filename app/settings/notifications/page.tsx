'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import {
  Bell,
  Mail,
  MessageSquare,
  TrendingUp,
  Calendar,
  Shield,
  Loader2,
  Save
} from 'lucide-react'

interface NotificationSettings {
  email_notifications: boolean
  weekly_digest: boolean
  business_updates: boolean
  search_alerts: boolean
  security_alerts: boolean
  product_updates: boolean
  marketing_emails: boolean
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    weekly_digest: true,
    business_updates: true,
    search_alerts: true,
    security_alerts: true,
    product_updates: false,
    marketing_emails: false,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to manage notification settings')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (profile?.preferences) {
        setSettings(prev => ({
          ...prev,
          ...profile.preferences
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to save settings')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          preferences: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Notification settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container max-w-4xl mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (


    <ProtectedLayout>
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage how and when you receive notifications from OppSpot
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Control which email notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications" className="text-base">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all email notifications
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.email_notifications}
                onCheckedChange={() => handleToggle('email_notifications')}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-digest" className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Weekly Digest
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of business updates and trends
                  </p>
                </div>
                <Switch
                  id="weekly-digest"
                  checked={settings.weekly_digest}
                  onCheckedChange={() => handleToggle('weekly_digest')}
                  disabled={!settings.email_notifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="business-updates" className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Business Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new businesses and updates in your saved searches
                  </p>
                </div>
                <Switch
                  id="business-updates"
                  checked={settings.business_updates}
                  onCheckedChange={() => handleToggle('business_updates')}
                  disabled={!settings.email_notifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="search-alerts" className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Search Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts when new businesses match your saved searches
                  </p>
                </div>
                <Switch
                  id="search-alerts"
                  checked={settings.search_alerts}
                  onCheckedChange={() => handleToggle('search_alerts')}
                  disabled={!settings.email_notifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="security-alerts" className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Important notifications about your account security
                  </p>
                </div>
                <Switch
                  id="security-alerts"
                  checked={settings.security_alerts}
                  onCheckedChange={() => handleToggle('security_alerts')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Product & Marketing
            </CardTitle>
            <CardDescription>
              Updates about OppSpot features and offerings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="product-updates" className="text-base">
                  Product Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Learn about new features and improvements
                </p>
              </div>
              <Switch
                id="product-updates"
                checked={settings.product_updates}
                onCheckedChange={() => handleToggle('product_updates')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-emails" className="text-base">
                  Marketing Emails
                </Label>
                <p className="text-sm text-muted-foreground">
                  Special offers, tips, and promotional content
                </p>
              </div>
              <Switch
                id="marketing-emails"
                checked={settings.marketing_emails}
                onCheckedChange={() => handleToggle('marketing_emails')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={saveSettings} 
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  </ProtectedLayout>

  )
}