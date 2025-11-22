/**
 * Data Room Q&A Copilot - TypeScript Types
 * Feature: 008-oppspot-docs-dataroom
 * Generated from: data-model.md
 */

import { Database } from './database';

// ============================================================================
// Database Row Types (matching schema exactly)
// ============================================================================

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  text_content: string | null;
  ocr_confidence: number | null; // 0.0-1.0
  layout_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  page_id: string;
  chunk_index: number;
  text_content: string;
  token_count: number;
  start_char: number;
  end_char: number;
  embedding: number[] | null; // 1536-dimensional vector
  embedding_model: string;
  created_at: string;
}

export interface QAQuery {
  id: string;
  user_id: string;
  data_room_id: string;
  question: string;
  answer: string | null;
  answer_type: 'grounded' | 'insufficient_evidence' | 'error' | null;
  model_used: string | null;

  // Performance metrics
  retrieval_time_ms: number | null;
  llm_time_ms: number | null;
  total_time_ms: number | null;
  chunks_retrieved: number | null;
  tokens_input: number | null;
  tokens_output: number | null;

  // Error tracking
  error_type: string | null;
  error_message: string | null;
  retry_count: number;

  // Timestamps
  created_at: string;
  completed_at: string | null;
}

export interface QACitation {
  id: string;
  query_id: string;
  chunk_id: string;
  document_id: string; // Denormalized
  page_number: number; // Denormalized
  relevance_score: number; // 0.0-1.0
  rank: number; // 1 = most relevant
  text_preview: string; // ~240 chars
  citation_format: 'inline' | 'footnote';
  created_at: string;
}

export interface QAFeedback {
  id: string;
  query_id: string;
  user_id: string;
  rating: 'helpful' | 'not_helpful';
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface QARateLimit {
  id: string;
  user_id: string;
  data_room_id: string;
  window_start: string; // ISO timestamp truncated to hour
  query_count: number;
  last_query_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

export type DocumentPageInsert = Omit<DocumentPage, 'id' | 'created_at'>;

export type DocumentChunkInsert = Omit<DocumentChunk, 'id' | 'created_at' | 'embedding_model'> & {
  embedding_model?: string;
};

export type QAQueryInsert = Omit<
  QAQuery,
  'id' | 'created_at' | 'completed_at' | 'retry_count'
> & {
  retry_count?: number;
};

export type QACitationInsert = Omit<QACitation, 'id' | 'created_at' | 'citation_format'> & {
  citation_format?: 'inline' | 'footnote';
};

export type QAFeedbackInsert = Omit<QAFeedback, 'id' | 'created_at' | 'updated_at'>;

export type QARateLimitInsert = Omit<QARateLimit, 'id' | 'created_at' | 'updated_at'>;

// ============================================================================
// Update Types (for updating existing records)
// ============================================================================

export type DocumentPageUpdate = Partial<Omit<DocumentPage, 'id' | 'created_at'>>;

export type DocumentChunkUpdate = Partial<Omit<DocumentChunk, 'id' | 'created_at'>>;

export type QAQueryUpdate = Partial<
  Omit<QAQuery, 'id' | 'user_id' | 'data_room_id' | 'created_at'>
>;

export type QACitationUpdate = Partial<Omit<QACitation, 'id' | 'query_id' | 'chunk_id' | 'created_at'>>;

export type QAFeedbackUpdate = Partial<Omit<QAFeedback, 'id' | 'query_id' | 'user_id' | 'created_at'>>;

export type QARateLimitUpdate = Partial<Omit<QARateLimit, 'id' | 'user_id' | 'data_room_id' | 'created_at'>>;

// ============================================================================
// API Request/Response Types
// ============================================================================

// POST /api/data-room/[dataRoomId]/query - Request
export interface QueryRequest {
  question: string; // 5-2000 chars
  stream?: boolean; // Default: true
}

// POST /api/data-room/[dataRoomId]/query - Response (non-streaming)
export interface QueryResponse {
  query_id: string;
  question: string;
  answer: string;
  answer_type: 'grounded' | 'insufficient_evidence';
  citations: CitationResponse[];
  metrics: QueryMetrics;
}

// POST /api/data-room/[dataRoomId]/query - Streaming Events
export type QueryStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'citation'; citation: CitationResponse }
  | { type: 'complete'; query_id: string; metrics: QueryMetrics }
  | { type: 'error'; error: ErrorDetail };

// Citation data for API responses
export interface CitationResponse {
  document_id: string;
  document_title: string;
  page_number: number;
  chunk_id: string;
  relevance_score: number;
  text_preview: string;
  rank?: number;
}

// Performance metrics
export interface QueryMetrics {
  total_time_ms: number;
  retrieval_time_ms: number;
  llm_time_ms: number;
  chunks_retrieved: number;
  citation_count: number;
  tokens_input?: number;
  tokens_output?: number;
  model_used?: string;
}

// GET /api/data-room/[dataRoomId]/history - Request (query params)
export interface HistoryRequest {
  cursor?: string; // ISO timestamp for pagination
  limit?: number; // 1-100, default 50
  order?: 'asc' | 'desc'; // Default: desc
}

// GET /api/data-room/[dataRoomId]/history - Response
export interface HistoryResponse {
  queries: HistoricalQuery[];
  has_more: boolean;
  next_cursor?: string;
  total_count?: number; // May be approximate
}

export interface HistoricalQuery {
  query_id: string;
  question: string;
  answer: string | null;
  answer_type: 'grounded' | 'insufficient_evidence' | 'error' | null;
  created_at: string;
  citation_count: number;
  feedback_rating: 'helpful' | 'not_helpful' | null;
  total_time_ms?: number;
}

// POST /api/data-room/[dataRoomId]/feedback - Request
export interface FeedbackRequest {
  query_id: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string; // Max 2000 chars
}

// POST /api/data-room/[dataRoomId]/feedback - Response
export interface FeedbackResponse {
  success: boolean;
  feedback_id: string;
}

// GET /api/data-room/[dataRoomId]/export - Request (query params)
export interface ExportRequest {
  format?: 'json' | 'csv'; // Default: json
}

// GET /api/data-room/[dataRoomId]/export - Response
export interface ExportResponse {
  download_url: string; // Signed URL, expires in 1 hour
  expires_at: string;
  file_size_bytes: number;
}

// DELETE /api/data-room/[dataRoomId]/history - Request
export interface DeleteHistoryRequest {
  query_ids?: string[]; // If omitted, deletes ALL queries
}

// DELETE /api/data-room/[dataRoomId]/history - Response
export interface DeleteHistoryResponse {
  deleted_count: number;
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorType =
  | 'INVALID_QUERY'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'LLM_TIMEOUT'
  | 'LLM_SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ErrorResponse {
  error: ErrorType;
  message: string;
  retry_allowed?: boolean;
  retry_attempted?: boolean;
  retry_after_seconds?: number; // For rate limits
}

export interface ErrorDetail {
  error_type: string;
  message: string;
  retry_count?: number;
}

// ============================================================================
// Service Layer Types
// ============================================================================

// Document processing result
export interface DocumentProcessingResult {
  document_id: string;
  page_count: number;
  chunk_count: number;
  processing_time_ms: number;
  ocr_used: boolean;
  avg_confidence?: number; // If OCR was used
}

// Text extraction result
export interface TextExtractionResult {
  text: string;
  pages: { page_number: number; text: string; confidence?: number }[];
  ocr_used: boolean;
  avg_confidence?: number;
}

// Chunking result
export interface ChunkingResult {
  chunks: {
    text: string;
    token_count: number;
    start_char: number;
    end_char: number;
    page_number: number;
  }[];
  total_chunks: number;
  avg_chunk_size: number;
}

// Vector search result
export interface VectorSearchResult {
  chunk_id: string;
  document_id: string;
  page_id: string;
  page_number: number;
  text_content: string;
  relevance_score: number; // Cosine similarity 0.0-1.0
}

// Rate limit check result
export interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  limit: number;
  ttl_seconds?: number; // Time until window resets
}

// Query execution result (internal)
export interface QueryExecutionResult {
  query_id: string;
  answer: string;
  answer_type: 'grounded' | 'insufficient_evidence';
  citations: QACitation[];
  metrics: QueryMetrics;
}

// ============================================================================
// Utility Types
// ============================================================================

// For pagination cursors
export interface PaginationCursor {
  timestamp: string; // ISO timestamp
  id?: string; // Tie-breaker for same-timestamp records
}

// For query history with joined data
export interface QueryWithCitations extends QAQuery {
  citations: QACitation[];
  feedback: QAFeedback | null;
  document_titles: string[]; // Derived from citations
}

// For analytics/monitoring
export interface QAAnalytics {
  total_queries: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  abstention_rate: number; // Percentage
  avg_citations: number;
  helpful_rate: number; // Percentage of helpful feedback
  top_questions: { question: string; count: number }[];
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

import { z } from 'zod';

export const QueryRequestSchema = z.object({
  question: z.string().min(5).max(2000),
  stream: z.boolean().optional().default(true),
});

export const FeedbackRequestSchema = z.object({
  query_id: z.string().uuid(),
  rating: z.enum(['helpful', 'not_helpful']),
  comment: z.string().max(2000).optional(),
});

export const HistoryRequestSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const ExportRequestSchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export const DeleteHistoryRequestSchema = z.object({
  query_ids: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isQueryStreamEvent(obj: unknown): obj is QueryStreamEvent {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    ['chunk', 'citation', 'complete', 'error'].includes((obj as QueryStreamEvent).type)
  );
}

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return obj !== null && typeof obj === 'object' && 'error' in obj && 'message' in obj;
}

// ============================================================================
// Constants
// ============================================================================

export const QA_CONSTANTS = {
  // Rate limiting (FR-014)
  RATE_LIMIT_PER_HOUR: 60,

  // Query constraints
  QUESTION_MIN_LENGTH: 5,
  QUESTION_MAX_LENGTH: 2000,
  COMMENT_MAX_LENGTH: 2000,

  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,

  // Performance targets (from spec.md)
  TARGET_QUERY_TIME_MS: 7000, // FR-005
  TARGET_RETRIEVAL_TIME_MS: 300, // FR-031
  TARGET_STREAMING_START_MS: 3000,

  // Citation preview length (FR-010)
  CITATION_PREVIEW_LENGTH: 240,
  CITATION_PREVIEW_MAX: 500,

  // Chunk configuration (from research.md)
  CHUNK_SIZE_TOKENS: 500,
  CHUNK_OVERLAP_TOKENS: 100,

  // Vector dimensions
  EMBEDDING_DIMENSIONS: 1536, // OpenAI ada-002

  // Performance warning thresholds
  LARGE_DOCUMENT_PAGES: 500,
  VERY_LARGE_DOCUMENT_PAGES: 1000,
} as const;

export type QAConstants = typeof QA_CONSTANTS;
