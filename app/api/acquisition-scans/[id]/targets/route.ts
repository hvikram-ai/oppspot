import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

type DbClient = SupabaseClient<Database>

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
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'overall_score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const status = searchParams.get('status')
    const minScore = searchParams.get('minScore') ? parseFloat(searchParams.get('minScore')!) : null

    // Check scan access
    const { data: scan, error: scanError } = await supabase
      .from('acquisition_scans')
      .select('user_id, org_id')
      .eq('id', scanId)
      .single()

    if (scanError) {
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

    // Build query
    let query = supabase
      .from('target_companies')
      .select(`
        *,
        financial_analysis (
          revenue,
          ebitda,
          financial_distress_signals,
          valuation_confidence,
          estimated_enterprise_value
        ),
        risk_assessments (
          overall_risk_score,
          risk_category,
          red_flags
        ),
        due_diligence (
          due_diligence_score,
          recommendation,
          key_findings
        )
      `, { count: 'exact' })
      .eq('scan_id', scanId)

    // Apply filters
    if (status) {
      query = query.eq('analysis_status', status)
    }

    if (minScore !== null) {
      query = query.gte('overall_score', minScore)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: targets, error: targetsError, count } = await query

    if (targetsError) {
      console.error('Error fetching targets:', targetsError)
      return NextResponse.json(
        { error: 'Failed to fetch targets' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const { data: stats } = await supabase
      .from('target_companies')
      .select('analysis_status, overall_score')
      .eq('scan_id', scanId)

    const summary = {
      total: count || 0,
      pending: stats?.filter(t => t.analysis_status === 'pending').length || 0,
      analyzing: stats?.filter(t => t.analysis_status === 'analyzing').length || 0,
      completed: stats?.filter(t => t.analysis_status === 'completed').length || 0,
      shortlisted: stats?.filter(t => t.analysis_status === 'shortlisted').length || 0,
      excluded: stats?.filter(t => t.analysis_status === 'excluded').length || 0,
      average_score: stats && stats.length > 0 
        ? stats.reduce((sum, t) => sum + (t.overall_score || 0), 0) / stats.length
        : 0
    }

    return NextResponse.json({
      targets,
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
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

export async function POST(
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

    // Check scan access
    const { data: scan, error: scanError } = await supabase
      .from('acquisition_scans')
      .select('user_id, org_id, status')
      .eq('id', scanId)
      .single()

    if (scanError) {
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

    // Check if scan is active
    if (!['scanning', 'analyzing'].includes(scan.status)) {
      return NextResponse.json(
        { error: 'Can only add targets to active scans' },
        { status: 400 }
      )
    }

    const {
      companyName,
      companiesHouseNumber,
      registrationCountry = 'UK',
      website,
      industryCodes,
      businessDescription,
      yearIncorporated,
      employeeCountRange,
      registeredAddress,
      tradingAddress,
      phone,
      email,
      discoverySource,
      discoveryMethod,
      discoveryConfidence = 0.5
    } = body

    // Validate required fields
    if (!companyName || !discoverySource) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName and discoverySource' },
        { status: 400 }
      )
    }

    // Create target company
    const { data: target, error: insertError } = await supabase
      .from('target_companies')
      .insert({
        scan_id: scanId,
        company_name: companyName,
        companies_house_number: companiesHouseNumber,
        registration_country: registrationCountry,
        website,
        industry_codes: industryCodes || [],
        business_description: businessDescription,
        year_incorporated: yearIncorporated,
        employee_count_range: employeeCountRange,
        registered_address: registeredAddress,
        trading_address: tradingAddress,
        phone,
        email,
        discovery_source: discoverySource,
        discovery_method: discoveryMethod,
        discovery_confidence: discoveryConfidence,
        overall_score: 0.0,
        strategic_fit_score: 0.0,
        financial_health_score: 0.0,
        risk_score: 0.0,
        analysis_status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating target company:', insertError)
      return NextResponse.json(
        { error: 'Failed to create target company' },
        { status: 500 }
      )
    }

    // Update scan targets count
    await supabase.rpc('increment_scan_targets', { 
      scan_id: scanId, 
      increment: 1 
    })

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      .insert({
        scan_id: scanId,
        target_company_id: target.id,
        user_id: user.id,
        action_type: 'target_added',
        action_description: `Added target company: ${companyName}`,
        after_state: target,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    return NextResponse.json({ target }, { status: 201 })
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