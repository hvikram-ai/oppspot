import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper'
import SkeletonLoader from '@/components/ui/skeleton-loader'

// Configure ISR (Incremental Static Regeneration) with 60 second revalidation
// This creates a static shell with client-side data fetching for personalization
export const revalidate = 60 // Revalidate every 60 seconds
export const dynamic = 'force-dynamic' // Keep dynamic for auth checks

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const isDemo = params.demo === 'true'

  // Only check authentication if not in demo mode
  if (!isDemo) {
    const supabase = await createClient()

    // Try to get session first, then user
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[Dashboard] Session check:', session ? 'Found' : 'Not found')

    if (!session) {
      // Double-check with getUser
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('[Dashboard] User check:', user ? 'Found' : 'Not found')
      console.log('[Dashboard] Auth error:', error?.message)

      if (!user) {
        console.log('[Dashboard] No user found, redirecting to login')
        redirect('/login')
      }
    }
  }

  return (
    <Suspense fallback={<SkeletonLoader variant="dashboard" />}>
      <DashboardWrapper />
    </Suspense>
  )
}