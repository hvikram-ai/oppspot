import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InsightGenerator } from '@/lib/agents/insight-generator'

/**
 * POST /api/streams/[id]/insights/generate
 * Manually trigger AI insight generation for a stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access to this stream
    const { data: membership, error: _membershipError } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Generate insights
    console.log(`[InsightGeneration] Generating insights for stream ${streamId}`)
    const insights = await InsightGenerator.generateInsights(streamId)

    // Log activity
    await supabase
      .from('stream_activities')
      .insert({
        stream_id: streamId,
        user_id: user.id,
        activity_type: 'ai_update',
        description: `Generated ${insights.length} AI insights`,
        is_system: false,
        importance: 'normal'
      })

    return NextResponse.json({
      success: true,
      insights,
      count: insights.length,
      message: `Generated ${insights.length} insights successfully`
    })

  } catch (error) {
    console.error('[InsightGeneration] Error generating insights:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
