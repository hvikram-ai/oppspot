/**
 * GET /api/data-room/summaries/[id]
 *
 * Get a summary with all fields, values, and quality issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSummaryService } from '@/lib/data-room/summaries/summary-service';
import type { GetSummaryResponse } from '@/lib/data-room/summaries/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summaryId = params.id;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get summary with full details
    const summaryService = getSummaryService();
    const summaryData = await summaryService.getSummaryWithFields(summaryId);

    if (!summaryData) {
      return NextResponse.json(
        { error: 'Summary not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the document's data room
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('data_room_id')
      .eq('id', summaryData.document_id)
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

    // Get the run information
    const { data: run } = await supabase
      .from('summary_runs')
      .select('*')
      .eq('id', summaryData.run_id)
      .single();

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
      qualityIssues: summaryData.qualityIssues,
      run: run || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Get summary failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/data-room/summaries/[id]
 *
 * Delete a summary and all related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summaryId = params.id;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get summary to check permissions
    const { data: summary, error: summaryError } = await supabase
      .from('document_summaries')
      .select('document_id')
      .eq('id', summaryId)
      .single();

    if (summaryError || !summary) {
      return NextResponse.json(
        { error: 'Summary not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the document's data room
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('data_room_id')
      .eq('id', summary.document_id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check data room access (must be owner or editor)
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

    if (!['editor', 'owner'].includes(access.permission_level)) {
      return NextResponse.json(
        { error: 'Editor or owner role required to delete summaries' },
        { status: 403 }
      );
    }

    // Delete summary (cascades to field values)
    const { error: deleteError } = await supabase
      .from('document_summaries')
      .delete()
      .eq('id', summaryId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Delete summary failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
