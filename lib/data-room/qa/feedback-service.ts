/**
 * Feedback Service
 * Task: T021
 *
 * Manages user feedback (helpful/not_helpful ratings) on Q&A responses.
 * Implements upsert logic allowing users to change their ratings.
 * Reference: data-model.md section 5 (qa_feedback entity)
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Feedback rating type
 */
export type FeedbackRating = 'helpful' | 'not_helpful';

/**
 * Feedback record
 */
export interface Feedback {
  id: string;
  queryId: string;
  userId: string;
  rating: FeedbackRating;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feedback submission options
 */
export interface SubmitFeedbackOptions {
  rating: FeedbackRating;
  comment?: string;
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  totalFeedback: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number;
  withComments: number;
}

/**
 * Maximum comment length
 */
const MAX_COMMENT_LENGTH = 2000;

/**
 * Submit or update feedback for a query
 *
 * @param queryId - Query ID
 * @param userId - User ID
 * @param options - Feedback options
 * @returns Created or updated feedback record
 *
 * @example
 * ```typescript
 * // Submit helpful rating
 * await submitFeedback(queryId, userId, {
 *   rating: 'helpful',
 *   comment: 'Great answer, very detailed!'
 * });
 *
 * // Change to not_helpful
 * await submitFeedback(queryId, userId, {
 *   rating: 'not_helpful',
 *   comment: 'Missing key information'
 * });
 * ```
 */
export async function submitFeedback(
  queryId: string,
  userId: string,
  options: SubmitFeedbackOptions
): Promise<Feedback> {
  const { rating, comment } = options;

  // Validate comment length
  if (comment && comment.length > MAX_COMMENT_LENGTH) {
    throw new FeedbackError(
      `Comment must be ${MAX_COMMENT_LENGTH} characters or less`,
      'INVALID_INPUT'
    );
  }

  const supabase = await createClient();

  // Verify the query belongs to the user
  const { data: query, error: queryError } = await supabase
    .from('qa_queries')
    .select('id, user_id')
    .eq('id', queryId)
    .single();

  if (queryError || !query) {
    throw new FeedbackError(
      'Query not found',
      'QUERY_NOT_FOUND'
    );
  }

  if (query.user_id !== userId) {
    throw new FeedbackError(
      'You can only provide feedback on your own queries',
      'ACCESS_DENIED'
    );
  }

  // Upsert feedback (insert or update if exists)
  const { data, error } = await supabase
    .from('qa_feedback')
    .upsert(
      {
        query_id: queryId,
        user_id: userId,
        rating,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'query_id,user_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new FeedbackError(
      `Failed to submit feedback: ${error.message}`,
      'SUBMISSION_FAILED',
      error
    );
  }

  return {
    id: data.id,
    queryId: data.query_id,
    userId: data.user_id,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get feedback for a specific query
 *
 * @param queryId - Query ID
 * @param userId - User ID
 * @returns Feedback if exists, null otherwise
 */
export async function getFeedback(
  queryId: string,
  userId: string
): Promise<Feedback | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_feedback')
    .select('*')
    .eq('query_id', queryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new FeedbackError(
      `Failed to get feedback: ${error.message}`,
      'FETCH_FAILED',
      error
    );
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    queryId: data.query_id,
    userId: data.user_id,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Delete feedback for a query
 *
 * @param queryId - Query ID
 * @param userId - User ID
 * @returns True if deleted, false if not found
 */
export async function deleteFeedback(
  queryId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_feedback')
    .delete()
    .eq('query_id', queryId)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    throw new FeedbackError(
      `Failed to delete feedback: ${error.message}`,
      'DELETE_FAILED',
      error
    );
  }

  return data && data.length > 0;
}

/**
 * Get feedback statistics for a data room
 *
 * @param dataRoomId - Data room ID
 * @returns Feedback statistics
 *
 * @example
 * ```typescript
 * const stats = await getFeedbackStats(dataRoomId);
 * console.log(`Helpful rate: ${stats.helpfulPercentage}%`);
 * ```
 */
export async function getFeedbackStats(
  dataRoomId: string
): Promise<FeedbackStats> {
  const supabase = await createClient();

  // Get all feedback for queries in this data room
  const { data, error } = await supabase
    .from('qa_feedback')
    .select(`
      rating,
      comment,
      query:qa_queries!inner (
        data_room_id
      )
    `)
    .eq('query.data_room_id', dataRoomId);

  if (error) {
    throw new FeedbackError(
      `Failed to get feedback stats: ${error.message}`,
      'FETCH_FAILED',
      error
    );
  }

  if (!data || data.length === 0) {
    return {
      totalFeedback: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      helpfulPercentage: 0,
      withComments: 0,
    };
  }

  interface FeedbackRow {
    rating: 'helpful' | 'not_helpful';
    comment?: string | null;
  }

  const totalFeedback = data.length;
  const helpfulCount = data.filter((f: FeedbackRow) => f.rating === 'helpful').length;
  const notHelpfulCount = data.filter((f: FeedbackRow) => f.rating === 'not_helpful').length;
  const withComments = data.filter((f: FeedbackRow) => f.comment && f.comment.trim() !== '').length;
  const helpfulPercentage = (helpfulCount / totalFeedback) * 100;

  return {
    totalFeedback,
    helpfulCount,
    notHelpfulCount,
    helpfulPercentage: Math.round(helpfulPercentage * 10) / 10,
    withComments,
  };
}

/**
 * Get all feedback with comments for a data room (for analysis)
 *
 * @param dataRoomId - Data room ID
 * @param rating - Optional filter by rating
 * @returns Array of feedback with comments
 */
export async function getFeedbackWithComments(
  dataRoomId: string,
  rating?: FeedbackRating
): Promise<Array<{
  queryId: string;
  question: string;
  answer: string;
  rating: FeedbackRating;
  comment: string;
  createdAt: string;
}>> {
  const supabase = await createClient();

  let query = supabase
    .from('qa_feedback')
    .select(`
      query_id,
      rating,
      comment,
      created_at,
      query:qa_queries!inner (
        data_room_id,
        question,
        answer
      )
    `)
    .eq('query.data_room_id', dataRoomId)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false });

  if (rating) {
    query = query.eq('rating', rating);
  }

  const { data, error } = await query;

  if (error) {
    throw new FeedbackError(
      `Failed to get feedback with comments: ${error.message}`,
      'FETCH_FAILED',
      error
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  interface FeedbackWithQuery {
    query_id: string;
    rating: FeedbackRating;
    comment: string;
    created_at: string;
    query: { question: string; answer: string | null };
  }

  return data.map((f: FeedbackWithQuery) => ({
    queryId: f.query_id,
    question: f.query.question,
    answer: f.query.answer || '',
    rating: f.rating,
    comment: f.comment,
    createdAt: f.created_at,
  }));
}

/**
 * Get recent feedback (last N items)
 *
 * @param dataRoomId - Data room ID
 * @param limit - Number of items to retrieve (default: 10)
 * @returns Recent feedback items
 */
export async function getRecentFeedback(
  dataRoomId: string,
  limit: number = 10
): Promise<Array<{
  queryId: string;
  rating: FeedbackRating;
  comment?: string;
  createdAt: string;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_feedback')
    .select(`
      query_id,
      rating,
      comment,
      created_at,
      query:qa_queries!inner (
        data_room_id
      )
    `)
    .eq('query.data_room_id', dataRoomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new FeedbackError(
      `Failed to get recent feedback: ${error.message}`,
      'FETCH_FAILED',
      error
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  interface RecentFeedbackRow {
    query_id: string;
    rating: FeedbackRating;
    comment?: string | null;
    created_at: string;
  }

  return data.map((f: RecentFeedbackRow) => ({
    queryId: f.query_id,
    rating: f.rating,
    comment: f.comment,
    createdAt: f.created_at,
  }));
}

/**
 * Validate feedback rating
 */
export function isValidRating(rating: string): rating is FeedbackRating {
  return rating === 'helpful' || rating === 'not_helpful';
}

/**
 * Validate feedback comment
 */
export function isValidComment(comment: string | undefined): boolean {
  if (!comment) return true;
  return comment.length <= MAX_COMMENT_LENGTH;
}

/**
 * Custom error class for feedback operations
 */
export class FeedbackError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'QUERY_NOT_FOUND'
      | 'ACCESS_DENIED'
      | 'SUBMISSION_FAILED'
      | 'FETCH_FAILED'
      | 'DELETE_FAILED',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FeedbackError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FeedbackError);
    }
  }
}

/**
 * Constants export
 */
export const CONSTANTS = {
  MAX_COMMENT_LENGTH,
  VALID_RATINGS: ['helpful', 'not_helpful'] as const,
} as const;
