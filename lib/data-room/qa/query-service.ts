/**
 * Query Orchestration Service
 * Task: T019
 *
 * Orchestrates the full Q&A pipeline: retrieval → LLM → citations → persistence.
 * Implements automatic retry logic, error classification, and performance tracking.
 * Reference: research.md section 9 (error handling)
 */

import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit, type RateLimitResult } from './rate-limiter';
import { retrieveChunksWithStats, type RetrievedChunk } from './retrieval-service';
import { generateAnswer, generateAnswerStream, createAbstentionResponse, type QAResponse } from './qa-llm-client';
import { generateCitations, type Citation } from './citation-generator';
import type { LLMStreamChunk } from '@/lib/llm/interfaces/ILLMProvider';

/**
 * Query execution options
 */
export interface QueryOptions {
  stream?: boolean;              // Enable streaming response
  saveToHistory?: boolean;       // Save query to database (default: true)
  autoRetry?: boolean;           // Auto-retry on temporary failures (default: true)
  maxRetries?: number;           // Maximum retry attempts (default: 1 per FR-035)
}

/**
 * Query result (non-streaming)
 */
export interface QueryResult {
  queryId: string;
  question: string;
  answer: string;
  answerType: 'grounded' | 'insufficient_evidence' | 'error';
  citations: Citation[];
  metrics: QueryMetrics;
  rateLimitInfo: RateLimitResult;
}

/**
 * Query metrics for monitoring
 */
export interface QueryMetrics {
  retrievalTimeMs: number;
  llmTimeMs: number;
  totalTimeMs: number;
  chunksRetrieved: number;
  tokensInput: number;
  tokensOutput: number;
  retryCount: number;
}

/**
 * Streaming query result
 */
export interface StreamingQueryResult {
  queryId: string;
  stream: AsyncGenerator<QAStreamChunk, void, unknown>;
  cleanup: () => Promise<void>;
}

/**
 * Stream chunk with metadata
 */
export interface QAStreamChunk {
  type: 'start' | 'content' | 'citations' | 'metrics' | 'done' | 'error';
  content?: string;
  citations?: Citation[];
  metrics?: QueryMetrics;
  error?: string;
  queryId?: string;
}

/**
 * Error types classification
 */
export enum QueryErrorType {
  // Temporary errors (can retry)
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  PROVIDER_UNAVAILABLE = 'provider_unavailable',

  // Permanent errors (don't retry)
  INVALID_QUESTION = 'invalid_question',
  ACCESS_DENIED = 'access_denied',
  NO_DOCUMENTS = 'no_documents',
  ABSTAINED = 'abstained',
  UNKNOWN = 'unknown',
}

/**
 * Custom error class for query failures
 */
export class QueryError extends Error {
  constructor(
    message: string,
    public type: QueryErrorType,
    public isTemporary: boolean,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'QueryError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryError);
    }
  }
}

/**
 * Execute Q&A query (non-streaming)
 *
 * @param userId - User ID
 * @param dataRoomId - Data room ID
 * @param question - User's question (5-2000 chars)
 * @param options - Execution options
 * @returns Query result with answer, citations, and metrics
 *
 * @example
 * ```typescript
 * const result = await executeQuery(userId, dataRoomId, "What is the revenue?");
 *
 * if (result.answerType === 'grounded') {
 *   console.log(`Answer: ${result.answer}`);
 *   console.log(`Citations: ${result.citations.length}`);
 *   console.log(`Time: ${result.metrics.totalTimeMs}ms`);
 * }
 * ```
 */
export async function executeQuery(
  userId: string,
  dataRoomId: string,
  question: string,
  options: QueryOptions = {}
): Promise<QueryResult> {
  const {
    saveToHistory = true,
    autoRetry = true,
    maxRetries = 1,
  } = options;

  const startTime = Date.now();
  let retryCount = 0;
  let lastError: QueryError | null = null;

  // Validate question
  if (question.length < 5 || question.length > 2000) {
    throw new QueryError(
      'Question must be between 5 and 2000 characters',
      QueryErrorType.INVALID_QUESTION,
      false
    );
  }

  // Check rate limit
  const rateLimitInfo = await enforceRateLimit(userId, dataRoomId);

  // Attempt execution with retry logic
  while (retryCount <= maxRetries) {
    try {
      const result = await executeQueryInternal(
        userId,
        dataRoomId,
        question,
        startTime,
        retryCount
      );

      // Save to history if requested
      if (saveToHistory) {
        await saveQueryToHistory(result, userId, dataRoomId);
      }

      return {
        ...result,
        rateLimitInfo,
      };
    } catch (error) {
      lastError = error instanceof QueryError ? error : new QueryError(
        error instanceof Error ? error.message : 'Unknown error',
        QueryErrorType.UNKNOWN,
        false,
        error
      );

      // Don't retry permanent errors
      if (!lastError.isTemporary || !autoRetry) {
        break;
      }

      retryCount++;

      // Log retry attempt
      console.warn(
        `[QueryService] Retry ${retryCount}/${maxRetries} for temporary error: ${lastError.message}`
      );

      // Add small delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }

  // All retries exhausted, save error to history and throw
  if (saveToHistory && lastError) {
    await saveQueryError(lastError, userId, dataRoomId, question, retryCount);
  }

  throw lastError;
}

/**
 * Internal query execution (single attempt)
 */
async function executeQueryInternal(
  userId: string,
  dataRoomId: string,
  question: string,
  startTime: number,
  retryCount: number
): Promise<Omit<QueryResult, 'rateLimitInfo'>> {
  // Generate unique query ID
  const queryId = crypto.randomUUID();

  // Step 1: Retrieve relevant chunks
  const retrievalStart = Date.now();
  const retrievalResult = await retrieveChunksWithStats(
    dataRoomId,
    question,
    userId
  );
  const retrievalTimeMs = Date.now() - retrievalStart;

  // Check if we have sufficient chunks
  if (retrievalResult.chunks.length === 0) {
    const insufficientResponse = createAbstentionResponse('No relevant documents found');

    return {
      queryId,
      question,
      answer: '',
      answerType: 'insufficient_evidence',
      citations: [],
      metrics: {
        retrievalTimeMs,
        llmTimeMs: 0,
        totalTimeMs: Date.now() - startTime,
        chunksRetrieved: 0,
        tokensInput: 0,
        tokensOutput: 0,
        retryCount,
      },
    };
  }

  // Step 2: Generate answer using LLM
  const llmStart = Date.now();
  const qaResponse = await generateAnswer(question, retrievalResult.chunks, {
    stream: false,
  });
  const llmTimeMs = Date.now() - llmStart;

  // Step 3: Handle abstention
  if (qaResponse.abstained) {
    return {
      queryId,
      question,
      answer: '',
      answerType: 'insufficient_evidence',
      citations: [],
      metrics: {
        retrievalTimeMs,
        llmTimeMs,
        totalTimeMs: Date.now() - startTime,
        chunksRetrieved: retrievalResult.chunks.length,
        tokensInput: qaResponse.usage.promptTokens,
        tokensOutput: qaResponse.usage.completionTokens,
        retryCount,
      },
    };
  }

  // Step 4: Generate citations
  const citations = generateCitations(
    qaResponse.answer,
    retrievalResult.chunks,
    dataRoomId
  );

  // Step 5: Calculate final metrics
  const totalTimeMs = Date.now() - startTime;

  return {
    queryId,
    question,
    answer: qaResponse.answer,
    answerType: 'grounded',
    citations: citations.citations,
    metrics: {
      retrievalTimeMs,
      llmTimeMs,
      totalTimeMs,
      chunksRetrieved: retrievalResult.chunks.length,
      tokensInput: qaResponse.usage.promptTokens,
      tokensOutput: qaResponse.usage.completionTokens,
      retryCount,
    },
  };
}

/**
 * Execute query with streaming response
 */
export async function executeQueryStreaming(
  userId: string,
  dataRoomId: string,
  question: string,
  options: QueryOptions = {}
): Promise<StreamingQueryResult> {
  const queryId = crypto.randomUUID();
  const startTime = Date.now();

  // Check rate limit
  await enforceRateLimit(userId, dataRoomId);

  // Validate question
  if (question.length < 5 || question.length > 2000) {
    throw new QueryError(
      'Question must be between 5 and 2000 characters',
      QueryErrorType.INVALID_QUESTION,
      false
    );
  }

  // Retrieve chunks (not streamed)
  const retrievalStart = Date.now();
  const retrievalResult = await retrieveChunksWithStats(
    dataRoomId,
    question,
    userId
  );
  const retrievalTimeMs = Date.now() - retrievalStart;

  if (retrievalResult.chunks.length === 0) {
    // Return immediate error stream
    const errorStream = async function* (): AsyncGenerator<QAStreamChunk, void, unknown> {
      yield {
        type: 'error',
        error: 'No relevant documents found',
        queryId,
      };
    };

    return {
      queryId,
      stream: errorStream(),
      cleanup: async () => {},
    };
  }

  // Create streaming generator
  const stream = async function* (): AsyncGenerator<QAStreamChunk, void, unknown> {
    try {
      // Send start event
      yield {
        type: 'start',
        queryId,
      };

      // Stream LLM response
      const llmStart = Date.now();
      let fullAnswer = '';
      let tokensInput = 0;
      let tokensOutput = 0;

      const llmStream = generateAnswerStream(question, retrievalResult.chunks);

      for await (const chunk of llmStream) {
        if (chunk.type === 'content' && chunk.content) {
          fullAnswer += chunk.content;
          yield {
            type: 'content',
            content: chunk.content,
          };
        }

        // Track token usage if available
        if (chunk.type === 'done' && chunk.usage) {
          tokensInput = chunk.usage.promptTokens;
          tokensOutput = chunk.usage.completionTokens;
        }
      }

      const llmTimeMs = Date.now() - llmStart;

      // Generate citations from full answer
      const citations = generateCitations(
        fullAnswer,
        retrievalResult.chunks,
        dataRoomId
      );

      // Send citations
      yield {
        type: 'citations',
        citations: citations.citations,
      };

      // Send metrics
      const totalTimeMs = Date.now() - startTime;
      yield {
        type: 'metrics',
        metrics: {
          retrievalTimeMs,
          llmTimeMs,
          totalTimeMs,
          chunksRetrieved: retrievalResult.chunks.length,
          tokensInput,
          tokensOutput,
          retryCount: 0,
        },
      };

      // Send done
      yield {
        type: 'done',
      };

      // Save to history if requested
      if (options.saveToHistory !== false) {
        await saveQueryToHistory(
          {
            queryId,
            question,
            answer: fullAnswer,
            answerType: 'grounded',
            citations: citations.citations,
            metrics: {
              retrievalTimeMs,
              llmTimeMs,
              totalTimeMs,
              chunksRetrieved: retrievalResult.chunks.length,
              tokensInput,
              tokensOutput,
              retryCount: 0,
            },
          },
          userId,
          dataRoomId
        );
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return {
    queryId,
    stream: stream(),
    cleanup: async () => {
      // Cleanup logic (close connections, etc.)
    },
  };
}

/**
 * Save successful query to database
 */
async function saveQueryToHistory(
  result: Omit<QueryResult, 'rateLimitInfo'>,
  userId: string,
  dataRoomId: string
): Promise<void> {
  const supabase = await createClient();

  // Insert query record
  const { data: query, error: queryError } = await supabase
    .from('qa_queries')
    .insert({
      id: result.queryId,
      user_id: userId,
      data_room_id: dataRoomId,
      question: result.question,
      answer: result.answer,
      answer_type: result.answerType,
      model_used: 'via-llm-manager', // Will be populated from LLM response
      retrieval_time_ms: result.metrics.retrievalTimeMs,
      llm_time_ms: result.metrics.llmTimeMs,
      total_time_ms: result.metrics.totalTimeMs,
      chunks_retrieved: result.metrics.chunksRetrieved,
      tokens_input: result.metrics.tokensInput,
      tokens_output: result.metrics.tokensOutput,
      retry_count: result.metrics.retryCount,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (queryError) {
    console.error('[QueryService] Failed to save query:', queryError);
    return;
  }

  // Insert citations
  if (result.citations.length > 0) {
    const citationRecords = result.citations.map(cite => ({
      query_id: result.queryId,
      chunk_id: cite.chunkId,
      document_id: cite.documentId,
      page_number: cite.pageNumber,
      citation_index: cite.index,
      relevance_score: cite.relevanceScore,
    }));

    const { error: citationsError } = await supabase
      .from('qa_citations')
      .insert(citationRecords);

    if (citationsError) {
      console.error('[QueryService] Failed to save citations:', citationsError);
    }
  }
}

/**
 * Save failed query to database
 */
async function saveQueryError(
  error: QueryError,
  userId: string,
  dataRoomId: string,
  question: string,
  retryCount: number
): Promise<void> {
  const supabase = await createClient();

  const { error: insertError } = await supabase
    .from('qa_queries')
    .insert({
      user_id: userId,
      data_room_id: dataRoomId,
      question,
      answer: null,
      answer_type: 'error',
      error_type: error.type,
      error_message: error.message,
      retry_count: retryCount,
      completed_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[QueryService] Failed to save error:', insertError);
  }
}

/**
 * Classify error as temporary or permanent
 */
export function classifyError(error: unknown): QueryError {
  if (error instanceof QueryError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Temporary errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return new QueryError(message, QueryErrorType.TIMEOUT, true, error);
  }

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return new QueryError(message, QueryErrorType.RATE_LIMIT, true, error);
  }

  if (lowerMessage.includes('unavailable') || lowerMessage.includes('service down')) {
    return new QueryError(message, QueryErrorType.PROVIDER_UNAVAILABLE, true, error);
  }

  // Permanent errors
  if (lowerMessage.includes('access denied') || lowerMessage.includes('permission')) {
    return new QueryError(message, QueryErrorType.ACCESS_DENIED, false, error);
  }

  if (lowerMessage.includes('no documents') || lowerMessage.includes('not found')) {
    return new QueryError(message, QueryErrorType.NO_DOCUMENTS, false, error);
  }

  // Default to permanent unknown error
  return new QueryError(message, QueryErrorType.UNKNOWN, false, error);
}

/**
 * Constants export
 */
export const CONSTANTS = {
  MAX_RETRIES: 1,
  MIN_QUESTION_LENGTH: 5,
  MAX_QUESTION_LENGTH: 2000,
} as const;
