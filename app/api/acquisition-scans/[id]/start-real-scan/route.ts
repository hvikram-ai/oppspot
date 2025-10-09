import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import CostManagementService from '@/lib/opp-scan/cost-management'
import DataSourceFactory from '@/lib/opp-scan/data-sources/data-source-factory'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import type { Row } from '@/lib/supabase/helpers'

type DbClient = SupabaseClient<Database>
type Scan = Database['public']['Tables']['acquisition_scans']['Row']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

  const awaitedParams = await params;
    const scanId = awaitedParams.id

    // Get the scan configuration
    const { data: scan, error: scanError } = await supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single() as { data: Row<'acquisition_scans'> | null; error: any }

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

    // Validate scan can be started
    if (!['configuring', 'failed'].includes(scan.status)) {
      return NextResponse.json(
        { error: `Cannot start scan in ${scan.status} status` },
        { status: 400 }
      )
    }

    // Validate scan configuration
    const validationError = validateScanConfiguration(scan)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Initialize services
    const costManagementService = new CostManagementService()
    const dataSourceFactory = new DataSourceFactory()

    // Test data source connectivity first
    const connectivityTest = await dataSourceFactory.testAllConnections()
    if (connectivityTest.overallHealth === 'critical') {
      return NextResponse.json(
        { 
          error: 'Data sources unavailable',
          details: connectivityTest.results.filter(r => !r.success)
        },
        { status: 503 }
      )
    }

    // Estimate scan cost
    const estimatedRequests = estimateRequestCount(scan)
    const affordabilityCheck = await costManagementService.checkScanAffordability({
      userId: user.id,
      scanId: scanId,
      dataSources: scan.data_sources || ['companies_house'],
      estimatedRequests
    })

    // Check if user can afford the scan
    if (!affordabilityCheck.canAfford) {
      return NextResponse.json({
        error: 'Insufficient budget',
        cost_estimate: {
          estimated_cost: affordabilityCheck.estimatedCost,
          available_budget: affordabilityCheck.budgetStatus.available_budget,
          cost_breakdown: affordabilityCheck.costBreakdown
        },
        recommendations: [
          'Add budget to your account',
          'Reduce scan scope (fewer data sources or regions)',
          'Use basic scan depth instead of comprehensive'
        ]
      }, { status: 402 }) // 402 Payment Required
    }

    // Warn about high costs
    if (affordabilityCheck.warnings.length > 0) {
      console.warn('Scan cost warnings:', affordabilityCheck.warnings)
    }

    // Update scan status to starting
    await supabase
      .from('acquisition_scans')
      // @ts-expect-error - Supabase type inference issue with update() method
      .update({
        status: 'scanning',
        current_step: 'initializing_real_data',
        started_at: new Date().toISOString(),
        progress_percentage: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', scanId)

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      // @ts-expect-error - Supabase type inference issue with insert() method for audit log
      .insert({
        scan_id: scanId,
        user_id: user.id,
        action_type: 'real_scan_started',
        action_description: `Started real data acquisition scan with estimated cost: £${affordabilityCheck.estimatedCost.toFixed(2)}`,
        after_state: {
          scan_id: scanId,
          data_sources: scan.data_sources,
          estimated_cost: affordabilityCheck.estimatedCost,
          connectivity_status: connectivityTest.overallHealth
        },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    // Use job queue for background processing
    const { ScanJobProcessor, jobQueue } = await import('@/lib/opp-scan/job-queue')
    const processor = new ScanJobProcessor(jobQueue)
    
    // Queue the scan job with proper priority and cost tracking
    const jobId = await processor.processScanJob(scanId, user.id, {
      priority: affordabilityCheck.estimatedCost > 100 ? 'high' : 'medium',
      estimatedDuration: Math.ceil(estimatedRequests / 2), // Estimate based on rate limits
      retryAttempts: 2
    })
    
    // Update scan with job ID for tracking
    await supabase
      .from('acquisition_scans')
      // @ts-expect-error - Supabase type inference issue with update() method
      .update({
        current_step: 'queued_for_processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', scanId)

    console.log(`Queued real data scan ${scanId} with job ID ${jobId}`)

    return NextResponse.json({
      message: 'Real data scan queued successfully',
      scanId: scanId,
      jobId: jobId,
      status: 'scanning',
      processing_status: 'queued',
      cost_estimate: {
        estimated_cost: affordabilityCheck.estimatedCost,
        cost_breakdown: affordabilityCheck.costBreakdown,
        budget_status: affordabilityCheck.budgetStatus
      },
      data_sources: {
        configured: scan.data_sources,
        connectivity: connectivityTest.results.map(r => ({
          source: r.sourceId,
          status: r.success ? 'healthy' : 'failed',
          message: r.message,
          response_time: r.responseTime
        }))
      },
      estimated_completion: getEstimatedCompletion(scan, estimatedRequests),
      job_tracking: {
        job_id: jobId,
        queue_position: 1, // Would be calculated from actual queue in production
        estimated_wait_time: '2-5 minutes'
      },
      warnings: affordabilityCheck.warnings,
      next_steps: [
        `Monitor scan progress via /api/job-queue?action=status&job_id=${jobId}`,
        `View results at /opp-scan/${scanId}/results when complete`,
        `Track costs at /api/cost-management?scan_id=${scanId}`
      ]
    })

  } catch (error) {
    console.error('Error starting real data scan:', error)
    return NextResponse.json(
      { error: 'Failed to start real data scan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions

function validateScanConfiguration(scan: Scan): string | null {
  const industries = scan.selected_industries as any[]
  if (!industries || industries.length === 0) {
    return 'No industries selected'
  }

  const regions = scan.selected_regions as any[]
  if (!regions || regions.length === 0) {
    return 'No regions selected'
  }

  const dataSources = scan.data_sources as string[]
  if (!dataSources || dataSources.length === 0) {
    return 'No data sources selected'
  }

  // Validate required environment variables for real data sources
  if (dataSources.includes('companies_house') && !process.env.COMPANIES_HOUSE_API_KEY) {
    return 'Companies House API key not configured'
  }

  if (dataSources.includes('financial_data') && !process.env.FINANCIAL_DATA_API_KEY) {
    return 'Financial data API key not configured'
  }

  return null
}

function estimateRequestCount(scan: Scan): number {
  let baseRequests = 100 // Base number of API calls

  // Multiply by number of industries
  const industries = scan.selected_industries as any[]
  baseRequests *= (industries?.length || 1)

  // Add requests for each data source
  const dataSourceMultiplier: Record<string, number> = {
    'companies_house': 1.0,
    'irish_cro': 0.8,
    'financial_data': 2.0, // More expensive, fewer calls
    'digital_footprint': 1.5,
    'patents_ip': 1.2,
    'news_media': 1.3,
    'employee_data': 1.8
  }

  let sourceMultiplier = 1.0
  const dataSources = (scan.data_sources as string[]) || []
  for (const source of dataSources) {
    sourceMultiplier += (dataSourceMultiplier[source] || 1.0)
  }

  baseRequests *= sourceMultiplier

  // Adjust for scan depth
  const depthMultiplier: Record<string, number> = {
    'basic': 0.5,
    'detailed': 1.0,
    'comprehensive': 2.0
  }

  baseRequests *= depthMultiplier[scan.scan_depth as string] || 1.0

  // Adjust for regions (more regions = more API calls)
  const regions = scan.selected_regions as any[]
  baseRequests *= Math.sqrt(regions?.length || 1)

  return Math.ceil(baseRequests)
}

function getEstimatedCompletion(scan: Scan, estimatedRequests: number): string {
  let estimatedMinutes = 10 // Base time for real API calls

  // Add time based on estimated requests (assuming 2 requests per minute with rate limiting)
  estimatedMinutes += Math.ceil(estimatedRequests / 2)

  // Add time for data processing and analysis
  const dataSources = (scan.data_sources as string[]) || []
  estimatedMinutes += dataSources.length * 5

  // Add time based on scan depth
  const depthMultiplier: Record<string, number> = {
    'basic': 1,
    'detailed': 1.5,
    'comprehensive': 2.5
  }
  estimatedMinutes *= depthMultiplier[scan.scan_depth as string] || 1.5

  const completionTime = new Date()
  completionTime.setMinutes(completionTime.getMinutes() + estimatedMinutes)

  return completionTime.toISOString()
}

async function checkOrgAccess(supabase: DbClient, userId: string, orgId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single() as { data: Pick<Row<'profiles'>, 'org_id'> | null; error: any } 

    return profile?.org_id === orgId
  } catch (error) {
    console.error('Error checking org access:', error)
    return false
  }
}