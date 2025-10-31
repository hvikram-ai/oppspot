/**
 * GET /api/companies/[id]/esg/report
 * Generates and downloads ESG PDF report
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { ESGReportDocument } from '@/lib/esg/pdf-generator';
import type { ESGScore, ESGMetric } from '@/types/esg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const supabase = await createClient();

    console.log(`📄 Generating ESG PDF report for company ${companyId}, year ${year}`);

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('businesses')
      .select('id, name, categories')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyName = company.name || 'Unknown Company';

    // Fetch scores
    const { data: scores, error: scoresError } = await supabase
      .from('esg_scores')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', year);

    if (scoresError || !scores || scores.length === 0) {
      return NextResponse.json(
        {
          error: 'No ESG scores found for this period',
          message: 'Run recompute first or upload ESG documents'
        },
        { status: 404 }
      );
    }

    // Fetch metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('esg_metrics')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', year)
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true });

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    // Generate highlights from scores
    const highlights = generateHighlights(scores as ESGScore[], metrics as ESGMetric[]);

    // Create report generation record
    const { data: reportRecord } = await supabase
      .from('esg_reports')
      .insert({
        company_id: companyId,
        period_year: year,
        status: 'running',
        report_url: null
      })
      .select()
      .single();

    console.log('📊 Rendering PDF document...');

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      ESGReportDocument({
        companyName,
        periodYear: year,
        scores: scores as ESGScore[],
        metrics: (metrics || []) as ESGMetric[],
        highlights
      })
    );

    console.log(`✅ PDF generated: ${pdfBuffer.byteLength} bytes`);

    // Update report status
    if (reportRecord) {
      await supabase
        .from('esg_reports')
        .update({
          status: 'success',
          report_url: `/esg-reports/${companyId}_${year}.pdf`,
          completed_at: new Date().toISOString()
        })
        .eq('id', reportRecord.id);
    }

    // Return PDF as downloadable file
    const filename = `ESG_Report_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${year}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString()
      }
    });

  } catch (error) {
    console.error('ESG Report API Error:', error);

    // Try to update report status to error
    try {
      const { id: companyId } = await params;
      const { searchParams } = new URL(request.url);
      const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

      const supabase = await createClient();
      await supabase
        .from('esg_reports')
        .update({
          status: 'error',
          completed_at: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .eq('period_year', year)
        .eq('status', 'running');
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Failed to generate PDF report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate highlights (strengths and weaknesses) from scores
 */
function generateHighlights(
  scores: ESGScore[],
  metrics: ESGMetric[]
): Array<{ type: string; message: string }> {
  const highlights: Array<{ type: string; message: string }> = [];

  // Category scores
  const categoryScores = scores.filter(s => !s.subcategory);

  // Find strengths (leading categories)
  categoryScores
    .filter(s => s.level === 'leading')
    .forEach(score => {
      highlights.push({
        type: 'strength',
        message: `Strong ${score.category} performance with a score of ${score.score.toFixed(0)}/100`
      });
    });

  // Find weaknesses (lagging categories)
  categoryScores
    .filter(s => s.level === 'lagging')
    .forEach(score => {
      highlights.push({
        type: 'weakness',
        message: `${score.category.charAt(0).toUpperCase() + score.category.slice(1)} score of ${score.score.toFixed(0)}/100 is below industry benchmarks`
      });
    });

  // Find top-performing subcategories
  const subcategoryScores = scores.filter(s => s.subcategory);
  const topSubcategories = subcategoryScores
    .filter(s => s.level === 'leading')
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  topSubcategories.forEach(score => {
    highlights.push({
      type: 'strength',
      message: `Excellent ${score.subcategory} performance in ${score.category}`
    });
  });

  // Find areas for improvement
  const weakSubcategories = subcategoryScores
    .filter(s => s.level === 'lagging')
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  weakSubcategories.forEach(score => {
    highlights.push({
      type: 'weakness',
      message: `${score.subcategory} needs improvement (${score.score.toFixed(0)}/100)`
    });
  });

  return highlights.slice(0, 6); // Limit to 6 highlights
}
