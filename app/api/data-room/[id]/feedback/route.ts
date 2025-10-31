/**
 * Data Room Q&A Feedback API
 * Task: T024
 *
 * POST /api/data-room/[dataRoomId]/feedback
 * Submit or update feedback (helpful/not_helpful) on query responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  submitFeedback,
  FeedbackError,
  isValidRating,
  type FeedbackRating,
} from '@/lib/data-room/qa/feedback-service';

/**
 * Request body validation schema
 */
const FeedbackRequestSchema = z.object({
  query_id: z.string().uuid('Invalid query ID format'),
  rating: z.enum(['helpful', 'not_helpful'], {
    errorMap: () => ({ message: 'Rating must be "helpful" or "not_helpful"' }),
  }),
  comment: z
    .string()
    .max(2000, 'Comment must be at most 2000 characters')
    .optional(),
});

/**
 * POST /api/data-room/[dataRoomId]/feedback
 * Submit or update feedback for a query
 */
export async function POST(
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

    // Parse and validate request body
    let body: z.infer<typeof FeedbackRequestSchema>;
    try {
      const rawBody = await req.json();
      body = FeedbackRequestSchema.parse(rawBody);
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

    const { query_id, rating, comment } = body;

    // Verify the query exists and belongs to the user
    const { data: query } = await supabase
      .from('qa_queries')
      .select('id, user_id, data_room_id')
      .eq('id', query_id)
      .maybeSingle();

    if (!query) {
      return NextResponse.json(
        {
          error: 'Query not found',
          code: 'QUERY_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (query.user_id !== user.id) {
      return NextResponse.json(
        {
          error: 'You can only provide feedback on your own queries',
          code: 'ACCESS_DENIED',
        },
        { status: 403 }
      );
    }

    if (query.data_room_id !== dataRoomId) {
      return NextResponse.json(
        {
          error: 'Query does not belong to this data room',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Submit feedback
    const feedback = await submitFeedback(query_id, user.id, {
      rating: rating as FeedbackRating,
      comment,
    });

    return NextResponse.json(
      {
        success: true,
        feedback: {
          id: feedback.id,
          query_id: feedback.queryId,
          rating: feedback.rating,
          comment: feedback.comment,
          created_at: feedback.createdAt,
          updated_at: feedback.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Feedback API] Error submitting feedback:', error);

    if (error instanceof FeedbackError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 400;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to submit feedback',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
