/**
 * Saved Searches API
 * GET /api/search/saved - Get all saved searches for current user
 * POST /api/search/saved - Create a new saved search
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AdvancedFilters } from '@/types/filters'
import type { Row } from '@/lib/supabase/helpers'

interface SavedSearch {
  id: string
  user_id: string
  name: string
  description: string | null
  filters: AdvancedFilters
  is_favorite: boolean
  execution_count: number
  last_executed_at: string | null
  result_count: number | null
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's saved searches
    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('last_executed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved searches:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved searches' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      searches: searches || [],
      total: searches?.length || 0,
    })
  } catch (error) {
    console.error('Saved searches API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, filters, is_favorite } = body

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search name is required' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Search name must be 100 characters or less' },
        { status: 400 }
      )
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json(
        { error: 'Filters are required' },
        { status: 400 }
      )
    }

    // Check if user already has a search with this name
    const { data: existing, error: existingError } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A search with this name already exists' },
        { status: 409 }
      )
    }

    // Create saved search
    const { data: search, error } = await supabase
      .from('saved_searches')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        filters,
        is_favorite: is_favorite || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating saved search:', error)
      return NextResponse.json(
        { error: 'Failed to create saved search' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      search,
    }, { status: 201 })
  } catch (error) {
    console.error('Create saved search API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
