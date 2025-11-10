/**
 * Streams Export API
 * Endpoint: GET /api/streams/[id]/export?format=pdf|csv
 * Exports stream data including items, activity, and members
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Validate format
    if (!['pdf', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf or csv' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get stream data
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      )
    }

    // Check if user has access to the stream
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this stream' },
        { status: 403 }
      )
    }

    // Get stream items
    const { data: items } = await supabase
      .from('stream_items')
      .select(`
        *,
        businesses:business_id (
          id,
          name,
          website
        ),
        assigned_user:assigned_to (
          id,
          full_name
        )
      `)
      .eq('stream_id', streamId)
      .order('position', { ascending: true })

    // Get stream members
    const { data: members } = await supabase
      .from('stream_members')
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('stream_id', streamId)
      .order('joined_at', { ascending: true })

    // Get stream activity (last 100)
    const { data: activities } = await supabase
      .from('stream_activities')
      .select(`
        *,
        user:user_id (
          id,
          full_name
        )
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(100)

    const exportData = {
      stream,
      items: items || [],
      members: members || [],
      activities: activities || [],
    }

    // Generate export based on format
    if (format === 'csv') {
      const { generateStreamsCSV } = await import('@/lib/streams/exporters/csv-exporter')
      const csv = await generateStreamsCSV(exportData)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="stream-${stream.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.csv"`,
        },
      })
    } else {
      // PDF export
      const { generateStreamsPDF } = await import('@/lib/streams/exporters/pdf-exporter')
      const pdf = await generateStreamsPDF(exportData)

      return new NextResponse(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="stream-${stream.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf"`,
          'Content-Length': pdf.length.toString(),
        },
      })
    }
  } catch (error) {
    console.error('[StreamsExport] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
