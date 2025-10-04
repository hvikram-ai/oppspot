import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkflowOrchestrator } from '@/lib/agents/workflow-orchestrator'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await context.params
    const supabase = await createClient()

    // Verify user has access to stream
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Validate workflow
    const orchestrator = getWorkflowOrchestrator()
    const validation = await orchestrator.validateWorkflow(streamId)

    return NextResponse.json(validation)
  } catch (error: unknown) {
    console.error('[Workflow Validate] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
