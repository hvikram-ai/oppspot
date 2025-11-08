/**
 * GET /api/data-room/summaries?documentId=xxx
 *
 * Get the latest summary for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSummaryService } from '@/lib/data-room/summaries/summary-service';
import type { GetSummaryResponse } from '@/lib/data-room/summaries/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId query parameter is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to the document's data room
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('data_room_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check data room access
    const { data: access, error: accessError } = await supabase
      .from('data_room_access')
      .select('permission_level')
      .eq('data_room_id', document.data_room_id)
      .eq('user_id', user.id)
      .single();

    if (accessError || !access) {
      return NextResponse.json(
        { error: 'Access denied to this data room' },
        { status: 403 }
      );
    }

    // Get the latest summary for this document
    const { data: summaries, error: summariesError } = await supabase
      .from('document_summaries')
      .select(`
        *,
        run:summary_runs!summary_runs_id_fkey(*)
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (summariesError) {
      throw summariesError;
    }

    // No summary found
    if (!summaries || summaries.length === 0) {
      return NextResponse.json({ summary: null });
    }

    const latestSummary = summaries[0];

    // Get full summary details using the service
    const summaryService = getSummaryService();
    const summaryData = await summaryService.getSummaryWithFields(latestSummary.id);

    if (!summaryData) {
      return NextResponse.json({ summary: null });
    }

    // Build response
    const response: GetSummaryResponse = {
      summary: {
        id: summaryData.id,
        run_id: summaryData.run_id,
        document_id: summaryData.document_id,
        template_id: summaryData.template_id,
        coverage: summaryData.coverage,
        avg_confidence: summaryData.avg_confidence,
        quality_pass: summaryData.quality_pass,
        created_at: summaryData.created_at,
      },
      template: summaryData.template,
      fields: summaryData.fields,
      values: summaryData.values,
      qualityIssues: summaryData.qualityIssues,
      run: latestSummary.run || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Get summary by document failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
