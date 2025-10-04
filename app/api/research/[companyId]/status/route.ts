/**
 * Research Status API
 *
 * GET /api/research/[companyId]/status - Get research generation progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchGPTService } from '@/lib/research-gpt/research-gpt-service';

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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { companyId: reportId } = await params;

    // Get progress
    const service = getResearchGPTService();
    const progress = await service.getProgress(reportId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get full report for complete status
    if (progress.status === 'complete') {
      const result = await service.getCompleteReport(reportId, user.id);

      if (!result) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      const { report, sections } = result;

      return NextResponse.json({
        report_id: report.id,
        status: 'complete',
        sections_complete: 6,
        total_sections: 6,
        confidence_score: report.confidence_score,
        total_sources: report.total_sources,
        generated_at: report.generated_at,
        cached_until: report.cached_until,
        sections: sections.map((s) => ({
          section_type: s.section_type,
          status: 'complete',
          confidence: s.confidence,
        })),
      });
    }

    // Return progress for generating reports
    return NextResponse.json({
      report_id: progress.report_id,
      status: progress.status,
      sections_complete: progress.sections_complete,
      total_sections: progress.total_sections,
      estimated_completion_seconds: progress.estimated_completion_seconds,
      current_step: progress.current_step,
    });
  } catch (error) {
    console.error('Status check error:', error);

    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
