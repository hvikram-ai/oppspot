/**
 * Document Chunking Service
 * Task: T012
 *
 * Implements recursive character splitting with 500-token chunks and 100-token overlap.
 * Uses tiktoken for accurate token counting compatible with OpenAI models.
 */

import { encoding_for_model } from '@dqbd/tiktoken';
import type { DocumentChunk } from '@/types/data-room-qa';

/**
 * Configuration for document chunking
 */
export interface ChunkConfig {
  chunkSize: number;        // Target chunk size in tokens
  chunkOverlap: number;     // Overlap between chunks in tokens
  separators: string[];     // Preferred split points (semantic boundaries)
  respectParagraphs: boolean;
}

/**
 * Default chunking configuration
 * Based on research.md section 2 recommendations
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 500,           // tokens
  chunkOverlap: 100,        // tokens
  separators: ['\n\n', '\n', '. ', ' ', ''],  // Prefer paragraph > sentence > word boundaries
  respectParagraphs: true,
};

/**
 * Page text input for chunking
 */
export interface PageText {
  page_number: number;
  text: string;
}

/**
 * Result of chunking operation
 */
export interface ChunkResult {
  chunk_id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;      // Index within the document (0-based)
  text: string;
  token_count: number;
  start_char: number;       // Character offset within page
  end_char: number;
}

/**
 * Initialize tiktoken encoder for cl100k_base (used by OpenAI models)
 */
let encoder: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = encoding_for_model('gpt-4'); // Uses cl100k_base encoding
  }
  return encoder;
}

/**
 * Count tokens in text using tiktoken
 */
function countTokens(text: string): number {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  return tokens.length;
}

/**
 * Split text at preferred separator boundaries
 */
function splitBySeparator(
  text: string,
  separator: string,
  config: ChunkConfig
): string[] {
  if (!separator) {
    // Base case: split by character
    return text.split('');
  }

  const parts = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const testChunk = currentChunk + (currentChunk ? separator : '') + part;
    const tokenCount = countTokens(testChunk);

    if (tokenCount <= config.chunkSize) {
      currentChunk = testChunk;
    } else {
      // Current chunk would exceed size
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If single part is too large, split it further
      if (countTokens(part) > config.chunkSize) {
        // Recursively split with next separator
        const separatorIndex = config.separators.indexOf(separator);
        const nextSeparator = config.separators[separatorIndex + 1] || '';
        const subChunks = splitBySeparator(part, nextSeparator, config);
        chunks.push(...subChunks);
        currentChunk = '';
      } else {
        currentChunk = part;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Create overlapping chunks from array of text chunks
 */
function createOverlappingChunks(
  textChunks: string[],
  config: ChunkConfig
): string[] {
  if (textChunks.length === 0) return [];
  if (textChunks.length === 1) return textChunks;

  const overlappingChunks: string[] = [];

  for (let i = 0; i < textChunks.length; i++) {
    let chunk = textChunks[i];

    // Add overlap from previous chunk
    if (i > 0 && config.chunkOverlap > 0) {
      const prevChunk = textChunks[i - 1];
      const prevTokens = countTokens(prevChunk);

      if (prevTokens >= config.chunkOverlap) {
        // Take last N tokens from previous chunk
        const overlapText = getLastNTokens(prevChunk, config.chunkOverlap);
        chunk = overlapText + '\n' + chunk;
      }
    }

    overlappingChunks.push(chunk);
  }

  return overlappingChunks;
}

/**
 * Get last N tokens from text
 */
function getLastNTokens(text: string, n: number): string {
  const enc = getEncoder();
  const tokens = enc.encode(text);

  if (tokens.length <= n) {
    return text;
  }

  const lastTokens = tokens.slice(-n);
  const decoded = new TextDecoder().decode(enc.decode(lastTokens));

  return decoded;
}

/**
 * Chunk a single page of text
 */
function chunkPageText(
  pageNumber: number,
  pageText: string,
  config: ChunkConfig
): Omit<ChunkResult, 'document_id' | 'chunk_id'>[] {
  if (!pageText || pageText.trim().length === 0) {
    return [];
  }

  // Split text into initial chunks
  const separator = config.separators[0];
  const textChunks = splitBySeparator(pageText, separator, config);

  // Add overlap between chunks
  const overlappingChunks = createOverlappingChunks(textChunks, config);

  // Create chunk results with metadata
  const chunks: Omit<ChunkResult, 'document_id' | 'chunk_id'>[] = [];
  let charOffset = 0;

  for (let i = 0; i < overlappingChunks.length; i++) {
    const chunkText = overlappingChunks[i];
    const tokenCount = countTokens(chunkText);

    chunks.push({
      page_number: pageNumber,
      chunk_index: i,
      text: chunkText.trim(),
      token_count: tokenCount,
      start_char: charOffset,
      end_char: charOffset + chunkText.length,
    });

    charOffset += chunkText.length;
  }

  return chunks;
}

/**
 * Main function: Chunk document pages into smaller chunks
 *
 * @param documentId - UUID of the document
 * @param pageTexts - Array of page texts to chunk
 * @param config - Optional chunking configuration
 * @returns Array of document chunks ready for embedding
 */
export async function chunkDocument(
  documentId: string,
  pageTexts: PageText[],
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG
): Promise<DocumentChunk[]> {
  const allChunks: DocumentChunk[] = [];
  let globalChunkIndex = 0;

  for (const pageText of pageTexts) {
    const pageChunks = chunkPageText(
      pageText.page_number,
      pageText.text,
      config
    );

    for (const chunk of pageChunks) {
      // Generate unique chunk ID
      const chunkId = `${documentId}-p${pageText.page_number}-c${chunk.chunk_index}`;

      allChunks.push({
        id: chunkId,
        document_id: documentId,
        page_number: pageText.page_number,
        chunk_index: globalChunkIndex,
        text: chunk.text,
        token_count: chunk.token_count,
        embedding: null, // Will be populated by embeddings service
        created_at: new Date().toISOString(),
      });

      globalChunkIndex++;
    }
  }

  return allChunks;
}

/**
 * Calculate chunking statistics for a document
 */
export function calculateChunkingStats(chunks: DocumentChunk[]): {
  total_chunks: number;
  total_tokens: number;
  avg_tokens_per_chunk: number;
  avg_chunk_size: number;
  min_tokens: number;
  max_tokens: number;
} {
  if (chunks.length === 0) {
    return {
      total_chunks: 0,
      total_tokens: 0,
      avg_tokens_per_chunk: 0,
      avg_chunk_size: 0,
      min_tokens: 0,
      max_tokens: 0,
    };
  }

  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.token_count, 0);
  const tokenCounts = chunks.map(c => c.token_count);
  const chunkSizes = chunks.map(c => c.text.length);

  return {
    total_chunks: chunks.length,
    total_tokens: totalTokens,
    avg_tokens_per_chunk: Math.round(totalTokens / chunks.length),
    avg_chunk_size: Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunks.length),
    min_tokens: Math.min(...tokenCounts),
    max_tokens: Math.max(...tokenCounts),
  };
}

/**
 * Cleanup: Free tiktoken encoder resources
 */
export function cleanup() {
  if (encoder) {
    encoder.free();
    encoder = null;
  }
}
