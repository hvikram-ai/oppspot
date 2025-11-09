/**
 * Competitive Analysis Export API
 * Endpoint: GET /api/competitive-analysis/[id]/export?format=pdf|excel
 * Generates and downloads competitive analysis reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository'
import { validateUUID } from '@/lib/competitive-analysis/validation'
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/competitive-analysis/errors'
import { generateCompetitiveAnalysisPDF } from '@/lib/competitive-analysis/exporters/pdf-exporter'
import { generateCompetitiveAnalysisExcel } from '@/lib/competitive-analysis/exporters/excel-exporter'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'

    // Validate format
    if (!['pdf', 'excel', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf, excel, or xlsx' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new UnauthorizedError()
    }

    // Validate UUID format
    const id = validateUUID(params.id, 'Analysis ID')

    // Check access permissions
    const hasAccess = await competitiveAnalysisRepository.checkUserAccess(id, user.id)

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to export this analysis')
    }

    // Get competitive analysis
    const analysis = await competitiveAnalysisRepository.findById(id)

    if (!analysis) {
      throw new NotFoundError('Analysis', id)
    }

    // Fetch all related data
    const [competitors, featureMatrix, pricingComparisons, moatScore] = await Promise.all([
      competitiveAnalysisRepository.getCompetitors(id),
      competitiveAnalysisRepository.getFeatureMatrix(id),
      competitiveAnalysisRepository.getPricingComparisons(id),
      competitiveAnalysisRepository.getMoatScore(id),
    ])

    const exportData = {
      analysis,
      competitors,
      featureMatrix,
      pricingComparisons,
      moatScores: moatScore ? [moatScore] : [], // Convert single score to array
    }

    // Generate export based on format
    let buffer: Buffer
    let contentType: string
    let filename: string

    if (format === 'pdf') {
      buffer = await generateCompetitiveAnalysisPDF(exportData)
      contentType = 'application/pdf'
      filename = `competitive-analysis-${analysis.target_company_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf`
    } else {
      // Excel format
      buffer = await generateCompetitiveAnalysisExcel(exportData)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      filename = `competitive-analysis-${analysis.target_company_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}-${Date.now()}.xlsx`
    }

    // Return file as download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    const { statusCode, body } = handleError(error)
    return NextResponse.json(body, { status: statusCode })
  }
}
