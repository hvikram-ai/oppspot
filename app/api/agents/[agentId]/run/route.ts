/**
 * Run Agent API
 * Execute an agent on-demand
 *
 * POST /api/agents/[agentId]/run
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createScoutAgent } from '@/lib/ai/agents/scout-agent'
import { createOpportunityBot } from '@/lib/ai/agents/opportunity-bot'
import { createLinkedInScraperAgent } from '@/lib/ai/agents/linkedin-scraper-agent'
import { createWebsiteAnalyzerAgent } from '@/lib/ai/agents/website-analyzer-agent'
import { triggerAgent } from '@/lib/inngest/trigger-agent'
import type { Row } from '@/lib/supabase/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await params

    // Fetch agent
    const { data: agentData, error: fetchError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (fetchError || !agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agent = agentData as Row<'ai_agents'>

    // Check user has access to this agent
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as Row<'profiles'> | null

    if (profile?.org_id !== agent.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse input
    const body = await request.json().catch(() => ({}))
    const input = body.input || {}
    const runAsync = body.async !== false // Default to async

    console.log(`[Agent API] Running agent ${agentId} (${agent.agent_type}) - async: ${runAsync}`)

    // Option 1: Run in background with Inngest (recommended for long-running tasks)
    if (runAsync) {
      try {
        await triggerAgent(agentId, agent.org_id, input)

        return NextResponse.json({
          success: true,
          message: 'Agent execution queued',
          agentId,
          agentType: agent.agent_type,
          async: true
        }, { status: 202 }) // 202 Accepted
      } catch (inngestError) {
        console.warn('[Agent API] Inngest not available, falling back to sync execution:', inngestError)
        // Fall through to sync execution if Inngest fails
      }
    }

    // Option 2: Run synchronously (for immediate results)
    let result

    if (agent.agent_type === 'scout_agent') {
      const scoutAgent = await createScoutAgent(agentId)
      result = await scoutAgent.run(input)
    } else if (agent.agent_type === 'opportunity_bot') {
      const opportunityBot = await createOpportunityBot(agentId)
      result = await opportunityBot.run(input)
    } else if (agent.agent_type === 'linkedin_scraper_agent') {
      const linkedInAgent = await createLinkedInScraperAgent(agentId)
      result = await linkedInAgent.run(input)
    } else if (agent.agent_type === 'website_analyzer_agent') {
      const websiteAgent = await createWebsiteAnalyzerAgent(agentId)
      result = await websiteAgent.run(input)
    } else if (agent.agent_type === 'research_gpt') {
      // ResearchGPT is on-demand per company
      result = {
        success: true,
        output: { message: 'ResearchGPT is an on-demand agent. Use it from the research page.' },
        metrics: { durationMs: 0, itemsProcessed: 0, apiCalls: 0, tokensUsed: 0, cost: 0 }
      }
    } else if (agent.agent_type === 'scoring_agent') {
      // Scoring agent would re-score companies
      result = {
        success: true,
        output: { message: 'Scoring agent execution coming soon!' },
        metrics: { durationMs: 0, itemsProcessed: 0, apiCalls: 0, tokensUsed: 0, cost: 0 }
      }
    } else {
      return NextResponse.json(
        { error: `Agent type "${agent.agent_type}" not yet implemented` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      metrics: result.metrics,
      error: result.error,
      async: false
    })
  } catch (error: unknown) {
    console.error('[Agent Run API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to run agent', message },
      { status: 500 }
    )
  }
}
