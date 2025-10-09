import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeStreamWorkflow } from '@/lib/agents/workflow-orchestrator'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

export async function POST(
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

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { initialContext } = body

    // Execute workflow (async - will run in background)
    console.log(`[Workflow Execute] Starting workflow for stream ${streamId}`)

    // Queue workflow execution
    executeStreamWorkflow(streamId, initialContext)
      .then((execution) => {
        console.log(`[Workflow Execute] Workflow completed:`, execution.status)
      })
      .catch((error) => {
        console.error(`[Workflow Execute] Workflow failed:`, error)
      })

    return NextResponse.json({
      success: true,
      message: 'Workflow execution started',
      streamId
    })
  } catch (error: unknown) {
    console.error('[Workflow Execute] Error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
