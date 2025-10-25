// Agent Workflow Execution Details API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agent-workflows/executions/[executionId]
 * Get execution details and logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get execution details
    const { data: execution, error: executionError } = await supabase
      .from('agent_workflow_executions')
      .select(`
        *,
        workflow:agent_workflows(id, name, description),
        triggered_by:profiles!agent_workflow_executions_triggered_by_fkey(id, full_name, email)
      `)
      .eq('id', executionId)
      .single()

    if (executionError || !execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    // Get execution logs
    const { data: logs, error: logsError } = await supabase
      .from('agent_workflow_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true })

    if (logsError) {
      console.error('Error fetching logs:', logsError)
    }

    return NextResponse.json({
      execution,
      logs: logs || [],
    })
  } catch (error) {
    console.error('Error in GET /api/agent-workflows/executions/[executionId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
