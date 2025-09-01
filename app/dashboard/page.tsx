import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { EmailVerificationBanner } from '@/components/ui/email-verification-banner'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { SavedSearches } from '@/components/dashboard/saved-searches'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { BusinessInsights } from '@/components/dashboard/business-insights'
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user needs onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, org_id')
    .eq('id', user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .single() as any

  // Check organization subscription tier
  let isPremium = false
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', profile.org_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as any
    
    isPremium = org?.subscription_tier === 'premium' || org?.subscription_tier === 'enterprise'
  }

  // Redirect to onboarding if not completed (unless premium user)
  if (!profile?.onboarding_completed && !isPremium) {
    redirect('/onboarding')
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