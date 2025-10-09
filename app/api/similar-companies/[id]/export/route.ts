/**
 * Similar Companies Export API Routes
 * Export similarity analysis results in various formats for MnA presentations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSimilarityAnalysisPDF } from '@/lib/pdf/services/similarity-pdf-generator'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

type DbClient = SupabaseClient<Database>

interface CompanyMatch {
  company_name: string
  overall_score: number
  confidence: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  market_position?: string
  company_data?: {
    country?: string
    industryCodes?: string[]
  }
}

// POST: Generate export in specified format
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: analysisId } = await params

    // Check authentication (allow demo mode)
    const isDemoMode = analysisId.startsWith('demo-') || analysisId === 'demo'
    
    let user = null
    if (!isDemoMode) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    } else {
      // Demo mode user
      user = { 
        id: 'demo-user', 
        email: 'demo@oppspot.com',
        user_metadata: { full_name: 'Demo User' }
      }
    }

    const body = await request.json()
    const {
      exportType = 'executive_summary',
      exportFormat = 'pdf',
      includeDetails = true,
      maxMatches = 10,
      templateVersion = 'v1.0'
    } = body

    // Validate export type
    const validExportTypes = [
      'executive_summary',
      'detailed_comparison',
      'presentation_slides',
      'excel_workbook',
      'due_diligence_pack',
      'csv_data'
    ]
    
    if (!validExportTypes.includes(exportType)) {
      return NextResponse.json(
        { error: `Export type must be one of: ${validExportTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate export format
    const validFormats = ['pdf', 'pptx', 'xlsx', 'csv', 'json']
    if (!validFormats.includes(exportFormat)) {
      return NextResponse.json(
        { error: `Export format must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // Get analysis data (handle demo mode)
    type AnalysisData = Row<'similarity_analyses'> & {
      similar_company_matches?: Array<{
        company_name: string;
        overall_score: number;
        [key: string]: any;
      }>;
      [key: string]: any;
    }
    let analysis: AnalysisData | null
    if (!isDemoMode) {
      // Only fetch from database for non-demo mode
      const { data: fetchedAnalysis, error: fetchError } = await supabase
        .from('similarity_analyses')
        .select(`
          *,
          similar_company_matches!inner(
            *,
            similarity_explanations(*)
          )
        `)
        .eq('id', analysisId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !fetchedAnalysis) {
        return NextResponse.json(
          { error: 'Analysis not found or access denied' },
          { status: 404 }
        )
      }

      const typedAnalysis = fetchedAnalysis as AnalysisData
      if (typedAnalysis.status !== 'completed') {
        return NextResponse.json(
          { error: 'Analysis must be completed before export' },
          { status: 400 }
        )
      }

      analysis = typedAnalysis
    } else {
      // For demo mode, let PDF generator handle the demo data
      // Just provide minimal structure that PDF generator expects
      analysis = null
    }

    // For PDF exports in demo mode, pass directly to PDF generator
    if (exportFormat === 'pdf' && isDemoMode) {
      return await generatePDFExport(supabase, analysisId, null, user.id)
    }

    // Prepare export data
    const matches = analysis?.similar_company_matches || []
    const topMatches = matches
      .sort((a, b) => (b as CompanyMatch).overall_score - (a as CompanyMatch).overall_score)
      .slice(0, maxMatches)

    const exportData = {
      analysis: {
        id: analysis?.id,
        targetCompany: (analysis as any)?.target_company_name,
        targetCompanyData: (analysis as any)?.target_company_data,
        configuration: (analysis as any)?.analysis_configuration,
        summary: {
          totalCompanies: (analysis as any)?.total_companies_analyzed,
          averageScore: (analysis as any)?.average_similarity_score,
          topScore: (analysis as any)?.top_similarity_score,
          analysisDate: analysis?.created_at,
          completionTime: (analysis as any)?.completed_at
        },
        insights: {
          executiveSummary: (analysis as any)?.executive_summary,
          keyOpportunities: (analysis as any)?.key_opportunities || [],
          riskHighlights: (analysis as any)?.risk_highlights || [],
          strategicRecommendations: (analysis as any)?.strategic_recommendations || []
        }
      },
      matches: topMatches,
      metadata: {
        exportType,
        exportFormat,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
        templateVersion,
        includeDetails
      }
    }

    // Generate export content based on format
    let exportContent: string | Buffer
    let fileName: string
    let contentType: string

    switch (exportFormat) {
      case 'json':
        exportContent = JSON.stringify(exportData, null, 2)
        fileName = `similar-companies-${(analysis as any)?.target_company_name || 'analysis'}-${analysisId.slice(0, 8)}.json`
        contentType = 'application/json'
        break

      case 'csv':
        exportContent = generateCSV(topMatches)
        fileName = `similar-companies-${(analysis as any)?.target_company_name || 'analysis'}-${analysisId.slice(0, 8)}.csv`
        contentType = 'text/csv'
        break

      case 'pdf':
        // For PDF generation, we'll return a response indicating the export is being generated
        return await generatePDFExport(supabase, analysisId, exportData, user.id)

      case 'pptx':
        // For PowerPoint generation, we'll return a response indicating the export is being generated
        return await generatePowerPointExport(supabase, analysisId, exportData, user.id)

      case 'xlsx':
        // For Excel generation, we'll return a response indicating the export is being generated
        return await generateExcelExport(supabase, analysisId, exportData, user.id)

      default:
        exportContent = JSON.stringify(exportData, null, 2)
        fileName = `similar-companies-${(analysis as any)?.target_company_name || 'analysis'}.json`
        contentType = 'application/json'
    }

    // For immediate exports (JSON, CSV), return the content directly
    if (exportFormat === 'json' || exportFormat === 'csv') {
      return new NextResponse(exportContent, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    }

    // This shouldn't be reached due to the switch statement, but just in case
    return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate export',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}

// GET: Check export status or download completed export
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: analysisId } = await params
    const searchParams = request.nextUrl.searchParams
    const exportId = searchParams.get('exportId')

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (exportId) {
      // Get specific export status
      const { data: exportRecord, error } = await supabase
        .from('similarity_analysis_exports')
        .select('*')
        .eq('id', exportId)
        .eq('similarity_analysis_id', analysisId)
        .eq('user_id', user.id)
        .single()

      if (error || !exportRecord) {
        return NextResponse.json(
          { error: 'Export not found or access denied' },
          { status: 404 }
        )
      }

      const typedRecord = exportRecord as any
      if (typedRecord.generation_status === 'completed' && typedRecord.file_path) {
        // Return download link or file content
        return NextResponse.json({
          export: exportRecord,
          status: 'completed',
          downloadUrl: `/api/similar-companies/${analysisId}/export/download?exportId=${exportId}`,
          message: 'Export ready for download'
        })
      }

      return NextResponse.json({
        export: {
          id: typedRecord.id,
          type: typedRecord.export_type,
          format: typedRecord.export_format,
          status: typedRecord.generation_status,
          progress: typedRecord.generation_status === 'generating' ? 'In progress' : 'Queued'
        },
        message: getExportStatusMessage(typedRecord.generation_status)
      })

    } else {
      // List all exports for this analysis
      const { data: exports, error } = await supabase
        .from('similarity_analysis_exports')
        .select('*')
        .eq('similarity_analysis_id', analysisId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({
        exports: exports || [],
        analysisId
      })
    }

  } catch (error) {
    console.error('Error retrieving export status:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve export status',
        details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Helper functions

function generateCSV(matches: CompanyMatch[]): string {
  const headers = [
    'Rank',
    'Company Name',
    'Overall Score',
    'Confidence',
    'Financial Score',
    'Strategic Score',
    'Operational Score',
    'Market Score',
    'Risk Score',
    'Market Position',
    'Country',
    'Industry'
  ]

  const rows = matches.map((match, index) => [
    index + 1,
    `"${match.company_name}"`,
    match.overall_score.toFixed(2),
    (match.confidence * 100).toFixed(1) + '%',
    match.financial_score.toFixed(2),
    match.strategic_score.toFixed(2),
    match.operational_score.toFixed(2),
    match.market_score.toFixed(2),
    match.risk_score.toFixed(2),
    match.market_position || 'N/A',
    match.company_data?.country || 'N/A',
    match.company_data?.industryCodes?.[0] || 'N/A'
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

async function generatePDFExport(
  supabase: DbClient,
  analysisId: string,
  exportData: unknown,
  userId: string
): Promise<NextResponse> {
  try {
    // Generate PDF using our new service
    const { buffer, filename, contentType } = await generateSimilarityAnalysisPDF(
      analysisId,
      userId,
      {
        exportType: 'executive_summary',
        includeDetails: true,
        maxMatches: 25
      }
    )

    // Return PDF directly as download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    
    // Fallback: Create export record for background processing
    const { data: exportRecord } = await supabase
      .from('similarity_analysis_exports')
      .insert({
        similarity_analysis_id: analysisId,
        user_id: userId,
        export_type: 'executive_summary',
        export_format: 'pdf',
        export_title: `Similar Companies Analysis - ${exportData.analysis.targetCompany || 'Unknown'}`,
        export_description: 'Executive summary of similar company analysis for MnA evaluation',
        export_content: exportData,
        generation_status: 'failed',
        template_version: 'v1.0',
        error_message: getErrorMessage(error)
      } as any)
      .select()
      .single() as { data: (Record<string, unknown> & { id: string }) | null; error: any }

    return NextResponse.json({
      error: 'PDF generation temporarily unavailable',
      message: 'Please try again in a few minutes or contact support',
      exportId: exportRecord?.id,
      details: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    }, { status: 500 })
  }
}

async function generatePowerPointExport(
  supabase: DbClient,
  analysisId: string,
  exportData: { analysis: { targetCompany?: string } },
  userId: string
): Promise<NextResponse> {
  // Create export record
  const { data: exportRecord, error } = await supabase
    .from('similarity_analysis_exports')
    .insert({
      similarity_analysis_id: analysisId,
      user_id: userId,
      export_type: 'presentation_slides',
      export_format: 'pptx',
      export_title: `MnA Similar Companies Presentation - ${exportData.analysis.targetCompany || 'Unknown'}`,
      export_description: 'PowerPoint presentation for MnA committee review',
      export_content: exportData,
      generation_status: 'pending',
      template_version: 'v1.0'
    } as any)
    .select()
    .single() as { data: (Record<string, unknown> & { id: string }) | null; error: any }

  if (error) {
    throw new Error(`Failed to create export record: ${getErrorMessage(error)}`)
  }

  return NextResponse.json({
    exportId: exportRecord!.id,
    status: 'generating',
    message: 'PowerPoint export is being generated. Check back in a few minutes.',
    estimatedCompletion: '3-5 minutes',
    checkUrl: `/api/similar-companies/${analysisId}/export?exportId=${exportRecord!.id}`
  }, { status: 202 })
}

async function generateExcelExport(
  supabase: DbClient,
  analysisId: string,
  exportData: { analysis: { targetCompany?: string } },
  userId: string
): Promise<NextResponse> {
  // Create export record
  const { data: exportRecord, error } = await supabase
    .from('similarity_analysis_exports')
    .insert({
      similarity_analysis_id: analysisId,
      user_id: userId,
      export_type: 'excel_workbook',
      export_format: 'xlsx',
      export_title: `Similar Companies Data - ${exportData.analysis.targetCompany || 'Unknown'}`,
      export_description: 'Detailed Excel workbook with similarity analysis data',
      export_content: exportData,
      generation_status: 'pending',
      template_version: 'v1.0'
    } as any)
    .select()
    .single() as { data: (Record<string, unknown> & { id: string }) | null; error: any }

  if (error) {
    throw new Error(`Failed to create export record: ${getErrorMessage(error)}`)
  }

  return NextResponse.json({
    exportId: exportRecord!.id,
    status: 'generating',
    message: 'Excel export is being generated. Check back in a few minutes.',
    estimatedCompletion: '1-2 minutes',
    checkUrl: `/api/similar-companies/${analysisId}/export?exportId=${exportRecord!.id}`
  }, { status: 202 })
}

function getExportStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Export queued for generation'
    case 'generating':
      return 'Export is being generated'
    case 'completed':
      return 'Export completed successfully'
    case 'failed':
      return 'Export generation failed'
    default:
      return 'Processing export'
  }
}