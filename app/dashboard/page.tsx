import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper'

// Force dynamic rendering for personalized dashboard
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Check if we're in demo mode via URL params first
  const isDemo = false // Will be handled by client component
  
  if (!isDemo) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }
  }

  return <DashboardWrapper />
}