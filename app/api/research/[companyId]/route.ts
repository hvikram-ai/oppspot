/**
 * Research API Routes
 *
 * POST /api/research/[companyId] - Initiate research generation
 * GET /api/research/[companyId] - Get existing research report
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchGPTService } from '@/lib/research-gpt/research-gpt-service';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ResearchRequestSchema = z.object({
  focus_areas: z.array(z.string()).optional(),
  user_context: z.string().optional(),
});

// ============================================================================
// POST - Initiate Research Generation
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to generate research' },
        { status: 401 }
      );
    }

    const { companyId } = await params;

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    // Parse request body (optional)
    let requestBody: { focus_areas?: string[]; user_context?: string } = {};
    try {
      const body = await request.json();
      const validated = ResearchRequestSchema.parse(body);
      requestBody = validated;
    } catch {
      // Body is optional, continue without it
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('businesses')
      .select('id, name, company_number, website')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found', message: `No company found with ID: ${companyId}` },
        { status: 404 }
      );
    }

    // Check quota before generating
    const service = getResearchGPTService();
    const quota = await service.getQuota(user.id);

    if (quota.researches_used >= quota.researches_limit && !forceRefresh) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: 'You have reached your monthly research limit',
          quota: {
            researches_used: quota.researches_used,
            researches_limit: quota.researches_limit,
            researches_remaining: 0,
          },
        },
        { status: 403 }
      );
    }

    // Initiate research generation (async)
    const report = await service.generateResearch({
      user_id: user.id,
      company_id: company.id,
      company_name: company.name,
      company_number: company.company_number,
      website_url: company.website,
      force_refresh: forceRefresh,
      user_context: requestBody.user_context,
      focus_areas: requestBody.focus_areas,
    });

    // Get updated quota
    const updatedQuota = await service.getQuota(user.id);

    // Return 202 Accepted with report ID and poll URL
    return NextResponse.json(
      {
        report_id: report.id,
        status: report.status,
        estimated_completion_seconds: 30,
        poll_url: `/api/research/${report.id}`,
        quota: {
          researches_used: updatedQuota.researches_used,
          researches_limit: updatedQuota.researches_limit,
          researches_remaining: updatedQuota.researches_limit - updatedQuota.researches_used,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Research generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('quota exceeded')) {
        return NextResponse.json(
          { error: 'Quota exceeded', message: error.message },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Research generation failed', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Retrieve Research Report
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to view research' },
        { status: 401 }
      );
    }

    const { companyId: reportId } = await params;

    // Get complete report with all sections
    const service = getResearchGPTService();
    const result = await service.getCompleteReport(reportId, user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Report not found', message: `No report found with ID: ${reportId}` },
        { status: 404 }
      );
    }

    const { report, sections, sources } = result;

    // Format sections by type
    const sectionsByType: Record<string, any> = {};
    for (const section of sections) {
      sectionsByType[section.section_type] = {
        ...section.content,
        confidence: section.confidence,
        cached_at: section.cached_at,
        expires_at: section.expires_at,
        generation_time_ms: section.generation_time_ms,
      };
    }

    // Return complete report
    return NextResponse.json(
      {
        id: report.id,
        company_id: report.company_id,
        company_name: report.company_name,
        status: report.status,
        sections_complete: report.sections_complete,
        total_sources: report.total_sources,
        confidence_score: report.confidence_score,
        generated_at: report.generated_at,
        cached_until: report.cached_until,
        sections: sectionsByType,
        sources: sources.map((s) => ({
          url: s.url,
          title: s.title,
          source_type: s.source_type,
          reliability_score: s.reliability_score,
          published_date: s.published_date,
          accessed_date: s.accessed_date,
        })),
        metadata: report.metadata,
      },
      { status: report.status === 'complete' ? 200 : 202 }
    );
  } catch (error) {
    console.error('Research retrieval error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve report', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
