import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const scanId = params.id

    // Get the scan with access control
    const { data: scan, error: scanError } = await supabase
      .from('acquisition_scans')
      .select(`
        *,
        target_companies (
          id,
          company_name,
          overall_score,
          analysis_status,
          created_at
        )
      `)
      .eq('id', scanId)
      .single()

    if (scanError) {
      console.error('Error fetching scan:', scanError)
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

    // Get market intelligence data
    const { data: marketIntelligence } = await supabase
      .from('market_intelligence')
      .select('*')
      .eq('scan_id', scanId)

    // Get scan reports
    const { data: reports } = await supabase
      .from('scan_reports')
      .select('id, report_type, report_title, generation_status, created_at, file_size')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      scan: {
        ...scan,
        market_intelligence: marketIntelligence,
        reports
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const scanId = params.id
    const body = await request.json()

    // Get the existing scan
    const { data: existingScan, error: fetchError } = await supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const hasAccess = existingScan.user_id === user.id || 
      (existingScan.org_id && await checkOrgAccess(supabase, user.id, existingScan.org_id))

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update the scan
    const { data: updatedScan, error: updateError } = await supabase
      .from('acquisition_scans')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', scanId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating scan:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scan' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        action_type: 'scan_updated',
        action_description: `Updated acquisition scan`,
        before_state: existingScan,
        after_state: updatedScan,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    return NextResponse.json({ scan: updatedScan })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const scanId = params.id

    // Get the existing scan
    const { data: existingScan, error: fetchError } = await supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const hasAccess = existingScan.user_id === user.id || 
      (existingScan.org_id && await checkOrgAccess(supabase, user.id, existingScan.org_id))

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete the scan (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('acquisition_scans')
      .delete()
      .eq('id', scanId)

    if (deleteError) {
      console.error('Error deleting scan:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete scan' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        action_type: 'scan_deleted',
        action_description: `Deleted acquisition scan: ${existingScan.name}`,
        before_state: existingScan,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to check organization access
async function checkOrgAccess(supabase: any, userId: string, orgId: string): Promise<boolean> {
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