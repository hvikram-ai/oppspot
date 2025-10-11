/**
 * AI Agents API
 * Manage autonomous AI agents
 *
 * GET  /api/agents - List all agents
 * POST /api/agents - Create new agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Row, Insert, Update } from '@/lib/supabase/helpers'

const createAgentSchema = z.object({
  agent_type: z.enum([
    'opportunity_bot',
    'research_gpt',
    'scout_agent',
    'scoring_agent',
    'writer_agent',
    'relationship_agent',
    'linkedin_scraper_agent',
    'website_analyzer_agent'
  ]),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  configuration: z.record(z.any()),
  is_active: z.boolean().default(true),
  schedule_cron: z.string().optional()
})

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get agents for this organization
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      count: agents?.length || 0,
      agents: agents || []
    })
  } catch (error: unknown) {
    console.error('[Agents API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch agents', message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse and validate request
    const body = await request.json()
    const validated = createAgentSchema.parse(body)

    // Create agent
    const { data: agent, error } = await supabase
      .from('ai_agents')
      // @ts-expect-error - Supabase type inference issue with insert
      .insert([{
        org_id: profile.org_id,
        agent_type: validated.agent_type,
        name: validated.name,
        description: validated.description,
        configuration: validated.configuration,
        is_active: validated.is_active,
        schedule_cron: validated.schedule_cron,
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      agent
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[Agents API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create agent', message },
      { status: 500 }
    )
  }
}
