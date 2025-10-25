/**
 * Business Lists API
 * GET /api/lists - Get all lists for current user
 * POST /api/lists - Create a new list
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Fetch user's lists with business count
    const { data: lists, error } = await supabase
      .from('business_lists')
      .select(`
        id,
        name,
        description,
        color,
        icon,
        is_public,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true }) as { data: Array<{ id: string } & Record<string, unknown>> | null; error: unknown }

    if (error) {
      console.error('Error fetching lists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch lists' },
        { status: 500 }
      )
    }

    // Get business count for each list
    const listsWithCount = await Promise.all(
      (lists || []).map(async list => {
        const { count } = await supabase
          .from('saved_businesses')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id)

        return {
          ...list,
          business_count: count || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      lists: listsWithCount,
      total: listsWithCount.length,
    })
  } catch (error) {
    console.error('Lists API error:', error)
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
    const { name, description, color, icon } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      )
    }

    // Create list
    const { data: list, error } = await supabase
      .from('business_lists')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3b82f6',
        icon: icon || 'folder',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating list:', error)
      return NextResponse.json(
        { error: 'Failed to create list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      list: {
        ...(list as any),
        business_count: 0,
      },
    })
  } catch (error) {
    console.error('Create list API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
