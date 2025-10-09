import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * PATCH /api/streams/[id]/agents/[agentId]
 * Update an agent assignment
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const { id: streamId, agentId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has editor/owner access
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single() as { data: Pick<Row<'stream_members'>, 'role'> | null; error: any }

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update the assignment
    const { data: assignment, error: updateError } = await supabase
      .from('stream_agent_assignments')
      // @ts-ignore - Type inference issue
      .update(body)
      .eq('stream_id', streamId)
      .eq('agent_id', agentId)
      .select(`
        *,
        agent:ai_agents (
          id,
          name,
          agent_type,
          is_active,
          configuration
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating agent assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      )
    }

    return NextResponse.json(assignment)

  } catch (error) {
    console.error('Unexpected error updating agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/streams/[id]/agents/[agentId]
 * Remove an agent from a stream
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const { id: streamId, agentId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has editor/owner access
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single() as { data: Pick<Row<'stream_members'>, 'role'> | null; error: any }

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete the assignment
    const { error: deleteError } = await supabase
      .from('stream_agent_assignments')
      .delete()
      .eq('stream_id', streamId)
      .eq('agent_id', agentId)

    if (deleteError) {
      console.error('Error deleting agent assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete agent' },
        { status: 500 }
      )
    }

    // Create activity
    await supabase
      .from('stream_activities')
      // @ts-ignore - Supabase type inference issue
      .insert({
        stream_id: streamId,
        user_id: user.id,
        activity_type: 'ai_update',
        description: `Removed agent from stream`,
        is_system: false,
        importance: 'normal'
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unexpected error deleting agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
