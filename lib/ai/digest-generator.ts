import { createClient } from '@/lib/supabase/server'

interface UserActivity {
  recentSaves: any[]
  staleLeads: any[]
  completedReports: any[]
  recentSearches: any[]
  pipelineValue: number
  activeLeadCount: number
}

interface DigestSection {
  overnight_discoveries?: Array<{
    type: string
    title: string
    description: string
    action_url: string
    priority: string
  }>
  urgent_alerts?: Array<{
    type: string
    title: string
    company_ids?: string[]
    days_since_contact?: number
  }>
  completed_work?: Array<{
    type: string
    title: string
    report_ids?: string[]
  }>
  recommendations?: Array<{
    type: string
    title: string
    reason: string
  }>
}

/**
 * Generate AI-powered daily digest for a user
 */
export async function generateDigest(userId: string): Promise<DigestSection> {
  const supabase = await createClient()

  // Gather user activity data
  const activity = await gatherUserActivity(supabase, userId)

  // Build digest sections
  const digest: DigestSection = {
    overnight_discoveries: buildOvernightDiscoveries(activity),
    urgent_alerts: buildUrgentAlerts(activity),
    completed_work: buildCompletedWork(activity),
    recommendations: await buildRecommendations(activity),
  }

  return digest
}

/**
 * Gather all relevant user activity from the last 24 hours
 */
async function gatherUserActivity(supabase: any, userId: string): Promise<UserActivity> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch recent saves
  const { data: recentSaves } = await supabase
    .from('saved_businesses')
    .select(`
      business_id,
      created_at,
      businesses (
        company_name,
        industry,
        location,
        employee_count
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch stale leads (not contacted in 7+ days)
  const { data: staleLeads } = await supabase
    .from('saved_businesses')
    .select(`
      business_id,
      updated_at,
      businesses (
        company_name,
        industry
      )
    `)
    .eq('user_id', userId)
    .lt('updated_at', oneWeekAgo)
    .order('updated_at', { ascending: true })
    .limit(5)

  // Fetch completed research reports
  const { data: completedReports } = await supabase
    .from('research_reports')
    .select('id, company_name, status, generated_at')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .gte('generated_at', oneDayAgo)
    .order('generated_at', { ascending: false })
    .limit(5)

  // Fetch recent searches
  const { data: recentSearches } = await supabase
    .from('search_history')
    .select('query, created_at, filters')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate pipeline value (simplified)
  const { data: savedBusinesses } = await supabase
    .from('saved_businesses')
    .select('business_id')
    .eq('user_id', userId)

  return {
    recentSaves: recentSaves || [],
    staleLeads: staleLeads || [],
    completedReports: completedReports || [],
    recentSearches: recentSearches || [],
    pipelineValue: (savedBusinesses?.length || 0) * 50000, // Estimated £50k per lead
    activeLeadCount: savedBusinesses?.length || 0,
  }
}

/**
 * Build overnight discoveries section
 */
function buildOvernightDiscoveries(activity: UserActivity): DigestSection['overnight_discoveries'] {
  const discoveries = []

  // New business saves
  for (const save of activity.recentSaves.slice(0, 5)) {
    discoveries.push({
      type: 'new_save',
      title: `New opportunity: ${save.businesses?.company_name || 'Company'}`,
      description: `${save.businesses?.industry || 'Business'} in ${save.businesses?.location || 'UK'}`,
      action_url: `/business/${save.business_id}`,
      priority: 'medium',
    })
  }

  // Pattern detection (if user saved multiple companies in same industry)
  const industries = activity.recentSaves
    .map((s) => s.businesses?.industry)
    .filter(Boolean)
  const industryCount = industries.reduce((acc: any, ind) => {
    acc[ind] = (acc[ind] || 0) + 1
    return acc
  }, {})

  const topIndustry = Object.entries(industryCount)
    .sort(([, a]: any, [, b]: any) => b - a)[0]

  if (topIndustry && topIndustry[1] > 2) {
    discoveries.push({
      type: 'pattern',
      title: `Trending interest: ${topIndustry[0]}`,
      description: `You've saved ${topIndustry[1]} companies in this sector`,
      action_url: `/search?industry=${encodeURIComponent(topIndustry[0] as string)}`,
      priority: 'high',
    })
  }

  return discoveries
}

/**
 * Build urgent alerts section
 */
function buildUrgentAlerts(activity: UserActivity): DigestSection['urgent_alerts'] {
  return activity.staleLeads.slice(0, 3).map((lead) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(lead.updated_at).getTime()) / (24 * 60 * 60 * 1000)
    )

    return {
      type: 'follow_up',
      title: `${lead.businesses?.company_name || 'Lead'} needs follow-up`,
      company_ids: [lead.business_id],
      days_since_contact: daysSince,
    }
  })
}

/**
 * Build completed work section
 */
function buildCompletedWork(activity: UserActivity): DigestSection['completed_work'] {
  return activity.completedReports.map((report) => ({
    type: 'research_report',
    title: `Research completed: ${report.company_name}`,
    report_ids: [report.id],
  }))
}

/**
 * Build AI-powered recommendations
 */
async function buildRecommendations(activity: UserActivity): Promise<DigestSection['recommendations']> {
  const recommendations = []

  // Recommend ResearchGPT if user has saves but no research
  if (activity.recentSaves.length > 0 && activity.completedReports.length === 0) {
    recommendations.push({
      type: 'feature',
      title: 'Try ResearchGPT™ on your saved companies',
      reason: 'Generate deep insights on companies you\'re tracking',
    })
  }

  // Recommend search refinement if many recent searches
  if (activity.recentSearches.length > 5) {
    recommendations.push({
      type: 'tip',
      title: 'Refine your search criteria',
      reason: 'You\'ve run multiple searches - try using advanced filters for better results',
    })
  }

  // Pipeline value milestone
  if (activity.pipelineValue > 500000) {
    recommendations.push({
      type: 'milestone',
      title: `Pipeline value: £${(activity.pipelineValue / 1000).toFixed(0)}k`,
      reason: 'You\'re on track to hit your targets - keep building relationships',
    })
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'suggestion',
      title: 'Set up priority alerts',
      reason: 'Get notified when high-priority opportunities match your criteria',
    })
  }

  return recommendations
}

/**
 * Calculate priority score for digest (1-10)
 */
export function calculateDigestPriority(digest: DigestSection): number {
  let score = 5 // Base score

  // Urgent alerts increase priority significantly
  if (digest.urgent_alerts && digest.urgent_alerts.length > 0) {
    score += Math.min(digest.urgent_alerts.length * 2, 3)
  }

  // New discoveries increase priority
  if (digest.overnight_discoveries && digest.overnight_discoveries.length > 0) {
    score += Math.min(digest.overnight_discoveries.length / 3, 2)
  }

  // Completed work increases priority
  if (digest.completed_work && digest.completed_work.length > 0) {
    score += 1
  }

  return Math.min(Math.round(score), 10)
}
