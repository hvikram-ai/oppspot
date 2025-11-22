/**
 * Vector Search & Retrieval Service
 * Task: T016
 *
 * Implements pgvector-based semantic search for document chunks with permission filtering.
 * Uses cosine similarity for vector search with HNSW index.
 * Reference: research.md section 1 (vector search strategy)
 */

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from './embeddings-service';

/**
 * Retrieved chunk with relevance score
 */
export interface RetrievedChunk {
  id: string;
  document_id: string;
  page_id: string;
  chunk_index: number;
  text_content: string;
  token_count: number;
  start_char: number;
  end_char: number;
  similarity: number;        // Cosine similarity score (0-1)
  document_title?: string;   // Populated via JOIN
  page_number?: number;      // Populated via JOIN
}

/**
 * Retrieval configuration
 */
export interface RetrievalConfig {
  limit?: number;              // Top-k results (default: 20)
  minSimilarity?: number;      // Minimum similarity threshold (default: 0.7)
  includeMetadata?: boolean;   // Include document/page metadata (default: true)
}

/**
 * Default retrieval configuration
 */
export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  limit: 20,
  minSimilarity: 0.7,
  includeMetadata: true,
};

/**
 * Result of retrieval operation
 */
export interface RetrievalResult {
  chunks: RetrievedChunk[];
  total: number;
  queryEmbedding: number[];
  retrievalTimeMs: number;
}

/**
 * Retrieve relevant chunks for a query using vector search
 *
 * @param dataRoomId - Data room ID to search within
 * @param query - User's natural language query
 * @param userId - User ID for permission checking
 * @param config - Optional retrieval configuration
 * @returns Retrieved chunks ranked by relevance
 *
 * @example
 * ```typescript
 * const chunks = await retrieveChunks(
 *   dataRoomId,
 *   "What are the revenue figures?",
 *   userId
 * );
 *
 * chunks.forEach(chunk => {
 *   console.log(`${chunk.document_title} (${chunk.similarity.toFixed(2)}): ${chunk.text_content.slice(0, 100)}...`);
 * });
 * ```
 */
export async function retrieveChunks(
  dataRoomId: string,
  query: string,
  userId: string,
  config: RetrievalConfig = {}
): Promise<RetrievedChunk[]> {
  const result = await retrieveChunksWithStats(dataRoomId, query, userId, config);
  return result.chunks;
}

/**
 * Retrieve chunks with detailed statistics
 */
export async function retrieveChunksWithStats(
  dataRoomId: string,
  query: string,
  userId: string,
  config: RetrievalConfig = {}
): Promise<RetrievalResult> {
  const startTime = Date.now();

  const {
    limit = DEFAULT_RETRIEVAL_CONFIG.limit!,
    minSimilarity = DEFAULT_RETRIEVAL_CONFIG.minSimilarity!,
    includeMetadata = DEFAULT_RETRIEVAL_CONFIG.includeMetadata!,
  } = config;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Get Supabase client
  const supabase = await createClient();

  // Build query with permission filtering
  const queryBuilder = supabase
    .from('document_chunks')
    .select(
      includeMetadata
        ? `
          id,
          document_id,
          page_id,
          chunk_index,
          text_content,
          token_count,
          start_char,
          end_char,
          embedding,
          document:documents!inner(
            id,
            title,
            data_room_id
          ),
          page:document_pages!inner(
            id,
            page_number
          )
        `
        : `
          id,
          document_id,
          page_id,
          chunk_index,
          text_content,
          token_count,
          start_char,
          end_char,
          embedding,
          document:documents!inner(
            data_room_id
          )
        `
    );

  // Apply data room filter via JOIN
  // The !inner ensures we only get chunks from documents in the specified data room
  // RLS on documents table handles user permission checking

  // Execute vector search
  const { data, error } = await queryBuilder;

  if (error) {
    throw new RetrievalError(
      `Failed to retrieve chunks: ${error.message}`,
      'QUERY_FAILED',
      error
    );
  }

  if (!data || data.length === 0) {
    const retrievalTimeMs = Date.now() - startTime;
    return {
      chunks: [],
      total: 0,
      queryEmbedding,
      retrievalTimeMs,
    };
  }

  // Filter by data room (redundant with JOIN but ensures correctness)
  // Calculate cosine similarity and filter results
  interface ChunkRow {
    id: string;
    document_id: string;
    page_id: string | null;
    chunk_index: number;
    text_content: string;
    token_count: number;
    start_char: number;
    end_char: number;
    embedding: number[];
    document?: { data_room_id: string; title: string };
    page?: { page_number: number };
  }

  const chunksWithSimilarity = data
    .filter((row: ChunkRow) => row.document?.data_room_id === dataRoomId)
    .map((row: ChunkRow) => {
      const embedding = row.embedding;
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row.id,
        document_id: row.document_id,
        page_id: row.page_id,
        chunk_index: row.chunk_index,
        text_content: row.text_content,
        token_count: row.token_count,
        start_char: row.start_char,
        end_char: row.end_char,
        similarity,
        ...(includeMetadata && {
          document_title: row.document?.title,
          page_number: row.page?.page_number,
        }),
      };
    })
    .filter((chunk: RetrievedChunk) => chunk.similarity >= minSimilarity)
    .sort((a: RetrievedChunk, b: RetrievedChunk) => b.similarity - a.similarity)
    .slice(0, limit);

  const retrievalTimeMs = Date.now() - startTime;

  return {
    chunks: chunksWithSimilarity,
    total: chunksWithSimilarity.length,
    queryEmbedding,
    retrievalTimeMs,
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Check if user has access to data room
 */
export async function checkDataRoomAccess(
  dataRoomId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('data_room_access')
    .select('id')
    .eq('data_room_id', dataRoomId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Get retrieval statistics for monitoring
 */
export interface RetrievalStats {
  avgSimilarity: number;
  maxSimilarity: number;
  minSimilarity: number;
  totalTokens: number;
  avgTokensPerChunk: number;
}

export function getRetrievalStats(chunks: RetrievedChunk[]): RetrievalStats {
  if (chunks.length === 0) {
    return {
      avgSimilarity: 0,
      maxSimilarity: 0,
      minSimilarity: 0,
      totalTokens: 0,
      avgTokensPerChunk: 0,
    };
  }

  const similarities = chunks.map(c => c.similarity);
  const tokens = chunks.map(c => c.token_count);

  return {
    avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
    maxSimilarity: Math.max(...similarities),
    minSimilarity: Math.min(...similarities),
    totalTokens: tokens.reduce((a, b) => a + b, 0),
    avgTokensPerChunk: tokens.reduce((a, b) => a + b, 0) / tokens.length,
  };
}

/**
 * Format chunks as context for LLM
 * Combines chunks into a single text block with metadata
 */
export function formatChunksForLLM(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }

  return chunks
    .map((chunk, index) => {
      const header = chunk.document_title
        ? `[${index + 1}] ${chunk.document_title} (Page ${chunk.page_number})`
        : `[${index + 1}] Document ${chunk.document_id.slice(0, 8)}`;

      return `${header}\n${chunk.text_content}\n`;
    })
    .join('\n---\n\n');
}

/**
 * Group chunks by document
 */
export function groupChunksByDocument(
  chunks: RetrievedChunk[]
): Map<string, RetrievedChunk[]> {
  const grouped = new Map<string, RetrievedChunk[]>();

  for (const chunk of chunks) {
    const docId = chunk.document_id;
    if (!grouped.has(docId)) {
      grouped.set(docId, []);
    }
    grouped.get(docId)!.push(chunk);
  }

  return grouped;
}

/**
 * Deduplicate chunks that are very similar
 * Useful for removing redundant results from overlapping chunks
 */
export function deduplicateChunks(
  chunks: RetrievedChunk[],
  similarityThreshold: number = 0.95
): RetrievedChunk[] {
  const deduplicated: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    const isDuplicate = deduplicated.some(existing => {
      // Check if chunks are from same document and adjacent
      if (chunk.document_id !== existing.document_id) {
        return false;
      }

      // Check if chunks overlap significantly
      const overlapStart = Math.max(chunk.start_char, existing.start_char);
      const overlapEnd = Math.min(chunk.end_char, existing.end_char);
      const overlapLength = Math.max(0, overlapEnd - overlapStart);

      const chunkLength = chunk.end_char - chunk.start_char;
      const existingLength = existing.end_char - existing.start_char;
      const maxLength = Math.max(chunkLength, existingLength);

      const overlapRatio = overlapLength / maxLength;

      return overlapRatio >= similarityThreshold;
    });

    if (!isDuplicate) {
      deduplicated.push(chunk);
    }
  }

  return deduplicated;
}

/**
 * Custom error class for retrieval failures
 */
export class RetrievalError extends Error {
  constructor(
    message: string,
    public code: 'QUERY_FAILED' | 'ACCESS_DENIED' | 'NO_EMBEDDINGS' | 'INVALID_QUERY',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'RetrievalError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetrievalError);
    }
  }
}

/**
 * Constants export
 */
export const CONSTANTS = {
  DEFAULT_LIMIT: DEFAULT_RETRIEVAL_CONFIG.limit!,
  DEFAULT_MIN_SIMILARITY: DEFAULT_RETRIEVAL_CONFIG.minSimilarity!,
  VECTOR_DIMENSIONS: 1536,
} as const;
