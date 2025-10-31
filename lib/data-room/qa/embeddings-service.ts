/**
 * Vector Embeddings Service
 * Task: T014
 *
 * Generates OpenAI ada-002 embeddings for document chunks with batching and caching.
 * Reference: research.md section 1 (vector search strategy)
 */

import OpenAI from 'openai';
import { createHash } from 'crypto';

/**
 * OpenAI embedding model configuration
 */
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Batch size for embedding generation
 * OpenAI API supports up to 2048 inputs per request
 */
const MAX_BATCH_SIZE = 100;

/**
 * In-memory cache for embeddings
 * Maps chunk hash -> embedding vector
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Configuration for embeddings service
 */
export interface EmbeddingsConfig {
  apiKey?: string;
  model?: string;
  batchSize?: number;
  useCache?: boolean;
}

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  embeddings: number[][];
  cached: number;          // Number of cached results
  generated: number;       // Number of newly generated embeddings
  total: number;
}

/**
 * Initialize OpenAI client
 */
let openaiClient: OpenAI | null = null;

function getOpenAIClient(apiKey?: string): OpenAI {
  if (!openaiClient) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new EmbeddingsError(
        'OpenAI API key not found. Set OPENAI_API_KEY environment variable or pass apiKey to config.',
        'MISSING_API_KEY'
      );
    }

    openaiClient = new OpenAI({ apiKey: key });
  }

  return openaiClient;
}

/**
 * Generate hash for text to use as cache key
 */
function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Generate embeddings for an array of text chunks
 *
 * @param texts - Array of text strings to embed
 * @param config - Optional configuration
 * @returns Array of embedding vectors (1536 dimensions each)
 *
 * @example
 * ```typescript
 * const chunks = ['Financial statement shows...', 'Contract terms include...'];
 * const embeddings = await generateEmbeddings(chunks);
 *
 * // embeddings is number[][] with shape [2, 1536]
 * console.log(`Generated ${embeddings.length} embeddings`);
 * ```
 */
export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingsConfig = {}
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const {
    model = EMBEDDING_MODEL,
    batchSize = MAX_BATCH_SIZE,
    useCache = true,
  } = config;

  const client = getOpenAIClient(config.apiKey);
  const embeddings: number[][] = [];
  const textsToEmbed: string[] = [];
  const indices: number[] = [];

  // Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const hash = hashText(text);

    if (useCache && embeddingCache.has(hash)) {
      // Use cached embedding
      embeddings[i] = embeddingCache.get(hash)!;
    } else {
      // Need to generate embedding
      textsToEmbed.push(text);
      indices.push(i);
    }
  }

  // Generate embeddings in batches
  for (let i = 0; i < textsToEmbed.length; i += batchSize) {
    const batch = textsToEmbed.slice(i, i + batchSize);
    const batchIndices = indices.slice(i, i + batchSize);

    try {
      const response = await client.embeddings.create({
        model,
        input: batch,
        encoding_format: 'float',
      });

      // Process each embedding in the response
      for (let j = 0; j < response.data.length; j++) {
        const embedding = response.data[j].embedding;
        const originalIndex = batchIndices[j];
        const text = batch[j];

        // Store in result
        embeddings[originalIndex] = embedding;

        // Cache the embedding
        if (useCache) {
          const hash = hashText(text);
          embeddingCache.set(hash, embedding);
        }
      }
    } catch (error) {
      throw new EmbeddingsError(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        error
      );
    }
  }

  return embeddings;
}

/**
 * Generate embeddings with detailed statistics
 */
export async function generateEmbeddingsWithStats(
  texts: string[],
  config: EmbeddingsConfig = {}
): Promise<EmbeddingResult> {
  const startCacheSize = embeddingCache.size;
  const useCache = config.useCache !== false;

  // Count cached items before generation
  let cachedCount = 0;
  if (useCache) {
    for (const text of texts) {
      const hash = hashText(text);
      if (embeddingCache.has(hash)) {
        cachedCount++;
      }
    }
  }

  const embeddings = await generateEmbeddings(texts, config);
  const generatedCount = texts.length - cachedCount;

  return {
    embeddings,
    cached: cachedCount,
    generated: generatedCount,
    total: texts.length,
  };
}

/**
 * Generate a single embedding (convenience function)
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingsConfig = {}
): Promise<number[]> {
  const embeddings = await generateEmbeddings([text], config);
  return embeddings[0];
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  memoryEstimateMB: number;
} {
  const size = embeddingCache.size;
  // Each embedding is 1536 float64s = 1536 * 8 bytes = 12,288 bytes
  const bytesPerEmbedding = EMBEDDING_DIMENSIONS * 8;
  const totalBytes = size * bytesPerEmbedding;
  const memoryEstimateMB = totalBytes / (1024 * 1024);

  return {
    size,
    memoryEstimateMB: Math.round(memoryEstimateMB * 100) / 100,
  };
}

/**
 * Validate that an embedding has the correct dimensions
 */
export function validateEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSIONS &&
    embedding.every(val => typeof val === 'number' && !isNaN(val))
  );
}

/**
 * Calculate cosine similarity between two embeddings
 * Useful for testing and validation
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimensions');
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
 * Custom error class for embeddings service
 */
export class EmbeddingsError extends Error {
  constructor(
    message: string,
    public code: 'MISSING_API_KEY' | 'GENERATION_FAILED' | 'INVALID_INPUT',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingsError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmbeddingsError);
    }
  }
}

/**
 * Estimate token count for embedding input
 * Rough approximation: ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated cost for embedding generation
 * OpenAI ada-002 pricing: $0.0001 per 1K tokens
 */
export function estimateEmbeddingCost(texts: string[]): {
  totalTokens: number;
  estimatedCostUSD: number;
} {
  const totalTokens = texts.reduce((sum, text) => sum + estimateTokenCount(text), 0);
  const estimatedCostUSD = (totalTokens / 1000) * 0.0001;

  return {
    totalTokens,
    estimatedCostUSD: Math.round(estimatedCostUSD * 100000) / 100000, // 5 decimal places
  };
}

/**
 * Constants export
 */
export const CONSTANTS = {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_BATCH_SIZE,
} as const;
