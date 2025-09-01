import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper'

// Force dynamic rendering for personalized dashboard
export const dynamic = 'force-dynamic'

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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }
  }

  return <DashboardWrapper />
}