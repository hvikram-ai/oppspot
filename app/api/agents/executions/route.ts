/**
 * Agent Executions API
 * View agent execution history and status
 *
 * GET /api/agents/executions - List all executions
 * GET /api/agents/executions?agent_id=[id] - List executions for specific agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'org_id'> | null; error: any }

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('agent_executions')
      .select('*, ai_agents!inner(name, agent_type)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by agent if specified
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: executions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch executions: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      count: executions?.length || 0,
      executions: executions || []
    })
  } catch (error: unknown) {
    console.error('[Agent Executions API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch executions', message },
      { status: 500 }
    )
  }
}
