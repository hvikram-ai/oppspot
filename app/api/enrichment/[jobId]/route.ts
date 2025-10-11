/**
 * Enrichment Job API
 * GET /api/enrichment/[jobId] - Get job status
 * DELETE /api/enrichment/[jobId] - Cancel job
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEnrichmentOrchestrator } from '@/lib/ai/enrichment/enrichment-orchestrator'
import type { Row } from '@/lib/supabase/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create orchestrator
    const orchestrator = await createEnrichmentOrchestrator(profile.org_id)

    // Get job status
    const job = await orchestrator.getJobStatus(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        companyIds: job.companyIds,
        enrichmentTypes: job.enrichmentTypes,
        progress: job.progress,
        results: job.results,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error
      }
    })

  } catch (error) {
    console.error('Error fetching enrichment job:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to fetch enrichment job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create orchestrator
    const orchestrator = await createEnrichmentOrchestrator(profile.org_id)

    // Cancel job
    const success = await orchestrator.cancelJob(jobId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling enrichment job:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to cancel enrichment job' },
      { status: 500 }
    )
  }
}
