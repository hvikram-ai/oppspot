/**
 * Query History Service
 * Task: T020
 *
 * Manages query history retrieval, export, and deletion for GDPR compliance.
 * Implements cursor-based pagination and supports JSON/CSV export formats.
 * Reference: research.md section 8 (query history storage)
 */

import { createClient } from '@/lib/supabase/server';
import type { Citation } from './citation-generator';

/**
 * Historical query record
 */
export interface HistoricalQuery {
  id: string;
  question: string;
  answer: string | null;
  answerType: 'grounded' | 'insufficient_evidence' | 'error';
  citations: Citation[];
  metrics: {
    retrievalTimeMs: number;
    llmTimeMs: number;
    totalTimeMs: number;
    chunksRetrieved: number;
  };
  feedback?: {
    rating: 'helpful' | 'not_helpful';
    comment?: string;
  };
  createdAt: string;
  completedAt: string | null;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;           // Page size (default: 20, max: 100)
  cursor?: string;          // Cursor for next page (created_at ISO timestamp)
  order?: 'asc' | 'desc';   // Sort order (default: desc)
}

/**
 * History result with pagination
 */
export interface HistoryResult {
  queries: HistoricalQuery[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}

/**
 * Export format
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Default pagination settings
 */
const DEFAULT_PAGINATION: Required<Omit<PaginationOptions, 'cursor'>> = {
  limit: 20,
  order: 'desc',
};

const MAX_LIMIT = 100;

/**
 * Get query history for a user in a data room
 *
 * @param userId - User ID
 * @param dataRoomId - Data room ID
 * @param options - Pagination options
 * @returns Paginated history result
 *
 * @example
 * ```typescript
 * const history = await getHistory(userId, dataRoomId, { limit: 20 });
 *
 * for (const query of history.queries) {
 *   console.log(`Q: ${query.question}`);
 *   console.log(`A: ${query.answer}`);
 * }
 *
 * if (history.hasMore) {
 *   const nextPage = await getHistory(userId, dataRoomId, {
 *     cursor: history.nextCursor
 *   });
 * }
 * ```
 */
export async function getHistory(
  userId: string,
  dataRoomId: string,
  options: PaginationOptions = {}
): Promise<HistoryResult> {
  const {
    limit = DEFAULT_PAGINATION.limit,
    cursor,
    order = DEFAULT_PAGINATION.order,
  } = options;

  // Enforce max limit
  const effectiveLimit = Math.min(limit, MAX_LIMIT);

  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('qa_queries')
    .select(`
      id,
      question,
      answer,
      answer_type,
      retrieval_time_ms,
      llm_time_ms,
      total_time_ms,
      chunks_retrieved,
      created_at,
      completed_at,
      qa_citations (
        citation_index,
        chunk_id,
        document_id,
        page_number,
        relevance_score,
        document:documents (
          title
        )
      ),
      qa_feedback (
        rating,
        comment
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .eq('data_room_id', dataRoomId)
    .order('created_at', { ascending: order === 'asc' })
    .limit(effectiveLimit + 1); // Fetch one extra to determine hasMore

  // Apply cursor if provided
  if (cursor) {
    if (order === 'desc') {
      query = query.lt('created_at', cursor);
    } else {
      query = query.gt('created_at', cursor);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw new HistoryError(
      `Failed to fetch history: ${error.message}`,
      'FETCH_FAILED',
      error
    );
  }

  if (!data) {
    return {
      queries: [],
      hasMore: false,
      totalCount: 0,
    };
  }

  // Determine if there are more results
  const hasMore = data.length > effectiveLimit;
  const queries = hasMore ? data.slice(0, effectiveLimit) : data;

  // Map to HistoricalQuery format
  interface QueryRow {
    id: string;
    question: string;
    answer: string | null;
    answer_type: 'grounded' | 'insufficient_evidence' | 'error';
    qa_citations?: CitationRow[];
    retrieval_time_ms: number | null;
    llm_time_ms: number | null;
    total_time_ms: number | null;
    chunks_retrieved: number | null;
    qa_feedback?: Array<{ rating: 'helpful' | 'not_helpful'; comment?: string }>;
    created_at: string;
    completed_at: string | null;
  }

  interface CitationRow {
    citation_index: number;
    document_id: string;
    page_number: number | null;
    chunk_id: string | null;
    relevance_score: number | null;
    document?: { title: string };
  }

  const historicalQueries: HistoricalQuery[] = queries.map((row: QueryRow) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    answerType: row.answer_type,
    citations: (row.qa_citations || []).map((cite: CitationRow) => ({
      index: cite.citation_index,
      documentId: cite.document_id,
      documentTitle: cite.document?.title || 'Unknown',
      pageNumber: cite.page_number,
      chunkId: cite.chunk_id,
      textPreview: '', // Not stored in citations table
      relevanceScore: cite.relevance_score,
      navigationUrl: `/data-room/${dataRoomId}/documents/${cite.document_id}#page=${cite.page_number}&chunk=${cite.chunk_id}`,
    })),
    metrics: {
      retrievalTimeMs: row.retrieval_time_ms || 0,
      llmTimeMs: row.llm_time_ms || 0,
      totalTimeMs: row.total_time_ms || 0,
      chunksRetrieved: row.chunks_retrieved || 0,
    },
    feedback: row.qa_feedback?.[0] ? {
      rating: row.qa_feedback[0].rating,
      comment: row.qa_feedback[0].comment,
    } : undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));

  // Calculate next cursor
  const nextCursor = hasMore && queries.length > 0
    ? queries[queries.length - 1].created_at
    : undefined;

  return {
    queries: historicalQueries,
    hasMore,
    nextCursor,
    totalCount: count || undefined,
  };
}

/**
 * Export query history to JSON or CSV
 *
 * @param userId - User ID
 * @param dataRoomId - Data room ID
 * @param format - Export format
 * @returns Exported data as string
 *
 * @example
 * ```typescript
 * const jsonExport = await exportHistory(userId, dataRoomId, 'json');
 * const csvExport = await exportHistory(userId, dataRoomId, 'csv');
 * ```
 */
export async function exportHistory(
  userId: string,
  dataRoomId: string,
  format: ExportFormat
): Promise<string> {
  // Fetch all history (no pagination limit for export)
  const result = await getHistory(userId, dataRoomId, { limit: 10000 });

  if (format === 'json') {
    return JSON.stringify(result.queries, null, 2);
  }

  // CSV format
  return convertToCSV(result.queries);
}

/**
 * Convert queries to CSV format
 */
function convertToCSV(queries: HistoricalQuery[]): string {
  if (queries.length === 0) {
    return 'No queries found';
  }

  // CSV headers
  const headers = [
    'Query ID',
    'Question',
    'Answer',
    'Answer Type',
    'Citations Count',
    'Retrieval Time (ms)',
    'LLM Time (ms)',
    'Total Time (ms)',
    'Feedback Rating',
    'Created At',
  ];

  // CSV rows
  const rows = queries.map(query => [
    query.id,
    escapeCsvField(query.question),
    escapeCsvField(query.answer || ''),
    query.answerType,
    query.citations.length.toString(),
    query.metrics.retrievalTimeMs.toString(),
    query.metrics.llmTimeMs.toString(),
    query.metrics.totalTimeMs.toString(),
    query.feedback?.rating || '',
    query.createdAt,
  ]);

  // Combine headers and rows
  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  return csv;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(field: string): string {
  if (!field) return '';

  // If field contains comma, quote, or newline, wrap in quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return field;
}

/**
 * Delete specific queries (GDPR right to erasure)
 *
 * @param userId - User ID
 * @param queryIds - Array of query IDs to delete
 * @returns Number of queries deleted
 *
 * @example
 * ```typescript
 * await deleteQueries(userId, [queryId1, queryId2]);
 * ```
 */
export async function deleteQueries(
  userId: string,
  queryIds: string[]
): Promise<number> {
  if (queryIds.length === 0) {
    return 0;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_queries')
    .delete()
    .eq('user_id', userId)
    .in('id', queryIds)
    .select('id');

  if (error) {
    throw new HistoryError(
      `Failed to delete queries: ${error.message}`,
      'DELETE_FAILED',
      error
    );
  }

  return data?.length || 0;
}

/**
 * Delete all queries for a user in a data room
 *
 * @param userId - User ID
 * @param dataRoomId - Data room ID
 * @returns Number of queries deleted
 */
export async function deleteAllQueries(
  userId: string,
  dataRoomId: string
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_queries')
    .delete()
    .eq('user_id', userId)
    .eq('data_room_id', dataRoomId)
    .select('id');

  if (error) {
    throw new HistoryError(
      `Failed to delete all queries: ${error.message}`,
      'DELETE_FAILED',
      error
    );
  }

  return data?.length || 0;
}

/**
 * Get a single query by ID
 */
export async function getQueryById(
  userId: string,
  queryId: string
): Promise<HistoricalQuery | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_queries')
    .select(`
      *,
      qa_citations (*),
      qa_feedback (*)
    `)
    .eq('id', queryId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Map to HistoricalQuery (simplified version)
  return {
    id: data.id,
    question: data.question,
    answer: data.answer,
    answerType: data.answer_type,
    citations: [], // Simplified
    metrics: {
      retrievalTimeMs: data.retrieval_time_ms || 0,
      llmTimeMs: data.llm_time_ms || 0,
      totalTimeMs: data.total_time_ms || 0,
      chunksRetrieved: data.chunks_retrieved || 0,
    },
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}

/**
 * Get statistics for user's query history
 */
export async function getHistoryStats(
  userId: string,
  dataRoomId: string
): Promise<{
  totalQueries: number;
  avgResponseTime: number;
  successRate: number;
  helpfulRate: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('qa_queries')
    .select('answer_type, total_time_ms, qa_feedback(rating)')
    .eq('user_id', userId)
    .eq('data_room_id', dataRoomId);

  if (error || !data || data.length === 0) {
    return {
      totalQueries: 0,
      avgResponseTime: 0,
      successRate: 0,
      helpfulRate: 0,
    };
  }

  const totalQueries = data.length;
  const successfulQueries = data.filter(q => q.answer_type === 'grounded').length;
  const avgResponseTime = data.reduce((sum, q) => sum + (q.total_time_ms || 0), 0) / totalQueries;

  interface QueryWithFeedback {
    answer_type: string;
    total_time_ms: number | null;
    qa_feedback?: Array<{ rating: 'helpful' | 'not_helpful' }>;
  }

  const feedbackQueries = data.filter((q: QueryWithFeedback) => q.qa_feedback && q.qa_feedback.length > 0);
  const helpfulQueries = feedbackQueries.filter((q: QueryWithFeedback) => q.qa_feedback?.[0]?.rating === 'helpful').length;
  const helpfulRate = feedbackQueries.length > 0 ? (helpfulQueries / feedbackQueries.length) * 100 : 0;

  return {
    totalQueries,
    avgResponseTime: Math.round(avgResponseTime),
    successRate: (successfulQueries / totalQueries) * 100,
    helpfulRate,
  };
}

/**
 * Custom error class for history operations
 */
export class HistoryError extends Error {
  constructor(
    message: string,
    public code: 'FETCH_FAILED' | 'DELETE_FAILED' | 'EXPORT_FAILED',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'HistoryError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HistoryError);
    }
  }
}

/**
 * Constants export
 */
export const CONSTANTS = {
  DEFAULT_LIMIT: DEFAULT_PAGINATION.limit,
  MAX_LIMIT,
  DEFAULT_ORDER: DEFAULT_PAGINATION.order,
} as const;
