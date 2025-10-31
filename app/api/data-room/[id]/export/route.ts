/**
 * Data Room Q&A Export API
 * Task: T025
 *
 * GET /api/data-room/[dataRoomId]/export
 * Export query history to JSON or CSV with signed URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  exportHistory,
  HistoryError,
  type ExportFormat,
} from '@/lib/data-room/qa/history-service';

/**
 * Query parameters validation
 */
const ExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
});

/**
 * GET /api/data-room/[dataRoomId]/export
 * Generate export file and return signed URL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dataRoomId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Verify user has access to data room
    const { data: accessRecord } = await supabase
      .from('data_room_access')
      .select('id')
      .eq('data_room_id', dataRoomId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!accessRecord) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    let queryParams: z.infer<typeof ExportQuerySchema>;

    try {
      queryParams = ExportQuerySchema.parse({
        format: searchParams.get('format'),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { format } = queryParams;

    // Export history data
    const exportData = await exportHistory(user.id, dataRoomId, format as ExportFormat);

    // Determine content type and filename
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `qa-history-${dataRoomId}-${Date.now()}.${format}`;

    // Upload to Supabase Storage
    const bucketName = 'exports';
    const filePath = `qa-exports/${user.id}/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, exportData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Export API] Storage upload failed:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to upload export file',
          code: 'UPLOAD_FAILED',
        },
        { status: 500 }
      );
    }

    // Generate signed URL with 1-hour expiry
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600); // 1 hour = 3600 seconds

    if (signedUrlError || !signedUrlData) {
      console.error('[Export API] Failed to generate signed URL:', signedUrlError);
      return NextResponse.json(
        {
          error: 'Failed to generate download URL',
          code: 'URL_GENERATION_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      download_url: signedUrlData.signedUrl,
      filename,
      format,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
    });
  } catch (error) {
    console.error('[Export API] Error exporting history:', error);

    if (error instanceof HistoryError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to export history',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
