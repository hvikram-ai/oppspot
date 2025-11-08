/**
 * LLM Extractor - AI-powered field extraction using Claude Sonnet 3.5
 *
 * Uses vector similarity search to find relevant document chunks,
 * then extracts structured field values using LLM reasoning.
 */

import { BaseExtractor } from './base-extractor';
import type {
  SummaryField,
  ExtractionResult,
  ExtractionContext,
  FieldEvidence,
  DocumentChunk,
} from '../types';
import { createLLMManager, type LLMManager } from '@/lib/llm/manager/LLMManager';

/**
 * Configuration for LLM extraction
 */
export interface LLMExtractorConfig {
  maxChunksPerField?: number; // Default: 5
  similarityThreshold?: number; // Default: 0.7
  temperature?: number; // Default: 0.1 (deterministic)
  maxTokens?: number; // Default: 1000
  timeoutMs?: number; // Default: 30000
}

const DEFAULT_CONFIG: Required<LLMExtractorConfig> = {
  maxChunksPerField: 5,
  similarityThreshold: 0.7,
  temperature: 0.1,
  maxTokens: 1000,
  timeoutMs: 30000,
};

/**
 * LLM-powered field extractor using Claude Sonnet 3.5
 */
export class LLMExtractor extends BaseExtractor {
  private config: Required<LLMExtractorConfig>;

  constructor(config: LLMExtractorConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract field using LLM with vector-retrieved context
   */
  async extractField(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    try {
      // Step 1: Find relevant chunks using vector search
      const relevantChunks = await this.findRelevantChunks(field, context);

      if (relevantChunks.length === 0) {
        return {
          field_key: field.key,
          value: null,
          confidence: 0,
          method: 'llm',
          error: 'No relevant content found for extraction',
        };
      }

      // Step 2: Build extraction prompt
      const prompt = this.buildExtractionPrompt(field, relevantChunks, context);

      // Step 3: Call LLM for extraction
      const llmManager = await createLLMManager({
        defaultProvider: 'openrouter',
        apiKeys: {
          openrouter: process.env.OPENROUTER_API_KEY || '',
        }
      });
      const response = await llmManager.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      // Step 4: Parse LLM response
      const extracted = this.parseLLMResponse(response.content, field);

      // Step 5: Build evidence from chunks
      const evidence: FieldEvidence = {
        text: extracted.excerpt,
        reasoning: extracted.reasoning,
        citations: relevantChunks.slice(0, 3).map((chunk) => ({
          page: chunk.page_number,
          chunk: chunk.chunk_index,
          text: chunk.content.substring(0, 200) + '...',
        })),
      };

      return {
        field_key: field.key,
        value: extracted.value,
        raw_value: extracted.raw_value,
        confidence: extracted.confidence,
        evidence,
        page_number: relevantChunks[0]?.page_number,
        chunk_index: relevantChunks[0]?.chunk_index,
        method: 'llm',
      };
    } catch (error) {
      console.error(`[LLMExtractor] Error extracting field ${field.key}:`, error);
      return {
        field_key: field.key,
        value: null,
        confidence: 0,
        method: 'llm',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find relevant document chunks using vector similarity
   */
  private async findRelevantChunks(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<DocumentChunk[]> {
    // If chunks provided in context, use them
    if (context.document_chunks && context.document_chunks.length > 0) {
      // Simple keyword matching as fallback if no embeddings
      const query = `${field.title} ${field.description || ''} ${field.source_hint || ''}`.toLowerCase();
      const keywords = query.split(/\s+/).filter((w) => w.length > 3);

      const scored = context.document_chunks.map((chunk) => {
        const content = chunk.content.toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
          return acc + (content.includes(keyword) ? 1 : 0);
        }, 0);
        return { chunk, score };
      });

      return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxChunksPerField)
        .map((s) => s.chunk);
    }

    // If no chunks available, return empty
    // TODO: In production, integrate with vector search via Supabase
    return [];
  }

  /**
   * Build extraction prompt for LLM
   */
  private buildExtractionPrompt(
    field: SummaryField,
    chunks: DocumentChunk[],
    context: ExtractionContext
  ): string {
    const chunksText = chunks
      .map((c, i) => `[Chunk ${i + 1} - Page ${c.page_number}]\n${c.content}`)
      .join('\n\n');

    return `Extract the following field from the document:

**Field**: ${field.title}
**Description**: ${field.description || 'N/A'}
**Type**: ${field.field_type}
**Required**: ${field.required ? 'Yes' : 'No'}
${field.source_hint ? `**Where to look**: ${field.source_hint}` : ''}

**Document Type**: ${context.template.doc_type || 'Unknown'}
**Template**: ${context.template.title}

**Relevant Document Excerpts**:
${chunksText}

**Instructions**:
1. Extract the value for "${field.title}" from the excerpts above
2. Return ONLY valid JSON in this exact format:
{
  "value": <extracted value matching field type>,
  "raw_value": "<exact text from document>",
  "excerpt": "<relevant excerpt showing the value>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation of extraction>"
}

**Field Type Guidelines**:
- string: Return plain text
- number: Return numeric value without units
- boolean: Return true or false
- date: Return ISO8601 format (YYYY-MM-DD)
- enum: Return one of the allowed values
- currency: Return numeric amount (without symbols)
- duration: Return numeric value with unit in raw_value
- json: Return structured object/array
- richtext: Return markdown-formatted text

**Important**:
- If the field is not found or unclear, set "value" to null and "confidence" to 0.0
- Be conservative with confidence scores (0.9+ only for explicit, unambiguous values)
- Include the exact text excerpt that supports your extraction
- Explain your reasoning briefly

Return only the JSON object, no additional text.`;
  }

  /**
   * Get system prompt for LLM
   */
  private getSystemPrompt(): string {
    return `You are a precise document analysis assistant specializing in extracting structured data from business documents (contracts, corporate profiles, policies, etc.).

Your task is to extract specific field values with high accuracy and appropriate confidence scoring.

Key principles:
- Be precise and conservative with confidence scores
- Always provide evidence from the document
- Follow the exact field type requirements
- Return null if information is not found or ambiguous
- Never guess or fabricate information
- Extract only what is explicitly stated in the document`;
  }

  /**
   * Parse LLM response JSON
   */
  private parseLLMResponse(
    content: string,
    field: SummaryField
  ): {
    value: unknown;
    raw_value: string;
    excerpt: string;
    confidence: number;
    reasoning: string;
  } {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
                       content.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[1]);

      return {
        value: parsed.value ?? null,
        raw_value: parsed.raw_value || '',
        excerpt: parsed.excerpt || '',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('[LLMExtractor] Failed to parse LLM response:', error);
      return {
        value: null,
        raw_value: '',
        excerpt: '',
        confidence: 0,
        reasoning: `Parse error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  getExtractionMethod(): 'llm' {
    return 'llm';
  }

  async canExtract(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<boolean> {
    // LLM can always attempt extraction if chunks are available
    return (
      context.document_chunks !== undefined &&
      context.document_chunks.length > 0
    );
  }

  async getConfidenceScore(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<number> {
    // LLM is medium priority - use after reuse, before manual
    const hasChunks =
      context.document_chunks && context.document_chunks.length > 0;

    if (!hasChunks) {
      return 0; // Cannot extract without chunks
    }

    // Base confidence of 0.6 for LLM extraction
    let confidence = 0.6;

    // Boost if source hint is provided (better targeting)
    if (field.source_hint) {
      confidence += 0.1;
    }

    // Boost if field type is simple (string, boolean, enum)
    if (['string', 'boolean', 'enum'].includes(field.field_type)) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }
}
