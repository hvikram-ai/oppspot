// Agent Workflows API - List and Create workflows

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateWorkflowRequest } from '@/types/agent-workflow'
import { WorkflowValidator } from '@/lib/agents/workflow-builder/workflow-validator'

/**
 * GET /api/agent-workflows
 * List all workflows for the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to find organization
    const { data: profile, error: profileError } = await (supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single())

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = (supabase
      .from('agent_workflows') as any)
      .select('*, created_by:profiles!agent_workflows_created_by_fkey(id, full_name, email)', {
        count: 'exact',
      })
      .eq('organization_id', (profile as any)?.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data: workflows, error, count } = await query

    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }

    return NextResponse.json({
      workflows,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/agent-workflows:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agent-workflows
 * Create a new workflow
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to find organization
    const { data: profile, error: profileError } = await (supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single())

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body: CreateWorkflowRequest = await request.json()
    const { name, description, config, tags, isTemplate } = body

    // Validate required fields
    if (!name || !config) {
      return NextResponse.json(
        { error: 'Name and config are required' },
        { status: 400 }
      )
    }

    // Validate workflow structure
    const validationResult = WorkflowValidator.validateForExecution(config)

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Invalid workflow configuration',
          validation: validationResult,
        },
        { status: 400 }
      )
    }

    // Create workflow
    const { data: workflow, error: insertError } = await (supabase
      .from('agent_workflows') as any)
      .insert({
        name,
        description,
        config,
        nodes: config.nodes,
        edges: config.edges,
        tags: tags || [],
        is_template: isTemplate || false,
        organization_id: (profile as any)?.org_id,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating workflow:', insertError)
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      workflow,
      validation: validationResult,
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/agent-workflows:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
