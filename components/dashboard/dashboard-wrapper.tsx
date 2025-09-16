'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { User } from '@supabase/supabase-js'

interface Profile {
  onboarding_completed?: boolean
  org_id?: string | null
  email?: string
}
import { Navbar } from '@/components/layout/navbar'
import { EmailVerificationBanner } from '@/components/ui/email-verification-banner'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { SavedSearches } from '@/components/dashboard/saved-searches'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { BusinessInsights } from '@/components/dashboard/business-insights'
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks'

export function DashboardWrapper() {
  const { isDemoMode, demoData } = useDemoMode()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
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

      // Get user profile with error handling
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed, org_id, email')
        .eq('id', user.id)
        .single()

      // Handle RLS policy errors gracefully
      if (profileError) {
        console.error('Profile fetch error:', profileError)
        
        // Special handling for demo account
        if (user.email === 'demo@oppspot.com') {
          console.log('Demo account detected, bypassing onboarding check')
          setProfile({ 
            onboarding_completed: true, 
            org_id: 'demo-org',
            email: 'demo@oppspot.com'
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
          .single()
        
        isPremium = org?.subscription_tier === 'premium' || org?.subscription_tier === 'enterprise'
      }

      // Special bypass for demo account
      const isDemoAccount = user.email === 'demo@oppspot.com' || profile?.email === 'demo@oppspot.com'
      
      // Redirect to onboarding if not completed (unless premium user or demo)
      if (!profile?.onboarding_completed && !isPremium && !isDemoAccount) {
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