import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkflowOrchestrator } from '@/lib/agents/workflow-orchestrator'
import { getErrorMessage } from '@/lib/utils/error-handler'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await context.params
    const supabase = await createClient()

    // Verify user has access to stream
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: membership, error: _membershipError } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get workflow status
    const orchestrator = getWorkflowOrchestrator()
    const status = await orchestrator.getWorkflowStatus(streamId)

    return NextResponse.json(status)
  } catch (error: unknown) {
    console.error('[Workflow Status] Error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
