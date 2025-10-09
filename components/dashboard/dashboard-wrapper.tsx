'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { User } from '@supabase/supabase-js'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import type { Row } from '@/lib/supabase/helpers'

interface Profile {
  onboarding_completed?: boolean
  org_id?: string | null
  email?: string
  subscription_tier?: string
  preferences?: unknown
}
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { SavedSearches } from '@/components/dashboard/saved-searches'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { BusinessInsights } from '@/components/dashboard/business-insights'
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks'
import { AIDigestCard } from '@/components/dashboard-v2/ai-digest-card'
import { PriorityQueue } from '@/components/dashboard-v2/priority-queue'
import { ImpactMetrics } from '@/components/dashboard-v2/impact-metrics'
import { FeatureSpotlight } from '@/components/dashboard-v2/feature-spotlight'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Sparkles, X } from 'lucide-react'
import Link from 'next/link'

export function DashboardWrapper() {
  const { isDemoMode, demoData } = useDemoMode()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  useEffect(() => {
    const getUser = async () => {
      if (isDemoMode) {
        // Use demo user data
        setUser(demoData.user)
        setProfile({ 
          onboarding_completed: true, 
          org_id: null 
        })
        setLoading(false)
        return
      }

      // Get real user for non-demo mode
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get user profile with error handling
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed, org_id, preferences')
        .eq('id', user.id)
        .single() as { data: Row<'profiles'> | null; error: any }

      // Handle RLS policy errors gracefully
      if (profileError) {
        console.error('Profile fetch error:', profileError)
        
        // Special handling for demo account
        if (user.email === 'demo@oppspot.com') {
          console.log('Demo account detected, bypassing onboarding check')
          setProfile({
            onboarding_completed: true,
            org_id: 'demo-org'
          })
          setLoading(false)
          return
        }
        
        // For RLS recursion errors, assume onboarding is complete
        if (profileError.message?.includes('infinite recursion') || 
            profileError.message?.includes('policy')) {
          console.warn('RLS policy issue detected, assuming onboarding complete')
          setProfile({ onboarding_completed: true, org_id: null })
          setLoading(false)
          return
        }
        
        // For other errors, redirect to login
        router.push('/login')
        return
      }

      // Check organization subscription tier
      let isPremium = false
      if (profile?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_tier')
          .eq('id', profile.org_id)
          .single() as { data: Row<'organizations'> | null; error: any }

        isPremium = org?.subscription_tier === 'premium' || org?.subscription_tier === 'enterprise'
      }

      // Special bypass for demo account
      const isDemoAccount = user.email === 'demo@oppspot.com'
      
      // Don't auto-redirect to onboarding anymore - it's optional
      // Show prompt instead if onboarding not completed
      const preferences = profile?.preferences as Record<string, unknown> | undefined
      const hasCompletedOnboarding = preferences?.onboarding_completed === true || profile?.onboarding_completed === true
      setShowOnboardingPrompt(!hasCompletedOnboarding && !isPremium && !isDemoAccount)

      setProfile(profile)
      setLoading(false)
    }

    getUser()
  }, [isDemoMode, demoData.user, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <ProtectedLayout>
      <DashboardHeader user={user} profile={profile} />

      <div className="container mx-auto px-4 py-8" data-testid="dashboard-wrapper">
        {/* Onboarding Prompt */}
        {showOnboardingPrompt && (
          <Alert className="mb-6 relative">
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Personalize your experience!</strong>
                <p className="text-sm mt-1">
                  Take a moment to tell us about your business goals and we'll tailor oppSpot just for you.
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link href="/onboarding">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnboardingPrompt(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* NEW: AI Digest (Hero Section) */}
        <div className="mb-6" data-testid="dashboard-hero">
          <AIDigestCard />
        </div>

        {/* NEW: Impact Metrics */}
        <div className="mb-8">
          <ImpactMetrics />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* NEW: Priority Queue - Takes 2 columns */}
          <div className="lg:col-span-2">
            <PriorityQueue />
          </div>

          {/* NEW: Feature Spotlight - Takes 1 column */}
          <div>
            <FeatureSpotlight />
          </div>
        </div>

        {/* Secondary Grid: Original Components */}
        <div className="grid gap-6 lg:grid-cols-3 mt-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity userId={user.id} />
          </div>

          {/* Saved Searches */}
          <div>
            <SavedSearches userId={user.id} />
          </div>
        </div>

        {/* Business Insights and Tasks */}
        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <BusinessInsights userId={user.id} />
          <UpcomingTasks userId={user.id} />
        </div>
      </div>
    </ProtectedLayout>
  )
}