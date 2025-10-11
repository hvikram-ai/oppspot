/**
 * Execute Saved Search API
 * POST /api/search/saved/[id]/execute - Execute a saved search and increment count
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advancedFilterService } from '@/lib/search/advanced-filter-service'
import type { Row } from '@/lib/supabase/helpers'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch saved search
    const { data: savedSearch, error: fetchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !savedSearch) {
      return NextResponse.json(
        { error: 'Saved search not found' },
        { status: 404 }
      )
    }

    // Get pagination and sorting from request body
    const body = await request.json().catch(() => ({}))
    const pagination = body.pagination || { page: 1, perPage: 20 }
    const sorting = body.sorting || { field: 'updated_at', direction: 'desc' }

    // Execute the search
    const results = await advancedFilterService.executeSearch({
      filters: savedSearch.filters,
      pagination,
      sorting,
    })

    // Increment execution count (fire and forget)
    // @ts-expect-error - Type inference issue
    supabase.rpc('increment_search_execution', {
      p_search_id: id,
      p_result_count: results.total,
    }).then(() => {
      console.log(`Incremented execution count for search: ${id}`)
    }, (err: unknown) => {
      console.error('Error incrementing execution count:', err)
    })

    return NextResponse.json({
      success: true,
      savedSearch: {
        id: savedSearch.id,
        name: savedSearch.name,
        description: savedSearch.description,
      },
      results,
    })
  } catch (error) {
    console.error('Execute saved search API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
