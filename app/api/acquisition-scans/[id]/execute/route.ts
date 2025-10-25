import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>
type Scan = Database['public']['Tables']['acquisition_scans']['Row']
type ScanUpdate = Database['public']['Tables']['acquisition_scans']['Update']
type AuditLogInsert = Database['public']['Tables']['acquisition_scan_audit_logs']['Insert']
type MarketIntelligenceInsert = Database['public']['Tables']['acquisition_scan_market_intelligence']['Insert']
type ScanReportInsert = Database['public']['Tables']['acquisition_scan_reports']['Insert']
type Industry = { industry: string; description?: string }
type Region = { id: string; name: string; country: string }

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

    const { id: scanId } = await params
    const { action } = await request.json() // 'start', 'pause', 'resume', 'stop'

    // Get the existing scan
    const { data: scanData, error: fetchError } = await supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (fetchError || !scanData) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    const scan = scanData as Scan

    // Check access permissions
    const hasAccess = scan.user_id === user.id || 
      (scan.org_id && await checkOrgAccess(supabase, user.id, scan.org_id))

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate action based on current status
    const validTransitions: Record<string, string[]> = {
      'configuring': ['start'],
      'scanning': ['pause', 'stop'],
      'analyzing': ['pause', 'stop'],
      'paused': ['resume', 'stop'],
      'completed': [],
      'failed': ['start'] // Allow restart
    }

    if (!validTransitions[scan.status]?.includes(action)) {
      return NextResponse.json(
        { error: `Cannot ${action} scan in ${scan.status} status` },
        { status: 400 }
      )
    }

    let newStatus: string
    let newStep: string = scan.current_step
    let started_at = scan.started_at
    let completed_at = scan.completed_at

    switch (action) {
      case 'start':
        newStatus = 'scanning'
        newStep = 'data_collection'
        started_at = new Date().toISOString()
        completed_at = null
        
        // Initialize the scanning process
        await initializeScanExecution(supabase, scanId, scan)
        break
        
      case 'pause':
        newStatus = 'paused'
        break
        
      case 'resume':
        newStatus = scan.progress_percentage === 100 ? 'analyzing' : 'scanning'
        break
        
      case 'stop':
        newStatus = 'configuring'
        newStep = 'industry_selection'
        started_at = null
        completed_at = null
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update scan status
    const { data: updatedScan, error: updateError } = await supabase
      .from('acquisition_scans')
      // @ts-expect-error - Complex acquisition_scans update type
      .update({
        status: newStatus,
        current_step: newStep,
        started_at,
        completed_at,
        updated_at: new Date().toISOString()
      } as ScanUpdate)
      .eq('id', scanId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating scan status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scan status' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      // @ts-expect-error - scan_audit_log insert type mismatch
      .insert({
        scan_id: scanId,
        user_id: user.id,
        action_type: `scan_${action}`,
        action_description: `${action.charAt(0).toUpperCase() + action.slice(1)} acquisition scan`,
        before_state: scan,
        after_state: updatedScan,
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      } as AuditLogInsert)

    return NextResponse.json({ 
      scan: updatedScan,
      message: `Scan ${action} successful`
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Initialize the scanning process
async function initializeScanExecution(supabase: DbClient, scanId: string, scan: Scan) {
  try {
    // Create market intelligence entry
    await supabase
      .from('market_intelligence')
      // @ts-expect-error - market_intelligence insert type mismatch
      .insert({
        scan_id: scanId,
        industry_sector: (scan.selected_industries as Industry[]).map((i: Industry) => i.industry).join(', '),
        geographic_scope: (scan.selected_regions as Region[]).map((r: Region) => ({
          id: r.id,
          name: r.name,
          country: r.country
        })),
        data_sources: scan.data_sources,
        analysis_date: new Date().toISOString().split('T')[0],
        confidence_level: 0.0
      } as MarketIntelligenceInsert)

    // Create initial scan report entry
    await supabase
      .from('scan_reports')
      // @ts-expect-error - scan_reports insert type mismatch
      .insert({
        scan_id: scanId,
        user_id: scan.user_id,
        report_type: 'executive_summary',
        report_title: `${scan.name} - Executive Summary`,
        report_description: 'Initial scan configuration and objectives',
        report_content: {
          scan_configuration: scan.config,
          industries: scan.selected_industries,
          regions: scan.selected_regions,
          objectives: scan.strategic_objectives,
          data_sources: scan.data_sources
        },
        report_format: 'json',
        generation_status: 'pending',
        is_confidential: true,
        access_level: 'private'
      } as ScanReportInsert)

    // Note: In a real implementation, this would trigger background jobs
    // to start data collection from various sources. For now, we'll simulate
    // the process by updating progress periodically.
    
    console.log(`Initialized scan execution for scan ${scanId}`)
  } catch (error) {
    console.error('Error initializing scan execution:', error)
    throw error
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