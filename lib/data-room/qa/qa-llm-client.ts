/**
 * LLM Q&A Client
 * Task: T017
 *
 * Integrates with LLMManager to generate answers for data room Q&A.
 * Implements strict grounding in source chunks, citation injection, and abstention logic.
 * Reference: research.md section 3 (LLM selection)
 */

import { LLMManager } from '@/lib/llm/manager/LLMManager';
import type { LLMMessage, GenerationOptions, LLMStreamChunk } from '@/lib/llm/interfaces/ILLMProvider';
import type { RetrievedChunk } from './retrieval-service';
import { formatChunksForLLM } from './retrieval-service';

/**
 * Q&A generation options
 */
export interface QAGenerationOptions {
  stream?: boolean;           // Enable streaming response
  temperature?: number;       // LLM temperature (default: 0.3 for factual)
  maxTokens?: number;         // Max response tokens (default: 1000)
  includeConfidence?: boolean; // Include confidence score in response
}

/**
 * Q&A response (non-streaming)
 */
export interface QAResponse {
  answer: string;
  abstained: boolean;         // True if LLM refused to answer
  abstainReason?: string;     // Reason for abstention
  confidence?: number;        // Confidence score (0-1)
  model: string;              // Model used
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Feature tag for LLM provider selection
 */
const FEATURE_TAG = 'data-room-qa';

/**
 * Default generation options for Q&A
 */
const DEFAULT_QA_OPTIONS: QAGenerationOptions = {
  stream: true,
  temperature: 0.3,           // Low temperature for factual accuracy
  maxTokens: 1000,
  includeConfidence: false,
};

/**
 * System prompt for data room Q&A
 * Enforces strict grounding and citation requirements
 */
const SYSTEM_PROMPT = `You are a helpful AI assistant answering questions about documents in a data room.

CRITICAL RULES:
1. Answer ONLY based on the provided document chunks. Do NOT use external knowledge.
2. If the chunks don't contain relevant information, respond EXACTLY with: "ABSTAIN: [reason]"
3. Cite sources using the format [1], [2], etc. corresponding to chunk numbers
4. Keep answers concise and factual
5. If information is contradictory across chunks, mention both viewpoints
6. Never make assumptions or inferences beyond what's explicitly stated

ABSTENTION REASONS:
- "Insufficient information" - Chunks don't address the question
- "Off-topic question" - Question is about unrelated topics
- "Ambiguous question" - Question is too vague to answer definitively

FORMAT:
- Use bullet points for clarity when listing multiple items
- Quote exact phrases when citing specific numbers or terms
- Start citations immediately after relevant statements`;

/**
 * Create Q&A prompt from question and context chunks
 */
function createQAPrompt(question: string, chunks: RetrievedChunk[]): LLMMessage[] {
  const context = formatChunksForLLM(chunks);

  const userPrompt = `QUESTION: ${question}

DOCUMENT CHUNKS:
${context}

ANSWER:`;

  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ];
}

/**
 * Check if response indicates abstention
 */
function checkAbstention(text: string): { abstained: boolean; reason?: string } {
  const abstainPattern = /^ABSTAIN:\s*(.+)/i;
  const match = text.trim().match(abstainPattern);

  if (match) {
    return {
      abstained: true,
      reason: match[1].trim(),
    };
  }

  return { abstained: false };
}

/**
 * Extract confidence score from response if present
 * Format: "Confidence: 0.85" or "(confidence: 85%)"
 */
function extractConfidence(text: string): number | undefined {
  const patterns = [
    /confidence:\s*([0-9.]+)/i,
    /confidence:\s*(\d+)%/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      // Normalize percentage to 0-1 range
      return value > 1 ? value / 100 : value;
    }
  }

  return undefined;
}

/**
 * Generate answer for a question using retrieved chunks (non-streaming)
 *
 * @param question - User's question
 * @param chunks - Retrieved document chunks for context
 * @param options - Generation options
 * @returns Q&A response
 *
 * @example
 * ```typescript
 * const chunks = await retrieveChunks(dataRoomId, question, userId);
 * const response = await generateAnswer(question, chunks, { stream: false });
 *
 * if (response.abstained) {
 *   console.log(`Abstained: ${response.abstainReason}`);
 * } else {
 *   console.log(`Answer: ${response.answer}`);
 * }
 * ```
 */
export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  options: QAGenerationOptions = {}
): Promise<QAResponse> {
  const { temperature, maxTokens, includeConfidence } = {
    ...DEFAULT_QA_OPTIONS,
    ...options,
  };

  // Initialize LLM Manager
  const llmManager = new LLMManager({
    enableFallback: true,
    enableCaching: false,     // Don't cache Q&A responses (context-dependent)
    enableUsageTracking: true,
  });

  await llmManager.initialize();

  // Create prompt
  const messages = createQAPrompt(question, chunks);

  // Generation options
  const genOptions: GenerationOptions = {
    temperature,
    maxTokens,
    stream: false,
  };

  // Generate response
  const response = await llmManager.chat(messages, genOptions, {
    feature: FEATURE_TAG,
  });

  // Check for abstention
  const abstention = checkAbstention(response.content);

  // Extract confidence if requested
  const confidence = includeConfidence ? extractConfidence(response.content) : undefined;

  return {
    answer: abstention.abstained ? '' : response.content,
    abstained: abstention.abstained,
    abstainReason: abstention.reason,
    confidence,
    model: response.model,
    usage: response.usage,
  };
}

/**
 * Generate answer with streaming support
 *
 * @param question - User's question
 * @param chunks - Retrieved document chunks for context
 * @param options - Generation options
 * @returns Async generator yielding answer chunks
 *
 * @example
 * ```typescript
 * const chunks = await retrieveChunks(dataRoomId, question, userId);
 * const stream = generateAnswerStream(question, chunks);
 *
 * for await (const chunk of stream) {
 *   if (chunk.type === 'content') {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 */
export async function* generateAnswerStream(
  question: string,
  chunks: RetrievedChunk[],
  options: QAGenerationOptions = {}
): AsyncGenerator<LLMStreamChunk, void, unknown> {
  const { temperature, maxTokens } = {
    ...DEFAULT_QA_OPTIONS,
    ...options,
  };

  // Initialize LLM Manager
  const llmManager = new LLMManager({
    enableFallback: true,
    enableCaching: false,
    enableUsageTracking: true,
  });

  await llmManager.initialize();

  // Create prompt
  const messages = createQAPrompt(question, chunks);

  // Generation options
  const genOptions: GenerationOptions = {
    temperature,
    maxTokens,
    stream: true,
  };

  // Stream response
  yield* llmManager.chatStream(messages, genOptions, {
    feature: FEATURE_TAG,
  });
}

/**
 * Generate answer as ReadableStream for Next.js streaming responses
 *
 * @param question - User's question
 * @param chunks - Retrieved document chunks for context
 * @param options - Generation options
 * @returns ReadableStream of SSE-formatted chunks
 *
 * @example
 * ```typescript
 * // In Next.js API route:
 * const chunks = await retrieveChunks(dataRoomId, question, userId);
 * const stream = generateAnswerReadableStream(question, chunks);
 *
 * return new Response(stream, {
 *   headers: {
 *     'Content-Type': 'text/event-stream',
 *     'Cache-Control': 'no-cache',
 *     'Connection': 'keep-alive',
 *   },
 * });
 * ```
 */
export function generateAnswerReadableStream(
  question: string,
  chunks: RetrievedChunk[],
  options: QAGenerationOptions = {}
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = generateAnswerStream(question, chunks, options);

        for await (const chunk of stream) {
          // Format as SSE (Server-Sent Events)
          const data = JSON.stringify(chunk);
          const message = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        }

        // Send done event
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        // Send error event
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
}

/**
 * Validate that chunks provide sufficient context for answering
 */
export function hasSufficientContext(
  chunks: RetrievedChunk[],
  minChunks: number = 1,
  minAvgSimilarity: number = 0.7
): boolean {
  if (chunks.length < minChunks) {
    return false;
  }

  const avgSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;

  return avgSimilarity >= minAvgSimilarity;
}

/**
 * Create abstention response
 */
export function createAbstentionResponse(reason: string): QAResponse {
  return {
    answer: '',
    abstained: true,
    abstainReason: reason,
    model: 'none',
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  };
}

/**
 * Constants export
 */
export const CONSTANTS = {
  FEATURE_TAG,
  DEFAULT_TEMPERATURE: DEFAULT_QA_OPTIONS.temperature!,
  DEFAULT_MAX_TOKENS: DEFAULT_QA_OPTIONS.maxTokens!,
  SYSTEM_PROMPT,
} as const;
