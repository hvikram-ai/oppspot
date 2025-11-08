/**
 * POST /api/data-room/summaries/run
 *
 * Trigger summary extraction for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSummaryService } from '@/lib/data-room/summaries/summary-service';
import type { RunSummaryRequest, RunSummaryResponse } from '@/lib/data-room/summaries/types';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { documentId, templateKey, force } = body as RunSummaryRequest & { documentId: string };

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Verify user has access to the document's data room
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, data_room_id')
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

    // Check if user has editor or owner permission
    if (!['editor', 'owner'].includes(access.permission_level)) {
      return NextResponse.json(
        { error: 'Editor or owner role required to run summaries' },
        { status: 403 }
      );
    }

    // Optional: Load document chunks if available (for vector search)
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id, document_id, page_number, chunk_index, content, start_char, end_char, embedding')
      .eq('document_id', documentId);

    // Optional: Load existing contract extractions if available
    const { data: extractions } = await supabase
      .from('contract_extractions')
      .select('*')
      .eq('document_id', documentId)
      .single();

    // Run summarization
    const summaryService = getSummaryService();
    const result = await summaryService.summarize(documentId, {
      templateKey,
      userId: user.id,
      force,
      existingExtractions: extractions || undefined,
      documentChunks: chunks || undefined,
    });

    // Build response
    const response: RunSummaryResponse = {
      runId: result.run.id,
      status: result.run.status,
      message: result.success
        ? 'Summary extraction completed'
        : `Summary extraction failed: ${result.error}`,
    };

    const statusCode = result.success ? 200 : 500;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('[API] Summary run failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
