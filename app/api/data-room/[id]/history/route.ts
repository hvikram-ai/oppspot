/**
 * Data Room Q&A History API
 * Tasks: T023 (GET), T026 (DELETE)
 *
 * GET /api/data-room/[dataRoomId]/history - Retrieve query history
 * DELETE /api/data-room/[dataRoomId]/history - Delete queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  getHistory,
  deleteQueries,
  deleteAllQueries,
  HistoryError,
} from '@/lib/data-room/qa/history-service';

/**
 * Query parameters validation for GET
 */
const HistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .refine(val => val === undefined || (val >= 1 && val <= 100), {
      message: 'Limit must be between 1 and 100',
    }),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Request body validation for DELETE
 */
const DeleteQueriesSchema = z.object({
  query_ids: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/data-room/[dataRoomId]/history
 * Retrieve paginated query history
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
    let queryParams: z.infer<typeof HistoryQuerySchema>;

    try {
      queryParams = HistoryQuerySchema.parse({
        cursor: searchParams.get('cursor'),
        limit: searchParams.get('limit'),
        order: searchParams.get('order'),
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

    // Fetch history
    const result = await getHistory(user.id, dataRoomId, {
      cursor: queryParams.cursor,
      limit: queryParams.limit,
      order: queryParams.order,
    });

    return NextResponse.json({
      queries: result.queries.map(query => ({
        id: query.id,
        question: query.question,
        answer: query.answer,
        answer_type: query.answerType,
        citations: query.citations,
        metrics: query.metrics,
        feedback: query.feedback,
        created_at: query.createdAt,
        completed_at: query.completedAt,
      })),
      has_more: result.hasMore,
      next_cursor: result.nextCursor,
      total_count: result.totalCount,
    });
  } catch (error) {
    console.error('[History API] Error fetching history:', error);

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
        error: 'Failed to fetch history',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/data-room/[dataRoomId]/history
 * Delete query history (individual or bulk)
 */
export async function DELETE(
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

    // Parse request body
    let body: z.infer<typeof DeleteQueriesSchema>;
    try {
      const rawBody = await req.json();
      body = DeleteQueriesSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { query_ids } = body;

    // Delete queries
    let deletedCount: number;

    if (query_ids && query_ids.length > 0) {
      // Delete specific queries
      deletedCount = await deleteQueries(user.id, query_ids);
    } else {
      // Delete all queries for this user in this data room
      deletedCount = await deleteAllQueries(user.id, dataRoomId);
    }

    return NextResponse.json({
      deleted_count: deletedCount,
      success: true,
    });
  } catch (error) {
    console.error('[History API] Error deleting history:', error);

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
        error: 'Failed to delete history',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
