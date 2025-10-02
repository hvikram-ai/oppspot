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

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = params

    // Fetch agent
    const { data: agent, error: fetchError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (fetchError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check user has access to this agent
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profile?.org_id !== agent.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse input
    const body = await request.json().catch(() => ({}))
    const input = body.input || {}

    console.log(`[Agent API] Running agent ${agentId} (${agent.agent_type})`)

    // Create and run agent based on type
    let result

    if (agent.agent_type === 'scout_agent') {
      const scoutAgent = await createScoutAgent(agentId)
      result = await scoutAgent.run(input)
    } else if (agent.agent_type === 'opportunity_bot') {
      const opportunityBot = await createOpportunityBot(agentId)
      result = await opportunityBot.run(input)
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
      error: result.error
    })
  } catch (error: any) {
    console.error('[Agent Run API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to run agent', message: error.message },
      { status: 500 }
    )
  }
}
