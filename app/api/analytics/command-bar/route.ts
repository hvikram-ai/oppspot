import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ success: true })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Log to console for now (you can add database logging later)
    console.log('[Command Bar Analytics]', {
      userId: user?.id,
      eventCount: events.length,
      events: events.map(e => ({
        event: e.event,
        query: e.query,
        resultType: e.resultType,
        timestamp: e.timestamp,
      }))
    })

    // TODO: Store in analytics table for later analysis
    // For now, just acknowledge receipt
    return NextResponse.json({ success: true, recorded: events.length })
  } catch (error) {
    console.error('Command bar analytics error:', error)
    // Don't fail the request - analytics should be non-blocking
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
