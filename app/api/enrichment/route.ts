/**
 * Enrichment API
 * POST /api/enrichment - Start enrichment job
 * GET /api/enrichment - List enrichment jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEnrichmentOrchestrator, EnrichmentRequest } from '@/lib/ai/enrichment/enrichment-orchestrator'
import type { Row } from '@/lib/supabase/helpers'

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

    // Get user's org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const enrichmentRequest: EnrichmentRequest = {
      companyIds: body.companyIds || [],
      enrichmentTypes: body.enrichmentTypes || ['all'],
      priority: body.priority || 'normal',
      mode: body.mode || 'sequential'
    }

    // Validate request
    if (!enrichmentRequest.companyIds || enrichmentRequest.companyIds.length === 0) {
      return NextResponse.json(
        { error: 'No company IDs provided' },
        { status: 400 }
      )
    }

    if (enrichmentRequest.companyIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 companies per enrichment request' },
        { status: 400 }
      )
    }

    // Create orchestrator
    const orchestrator = await createEnrichmentOrchestrator(profile.org_id)

    // Start enrichment
    const job = await orchestrator.enrichCompanies(enrichmentRequest)

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        companyIds: job.companyIds,
        enrichmentTypes: job.enrichmentTypes,
        progress: job.progress
      }
    })

  } catch (error) {
    console.error('Error starting enrichment:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to start enrichment' },
      { status: 500 }
    )
  }
}

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

    // Get user's org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Create orchestrator
    const orchestrator = await createEnrichmentOrchestrator(profile.org_id)

    // Get jobs
    const jobs = await orchestrator.getJobs(limit)

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        companyIds: job.companyIds,
        enrichmentTypes: job.enrichmentTypes,
        progress: job.progress,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error
      }))
    })

  } catch (error) {
    console.error('Error fetching enrichment jobs:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to fetch enrichment jobs' },
      { status: 500 }
    )
  }
}
