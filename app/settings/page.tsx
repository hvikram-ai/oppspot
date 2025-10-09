'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import type { Row } from '@/lib/supabase/helpers'
import {
  User,
  Brain,
  Shield,
  Palette,
  Bell,
  Lock,
  CreditCard,
  Database,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Settings
} from 'lucide-react'

interface SettingSection {
  title: string
  description: string
  href: string
  icon: React.ElementType
  status?: 'complete' | 'incomplete' | 'attention'
  badge?: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; profile?: Row<'profiles'> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [completionPercentage, setCompletionPercentage] = useState(0)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setUser({ ...user, profile: profile as Row<'profiles'> })
        calculateCompletion(profile as Row<'profiles'>)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateCompletion = (profile: any) => {
    let completed = 0
    const total = 8
    
    if (profile?.full_name) completed++
    if (profile?.avatar_url) completed++
    if (profile?.preferences?.email_notifications !== undefined) completed++
    if (profile?.preferences?.theme) completed++
    // Add more checks as needed
    
    setCompletionPercentage(Math.round((completed / total) * 100))
  }

  const settingSections: SettingSection[] = [
    {
      title: 'Profile',
      description: 'Manage your personal information and preferences',
      href: '/settings/profile',
      icon: User,
      status: user?.profile?.full_name ? 'complete' : 'incomplete'
    },
    {
      title: 'AI Configuration',
      description: 'Configure AI providers, API keys, and local LLMs',
      href: '/settings/ai',
      icon: Brain,
      status: 'attention',
      badge: 'New'
    },
    {
      title: 'Notifications',
      description: 'Control email alerts and notification preferences',
      href: '/settings/notifications',
      icon: Bell,
      status: user?.profile?.preferences?.email_notifications !== undefined ? 'complete' : 'incomplete'
    },
    {
      title: 'Appearance',
      description: 'Customize theme, colors, and display settings',
      href: '/settings/appearance',
      icon: Palette,
      status: 'incomplete'
    },
    {
      title: 'Security',
      description: 'Manage password, authentication, and security settings',
      href: '/settings/security',
      icon: Shield,
      status: 'incomplete'
    },
    {
      title: 'Data & Privacy',
      description: 'Control your data, privacy settings, and permissions',
      href: '/settings/privacy',
      icon: Lock,
      status: 'incomplete'
    },
    {
      title: 'Billing',
      description: 'Manage subscription, payment methods, and invoices',
      href: '/settings/billing',
      icon: CreditCard,
      status: 'complete'
    },
    {
      title: 'Data Export',
      description: 'Export your data and create backups',
      href: '/settings/data',
      icon: Database,
      status: 'incomplete'
    }
  ]

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'attention':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ProtectedLayout>
    )
  }

  return (


    <ProtectedLayout>
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Settings Overview</CardTitle>
              <CardDescription className="mt-2">
                Manage your account settings and preferences
              </CardDescription>
            </div>
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Profile Completion</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            
            {completionPercentage < 100 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">
                  Complete your profile to unlock all features and improve your experience.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Configuration
              <Badge variant="secondary" className="ml-auto">New</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Set up AI providers and configure API keys for enhanced features
            </p>
            <Link href="/settings/ai">
              <Button size="sm" className="w-full">
                Configure AI
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review your security settings and enable two-factor authentication
            </p>
            <Link href="/settings/security">
              <Button size="sm" variant="outline" className="w-full">
                Review Security
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Settings</h2>
        <div className="grid gap-4">
          {settingSections.map((section) => {
            const Icon = section.icon
            
            return (
              <Link key={section.href} href={section.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{section.title}</h3>
                            {section.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {section.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(section.status)}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you have questions about your settings or need assistance, check our documentation or contact support.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              View Documentation
            </Button>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </ProtectedLayout>

  )
}