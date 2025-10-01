import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DigestData {
  overnight_discoveries: Array<{
    type: string
    title: string
    description: string
    action_url: string
    priority: string
  }>
  urgent_alerts: Array<{
    type: string
    title: string
    company_ids?: string[]
    days_since_contact?: number
  }>
  completed_work: Array<{
    type: string
    title: string
    report_ids?: string[]
  }>
  recommendations: Array<{
    type: string
    title: string
    reason: string
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user ID from request
    const { user_id, force_refresh } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if digest already exists for today
    if (!force_refresh) {
      const { data: existing } = await supabase
        .from('ai_digest')
        .select('id')
        .eq('user_id', user_id)
        .eq('digest_date', today)
        .single()

      if (existing) {
        return new Response(
          JSON.stringify({ message: 'Digest already exists for today', digest_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const startTime = Date.now()

    // Fetch overnight discoveries (recent saves)
    const { data: recentSaves } = await supabase
      .from('saved_businesses')
      .select('business_id, created_at, businesses(*)')
      .eq('user_id', user_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch stale leads (urgent alerts)
    const { data: staleLeads } = await supabase
      .from('saved_businesses')
      .select('business_id, updated_at, businesses(company_name)')
      .eq('user_id', user_id)
      .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: true })
      .limit(5)

    // Fetch completed research reports
    const { data: completedReports } = await supabase
      .from('research_reports')
      .select('id, company_name, status, generated_at')
      .eq('user_id', user_id)
      .eq('status', 'complete')
      .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('generated_at', { ascending: false })
      .limit(5)

    // Fetch user's recent searches for recommendations
    const { data: recentSearches } = await supabase
      .from('search_history')
      .select('query, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Build digest data
    const digestData: DigestData = {
      overnight_discoveries: (recentSaves || []).map((save: any) => ({
        type: 'new_save',
        title: `New opportunity: ${save.businesses?.company_name || 'Company'}`,
        description: `Added to your saved businesses ${new Date(save.created_at).toLocaleTimeString()}`,
        action_url: `/business/${save.business_id}`,
        priority: 'medium',
      })),
      urgent_alerts: (staleLeads || []).slice(0, 3).map((lead: any) => {
        const daysSince = Math.floor(
          (Date.now() - new Date(lead.updated_at).getTime()) / (24 * 60 * 60 * 1000)
        )
        return {
          type: 'follow_up',
          title: `${lead.businesses?.company_name || 'Lead'} needs follow-up`,
          company_ids: [lead.business_id],
          days_since_contact: daysSince,
        }
      }),
      completed_work: (completedReports || []).map((report: any) => ({
        type: 'research_report',
        title: `Research completed: ${report.company_name}`,
        report_ids: [report.id],
      })),
      recommendations: generateRecommendations(recentSearches || []),
    }

    // Calculate priority score
    const priorityScore = calculatePriorityScore(digestData)

    // Insert digest
    const { data: digest, error: insertError } = await supabase
      .from('ai_digest')
      .upsert(
        {
          user_id,
          digest_date: today,
          digest_data: digestData,
          priority_score: priorityScore,
          generation_duration_ms: Date.now() - startTime,
          ai_model: 'digest-v1',
        },
        {
          onConflict: 'user_id,digest_date',
        }
      )
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ success: true, digest }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating digest:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateRecommendations(recentSearches: any[]): Array<{
  type: string
  title: string
  reason: string
}> {
  const recommendations = []

  if (recentSearches.length > 0) {
    recommendations.push({
      type: 'suggestion',
      title: 'Try ResearchGPT™ on your search results',
      reason: 'Generate deep insights on companies matching your criteria',
    })
  }

  recommendations.push({
    type: 'feature',
    title: 'Set up priority alerts',
    reason: 'Get notified when high-priority opportunities match your criteria',
  })

  return recommendations
}

function calculatePriorityScore(digestData: DigestData): number {
  let score = 5 // Base score

  // Increase for urgent alerts
  if (digestData.urgent_alerts.length > 0) {
    score += Math.min(digestData.urgent_alerts.length * 2, 3)
  }

  // Increase for overnight discoveries
  if (digestData.overnight_discoveries.length > 0) {
    score += Math.min(digestData.overnight_discoveries.length / 2, 2)
  }

  return Math.min(Math.round(score), 10)
}
