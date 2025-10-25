// Agent Workflow Validation API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowConfig } from '@/types/agent-workflow'
import { WorkflowValidator } from '@/lib/agents/workflow-builder/workflow-validator'

/**
 * POST /api/agent-workflows/[id]/validate
 * Validate a workflow configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workflow
    const { data: workflow, error: fetchError } = await (supabase
      .from('agent_workflows') as any)
      .select('config')
      .eq('id', id)
      .single()

    if (fetchError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate workflow
    const validationResult = WorkflowValidator.validateForExecution(
      (workflow as any).config as WorkflowConfig
    )

    return NextResponse.json({
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    })
  } catch (error) {
    console.error('Error in POST /api/agent-workflows/[id]/validate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Removed POST_PREVIEW - not a valid Next.js route export
 * Use the main POST endpoint with ?preview=true query param if needed
 */
