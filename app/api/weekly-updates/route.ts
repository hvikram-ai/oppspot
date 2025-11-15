import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdatesListResponse } from '@/types/updates'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '10')
    const offset = (page - 1) * perPage

    // Get total count
    const { count } = await supabase
      .from('weekly_updates')
      .select('*', { count: 'exact', head: true })
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())

    // Get paginated updates
    const { data: updates, error } = await supabase
      .from('weekly_updates')
      .select('id, week_number, year, date_start, date_end, slug, headline, summary, featured_image, published_at, view_count')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      console.error('Error fetching weekly updates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch updates' },
        { status: 500 }
      )
    }

    // Format date ranges
    const formattedUpdates = updates.map(update => ({
      ...update,
      date_range: `${new Date(update.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(update.date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }))

    const response: UpdatesListResponse = {
      updates: formattedUpdates,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in weekly updates API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
