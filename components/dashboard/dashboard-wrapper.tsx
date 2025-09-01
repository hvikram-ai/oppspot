'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { Navbar } from '@/components/layout/navbar'
import { EmailVerificationBanner } from '@/components/ui/email-verification-banner'
import { DemoBanner } from '@/components/demo/demo-banner'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { SavedSearches } from '@/components/dashboard/saved-searches'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { BusinessInsights } from '@/components/dashboard/business-insights'
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks'

export function DashboardWrapper() {
  const { isDemoMode, demoData } = useDemoMode()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

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

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, org_id')
        .eq('id', user.id)
        .single() as any

      // Check organization subscription tier
      let isPremium = false
      if (profile?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_tier')
          .eq('id', profile.org_id)
          .single() as any
        
        isPremium = org?.subscription_tier === 'premium' || org?.subscription_tier === 'enterprise'
      }

      // Redirect to onboarding if not completed (unless premium user)
      if (!profile?.onboarding_completed && !isPremium) {
        router.push('/onboarding')
        return
      }

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
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navbar />
      <EmailVerificationBanner />
      <DashboardHeader user={user} profile={profile} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsOverview />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <RecentActivity userId={user.id} />
          </div>
          
          {/* Saved Searches - Takes 1 column */}
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
    </div>
  )
}