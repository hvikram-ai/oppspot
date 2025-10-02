import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const body = await request.json()

    // Insert command log
    const { error } = await supabase
      .from('voice_commands')
      .insert({
        user_id: user.id,
        org_id: profile.org_id,
        transcript: body.transcript,
        intent: body.intent,
        confidence: body.confidence,
        parameters: body.parameters || {},
        page_url: body.pageUrl,
        session_id: body.sessionId,
        success: body.success !== false,
        error_message: body.errorMessage,
        execution_time_ms: body.executionTimeMs
      })

    if (error) {
      console.error('[Voice Log API] Database error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Voice Log API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to log command',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
