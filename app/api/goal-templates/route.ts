import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * GET /api/goal-templates
 * Fetch available goal templates
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const isPublic = searchParams.get('is_public')

    // Build query
    let query = supabase
      .from('goal_templates')
      .select('*')
      .order('use_count', { ascending: false })

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (isPublic !== null) {
      query = query.eq('is_public', isPublic === 'true')
    } else {
      // By default, show public templates and user's own templates
      query = query.or(`is_public.eq.true,created_by.eq.${user.id}`)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching goal templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch goal templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: templates || [],
      total: templates?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error fetching goal templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goal-templates
 * Create a new custom goal template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      id,
      name,
      description,
      category,
      icon,
      default_criteria,
      default_metrics,
      default_success_criteria,
      suggested_agents,
      is_public
    } = body

    // Validate required fields
    if (!id || !name || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, description, category' },
        { status: 400 }
      )
    }

    // Insert template
    const { data: template, error } = await supabase
      .from('goal_templates')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        id,
        name,
        description,
        category,
        icon: icon || '🎯',
        default_criteria: default_criteria || {},
        default_metrics: default_metrics || {},
        default_success_criteria: default_success_criteria || {},
        suggested_agents: suggested_agents || [],
        is_public: is_public || false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating goal template:', error)
      return NextResponse.json(
        { error: 'Failed to create goal template' },
        { status: 500 }
      )
    }

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating goal template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
