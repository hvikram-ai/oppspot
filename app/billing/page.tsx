'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, CreditCard, Users, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

interface BillingInfo {
  subscription_tier: string
  trial_ends_at: string | null
  is_trial: boolean
  seats_used: number
  seats_limit: number
  monthly_spend: number
  has_payment_method?: boolean
  is_subscribed?: boolean
}

export default function BillingPage() {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBillingInfo()
  }, [])

  const loadBillingInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/billing')

      if (!response.ok) {
        throw new Error('Failed to load billing information')
      }

      const data = await response.json()
      setBillingInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading billing info:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'secondary'
      case 'starter': return 'default'
      case 'professional': return 'default'
      case 'premium': return 'default'
      case 'enterprise': return 'default'
      default: return 'secondary'
    }
  }

  const getTierName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedLayout>
    )
  }

  if (error || !billingInfo) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error Loading Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error || 'Unable to load billing information'}</p>
              <Button onClick={loadBillingInfo}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and billing details</p>
        </div>
        <Badge variant={getTierBadgeColor(billingInfo.subscription_tier)}>
          {getTierName(billingInfo.subscription_tier)}
        </Badge>
      </div>

      {/* Trial Banner */}
      {billingInfo.is_trial && billingInfo.trial_ends_at && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Trial Active</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your trial ends on {new Date(billingInfo.trial_ends_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{getTierName(billingInfo.subscription_tier)}</p>
                <p className="text-sm text-muted-foreground">
                  {billingInfo.is_subscribed ? 'Active subscription' : 'No active subscription'}
                </p>
              </div>
              {billingInfo.has_payment_method ? (
                <Badge variant="outline" className="border-green-500 text-green-700">
                  Payment method added
                </Badge>
              ) : (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                  No payment method
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Seats
            </CardTitle>
            <CardDescription>Current team size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{billingInfo.seats_used}</span>
                  <span className="text-muted-foreground">/ {billingInfo.seats_limit}</span>
                </div>
                <p className="text-sm text-muted-foreground">seats used</p>
              </div>
              <Progress
                value={(billingInfo.seats_used / billingInfo.seats_limit) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Spend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Spend
            </CardTitle>
            <CardDescription>Current billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">£{billingInfo.monthly_spend.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA */}
      {billingInfo.subscription_tier === 'free' && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Upgrade to unlock more features</h3>
                <p className="text-muted-foreground">
                  Get access to advanced analytics, unlimited searches, and premium support
                </p>
              </div>
              <Button className="whitespace-nowrap">
                View Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>Manage your payment methods and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              Update Payment Method
            </Button>
            <Button variant="outline">
              View Invoices
            </Button>
            <Button variant="outline">
              Billing History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </ProtectedLayout>
  )
}
