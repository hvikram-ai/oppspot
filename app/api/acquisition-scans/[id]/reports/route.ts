import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>
type Scan = Database['public']['Tables']['acquisition_scans']['Row']

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
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')

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
      .from('scan_reports')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })

    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports })
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

    // Check scan access
    const { data: scan, error: scanError } = await supabase
      .from('acquisition_scans')
      .select('user_id, org_id, name, status')
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

    const {
      reportType,
      reportTitle,
      reportDescription,
      reportFormat = 'pdf',
      templateUsed,
      accessLevel = 'private',
      sharedWith = []
    } = body

    // Validate required fields
    if (!reportType || !reportTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: reportType and reportTitle' },
        { status: 400 }
      )
    }

    // Validate report type
    const validReportTypes = [
      'executive_summary',
      'detailed_analysis',
      'target_comparison',
      'market_overview',
      'due_diligence_summary',
      'valuation_analysis',
      'risk_assessment',
      'compliance_report'
    ]

    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      )
    }

    // Generate report content based on type
    const reportContent = await generateReportContent(supabase, scanId, reportType, scan)

    // Create report
    const { data: report, error: insertError } = await supabase
      .from('scan_reports')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        report_type: reportType,
        report_title: reportTitle,
        report_description: reportDescription,
        report_content: reportContent,
        report_format: reportFormat,
        template_used: templateUsed,
        is_confidential: accessLevel !== 'public',
        access_level: accessLevel,
        shared_with: sharedWith,
        generation_status: 'generating'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating report:', insertError)
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    // In a real implementation, this would trigger background report generation
    // For now, we'll mark it as completed
    setTimeout(async () => {
      await supabase
        .from('scan_reports')
        .update({ 
          generation_status: 'completed',
          generated_at: new Date().toISOString(),
          file_size: Math.floor(Math.random() * 1000000) + 100000 // Simulate file size
        })
        .eq('id', report.id)
    }, 5000) // Simulate 5-second generation time

    // Create audit log entry
    await supabase
      .from('scan_audit_log')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        action_type: 'report_generated',
        action_description: `Generated ${reportType} report: ${reportTitle}`,
        after_state: report,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        legal_basis: 'legitimate_interest',
        retention_period: 365
      })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Generate report content based on type
async function generateReportContent(supabase: DbClient, scanId: string, reportType: string, scan: Scan) {
  try {
    // Get scan data
    const { data: targets } = await supabase
      .from('target_companies')
      .select(`
        *,
        financial_analysis (*),
        risk_assessments (*),
        due_diligence (*)
      `)
      .eq('scan_id', scanId)

    const { data: marketIntelligence } = await supabase
      .from('market_intelligence')
      .select('*')
      .eq('scan_id', scanId)
      .single()

    // Generate content based on report type
    switch (reportType) {
      case 'executive_summary':
        return {
          scan_overview: {
            name: scan.name,
            status: scan.status,
            created_at: scan.created_at,
            industries: scan.selected_industries,
            regions: scan.selected_regions
          },
          key_metrics: {
            targets_identified: targets?.length || 0,
            targets_analyzed: targets?.filter(t => t.analysis_status === 'completed').length || 0,
            average_score: targets?.reduce((sum, t) => sum + (t.overall_score || 0), 0) / (targets?.length || 1),
            high_potential_targets: targets?.filter(t => t.overall_score >= 70).length || 0
          },
          top_targets: targets?.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0, 5) || [],
          market_insights: marketIntelligence
        }

      case 'detailed_analysis':
        return {
          scan_configuration: scan.config,
          all_targets: targets,
          market_analysis: marketIntelligence,
          risk_summary: {
            high_risk: targets?.filter(t => t.risk_assessments?.[0]?.risk_category === 'high').length || 0,
            medium_risk: targets?.filter(t => t.risk_assessments?.[0]?.risk_category === 'moderate').length || 0,
            low_risk: targets?.filter(t => t.risk_assessments?.[0]?.risk_category === 'low').length || 0
          }
        }

      case 'target_comparison':
        const topTargets = targets?.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0, 10) || []
        return {
          comparison_matrix: topTargets.map(target => ({
            company_name: target.company_name,
            overall_score: target.overall_score,
            financial_health: target.financial_health_score,
            strategic_fit: target.strategic_fit_score,
            risk_score: target.risk_score,
            key_metrics: target.financial_analysis?.[0] || {},
            risk_factors: target.risk_assessments?.[0]?.red_flags || []
          })),
          scoring_methodology: {
            financial_weight: 0.4,
            strategic_weight: 0.35,
            risk_weight: 0.25
          }
        }

      default:
        return {
          report_type: reportType,
          generated_at: new Date().toISOString(),
          data_summary: {
            targets_count: targets?.length || 0,
            scan_status: scan.status
          }
        }
    }
  } catch (error) {
    console.error('Error generating report content:', error)
    return {
      error: 'Failed to generate report content',
      timestamp: new Date().toISOString()
    }
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