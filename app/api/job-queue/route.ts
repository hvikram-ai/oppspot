import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobQueue, ScanJobProcessor } from '@/lib/opp-scan/job-queue'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

type DbClient = SupabaseClient<Database>

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const jobId = searchParams.get('job_id')

    const processor = new ScanJobProcessor(jobQueue)

    switch (action) {
      case 'status':
        if (!jobId) {
          return NextResponse.json(
            { error: 'job_id parameter is required for status action' },
            { status: 400 }
          )
        }

        const jobStatus = await processor.getJobStatus(jobId)
        if (!jobStatus) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ job: jobStatus })

      case 'user_jobs':
        const userJobs = await jobQueue.getUserJobs(user.id)
        return NextResponse.json({ jobs: userJobs })

      case 'queue_stats':
        const stats = await jobQueue.getQueueStats()
        return NextResponse.json({ stats })

      case 'queue_health':
        const health = await processor.getQueueHealth()
        return NextResponse.json({ health })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: status, user_jobs, queue_stats, queue_health' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Job queue API error:', error)
    return NextResponse.json(
      { error: 'Failed to process job queue request', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, scanId, jobId, priority, estimatedDuration } = body

    const processor = new ScanJobProcessor(jobQueue)

    switch (action) {
      case 'queue_scan':
        if (!scanId) {
          return NextResponse.json(
            { error: 'scanId is required for queue_scan action' },
            { status: 400 }
          )
        }

        // Verify scan exists and user has access
        const { data: scan, error: _scanError } = await supabase
          .from('acquisition_scans')
          .select('*')
          .eq('id', scanId)
          .single() as { data: { user_id: string; org_id: string } & Record<string, unknown> | null; error: unknown }

        if (scanError || !scan) {
          return NextResponse.json(
            { error: 'Scan not found' },
            { status: 404 }
          )
        }

        // Check access permissions
        const hasAccess = scan.user_id === user.id || 
          (scan.org_id && await checkOrgAccess(supabase, user.id, scan.org_id))

        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }

        // Queue the scan job
        const queuedJobId = await processor.processScanJob(scanId, user.id, {
          priority: priority || 'medium',
          estimatedDuration: estimatedDuration || 30
        })

        // Update scan status to queued
        await supabase
          .from('acquisition_scans')
          .update({
            status: 'scanning',
            current_step: 'queued_for_processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', scanId)

        return NextResponse.json({
          message: 'Scan queued successfully',
          jobId: queuedJobId,
          scanId: scanId,
          estimatedCompletion: new Date(Date.now() + (estimatedDuration || 30) * 60000).toISOString()
        }, { status: 201 })

      case 'cancel_job':
        if (!jobId) {
          return NextResponse.json(
            { error: 'jobId is required for cancel_job action' },
            { status: 400 }
          )
        }

        const cancelled = await processor.cancelJob(jobId)
        
        if (!cancelled) {
          return NextResponse.json(
            { error: 'Job not found or cannot be cancelled' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          message: 'Job cancelled successfully',
          jobId: jobId
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: queue_scan, cancel_job' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Job queue API error:', error)
    return NextResponse.json(
      { error: 'Failed to process job queue request', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Helper function to check organization access
async function checkOrgAccess(supabase: DbClient, userId: string, orgId: string): Promise<boolean> {
  try {
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single() as { data: { org_id: string } | null; error: unknown }

    return profile?.org_id === orgId
  } catch (error) {
    console.error('Error checking org access:', error)
    return false
  }
}