/**
 * GET /api/data-room/summaries/[id]/export
 *
 * Export a summary in JSON, Excel, or Word format
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExportManager } from '@/lib/data-room/summaries/exporters/export-manager';
import type { ExportFormat } from '@/lib/data-room/summaries/types';
import { isExportFormat } from '@/lib/data-room/summaries/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summaryId = id;
    const searchParams = request.nextUrl.searchParams;

    // Get export options from query params
    const format = searchParams.get('format') || 'json';
    const includeConfidence = searchParams.get('include_confidence') !== 'false';
    const includeEvidence = searchParams.get('include_evidence') === 'true';
    const includeQualityIssues = searchParams.get('include_quality_issues') !== 'false';
    const filename = searchParams.get('filename') || undefined;

    // Validate format
    if (!isExportFormat(format)) {
      return NextResponse.json(
        { error: `Invalid format: ${format}. Must be one of: json, xlsx, docx` },
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

    // Export the summary
    const exportManager = getExportManager();
    const result = await exportManager.export(summaryId, format as ExportFormat, {
      include_confidence: includeConfidence,
      include_evidence: includeEvidence,
      include_quality_issues: includeQualityIssues,
      filename,
    });

    // Return the file
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': result.mimetype,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(result.size),
      },
    });
  } catch (error) {
    console.error('[API] Export summary failed:', error);
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
 * POST /api/data-room/summaries/[id]/export
 *
 * Export with complex options (use POST for larger payloads)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summaryId = id;
    const body = await request.json();

    const {
      format = 'json',
      include_confidence = true,
      include_evidence = false,
      include_quality_issues = true,
      filename,
    } = body;

    // Validate format
    if (!isExportFormat(format)) {
      return NextResponse.json(
        { error: `Invalid format: ${format}. Must be one of: json, xlsx, docx` },
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

    // Export the summary
    const exportManager = getExportManager();
    const result = await exportManager.export(summaryId, format as ExportFormat, {
      include_confidence,
      include_evidence,
      include_quality_issues,
      filename,
    });

    // Return the file
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': result.mimetype,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(result.size),
      },
    });
  } catch (error) {
    console.error('[API] Export summary failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
