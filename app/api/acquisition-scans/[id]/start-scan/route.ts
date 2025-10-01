import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OppScanEngine } from '@/lib/opp-scan/scanning-engine'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

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
      .single()

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

    // Update scan status to starting
    await supabase
      .from('acquisition_scans')
      .update({
        status: 'scanning',
        current_step: 'initializing',
        started_at: new Date().toISOString(),
        progress_percentage: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', scanId)

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        action_type: 'scan_started',
        action_description: 'Started acquisition scan execution',
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    // Start the scanning engine asynchronously
    // In a production environment, this would be queued as a background job
    const scanEngine = new OppScanEngine()
    
    // Start scan execution in background (non-blocking)
    scanEngine.executeScan(scanId).catch(error => {
      console.error(`Background scan execution failed for ${scanId}:`, error)
    })

    return NextResponse.json({
      message: 'Scan started successfully',
      scanId: scanId,
      status: 'scanning',
      estimated_completion: getEstimatedCompletion(scan)
    })

  } catch (error) {
    console.error('Error starting scan:', error)
    return NextResponse.json(
      { error: 'Failed to start scan' },
      { status: 500 }
    )
  }
}

// Validate scan configuration
function validateScanConfiguration(scan: Scan): string | null {
  if (!scan.selected_industries || scan.selected_industries.length === 0) {
    return 'No industries selected'
  }

  if (!scan.selected_regions || scan.selected_regions.length === 0) {
    return 'No regions selected'
  }

  if (!scan.data_sources || scan.data_sources.length === 0) {
    return 'No data sources selected'
  }

  if (!scan.required_capabilities || scan.required_capabilities.length === 0) {
    return 'No capabilities specified'
  }

  // Validate data source configuration
  const requiredSources = ['companies_house']
  const missingSources = requiredSources.filter(source => 
    !scan.data_sources.includes(source)
  )
  
  if (missingSources.length > 0 && !scan.data_sources.includes('irish_cro')) {
    return 'At least Companies House or Irish CRO data source is required'
  }

  return null
}

// Estimate completion time based on scan configuration
function getEstimatedCompletion(scan: Scan): string {
  let estimatedMinutes = 30 // Base time

  // Add time based on data sources
  estimatedMinutes += scan.data_sources.length * 5

  // Add time based on scan depth
  const depthMultiplier = {
    'basic': 1,
    'detailed': 2,
    'comprehensive': 4
  }
  estimatedMinutes *= depthMultiplier[scan.scan_depth] || 2

  // Add time based on region complexity
  estimatedMinutes += scan.selected_regions.length * 2

  // Add time based on industry complexity
  estimatedMinutes += scan.selected_industries.length * 3

  const completionTime = new Date()
  completionTime.setMinutes(completionTime.getMinutes() + estimatedMinutes)

  return completionTime.toISOString()
}

// Helper function to check organization access
async function checkOrgAccess(supabase: DbClient, userId: string, orgId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single()

    return profile?.org_id === orgId
  } catch (error) {
    console.error('Error checking org access:', error)
    return false
  }
}