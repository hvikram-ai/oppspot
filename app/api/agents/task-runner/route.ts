import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTaskRunner, startTaskRunner, stopTaskRunner } from '@/lib/agents/agent-task-runner'
import { getErrorMessage } from '@/lib/utils/error-handler'

/**
 * GET /api/agents/task-runner
 * Get task runner status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org (admin check could be added here)
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single() as { data: { org_id: string; role: string } | null; error: unknown }

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get task statistics
    const { data: tasks, error: tasksError } = await supabase
      .from('agent_tasks')
      .select('status')
      .eq('org_id', profile.org_id) as { data: { status: string }[] | null; error: unknown }

    const stats = {
      pending: tasks?.filter(t => t.status === 'pending').length || 0,
      processing: tasks?.filter(t => t.status === 'processing').length || 0,
      completed: tasks?.filter(t => t.status === 'completed').length || 0,
      failed: tasks?.filter(t => t.status === 'failed').length || 0,
      total: tasks?.length || 0
    }

    // Get recent tasks
    const { data: recentTasks, error: recentTasksError } = await supabase
      .from('agent_tasks')
      .select(`
        *,
        agent:agent_id(name, agent_type)
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      runner: {
        status: 'running', // In production, track actual runner status
        polling_interval: 5000,
        max_concurrent_tasks: 3
      },
      stats,
      recent_tasks: recentTasks || []
    })

  } catch (error: unknown) {
    console.error('[Task Runner API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get task runner status', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agents/task-runner
 * Control task runner (start/stop)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user is admin (you may want to add admin role check)
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single() as { data: { org_id: string; role: string } | null; error: unknown }

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'start') {
      await startTaskRunner()
      return NextResponse.json({
        success: true,
        message: 'Task runner started'
      })
    } else if (action === 'stop') {
      stopTaskRunner()
      return NextResponse.json({
        success: true,
        message: 'Task runner stopped'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      )
    }

  } catch (error: unknown) {
    console.error('[Task Runner API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to control task runner', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
