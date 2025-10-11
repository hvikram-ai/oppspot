import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import type { Row } from '@/lib/supabase/helpers'

type DbClient = SupabaseClient<Database>

export async function GET(
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

    // Get the scan with access control
    const { data: scanData, error: scanError } = await supabase
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
      .single();

    if (scanError || !scanData) {
      console.error('Error fetching scan:', scanError)
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    // Type the scan result explicitly
    const scan = scanData as Row<'acquisition_scans'> & {
      target_companies?: Array<{
        id: string
        company_name: string | null
        overall_score: number | null
        analysis_status: string | null
        created_at: string
      }>
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
    const { data: marketIntelligence, error: marketIntelligenceError } = await supabase
      .from('market_intelligence')
      .select('*')
      .eq('scan_id', scanId)

    // Get scan reports
    const { data: reports, error: reportsError } = await supabase
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
    const body = await request.json()

    // Get the existing scan
    const { data: existingScanData, error: fetchError } = await supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (fetchError || !existingScanData) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    const existingScan = existingScanData as Row<'acquisition_scans'>

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
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    } as Database['public']['Tables']['acquisition_scans']['Update']
    const { data: updatedScan, error: updateError } = await supabase
      .from('acquisition_scans')
      // @ts-expect-error - Supabase type inference issue with update() method
      .update(updateData)
      .eq('id', scanId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scan:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scan' },
        { status: 500 }
      )
    }

    // Create audit log entry
    const auditData = {
        scan_id: scanId,
        user_id: user.id,
        action_type: 'scan_updated',
        action_description: `Updated acquisition scan`,
        before_state: existingScan as Database['public']['Tables']['scan_audit_log']['Row']['before_state'],
        after_state: updatedScan as Database['public']['Tables']['scan_audit_log']['Row']['after_state'],
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      } as Database['public']['Tables']['scan_audit_log']['Insert']
    await supabase
      .from('scan_audit_log')
      // @ts-expect-error - Supabase type inference issue with insert() method for audit log
      .insert(auditData)

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

    // Get the existing scan
    const { data: existingScanData, error: fetchError } = await supabase
      .from('acquisition_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (fetchError || !existingScanData) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    const existingScan = existingScanData as Row<'acquisition_scans'>

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
    const deleteAuditData = {
        scan_id: scanId,
        user_id: user.id,
        action_type: 'scan_deleted',
        action_description: `Deleted acquisition scan: ${existingScan.name}`,
        before_state: existingScan as Database['public']['Tables']['scan_audit_log']['Row']['before_state'],
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      } as Database['public']['Tables']['scan_audit_log']['Insert']
    await supabase
      .from('scan_audit_log')
      // @ts-expect-error - Supabase type inference issue with insert() method for audit log
      .insert(deleteAuditData)

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
async function checkOrgAccess(supabase: DbClient, userId: string, orgId: string): Promise<boolean> {
  try {
    const { data: profile, error: profileError } = await supabase
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