/**
 * Base Extractor - Abstract interface for field extraction
 *
 * All extractors (LLM, reuse, manual) implement this interface
 * to provide a consistent extraction API.
 */

import type {
  SummaryField,
  ExtractionResult,
  ExtractionContext,
} from '../types';

/**
 * Abstract base class for all field extractors
 */
export abstract class BaseExtractor {
  /**
   * Extract a single field value from the document
   *
   * @param field - The field definition to extract
   * @param context - Extraction context (document, chunks, existing data)
   * @returns Extraction result with value, confidence, and evidence
   */
  abstract extractField(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<ExtractionResult>;

  /**
   * Extract multiple fields in batch (optional optimization)
   *
   * Default implementation calls extractField sequentially.
   * Subclasses can override for parallel processing.
   *
   * @param fields - Array of field definitions
   * @param context - Extraction context
   * @returns Array of extraction results
   */
  async extractFields(
    fields: SummaryField[],
    context: ExtractionContext
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    for (const field of fields) {
      try {
        const result = await this.extractField(field, context);
        results.push(result);
      } catch (error) {
        // Log error but continue with other fields
        console.error(`[BaseExtractor] Failed to extract field ${field.key}:`, error);
        results.push({
          field_key: field.key,
          value: null,
          confidence: 0,
          method: this.getExtractionMethod(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get the extraction method identifier
   *
   * @returns Method name ('reuse', 'llm', 'manual')
   */
  abstract getExtractionMethod(): 'reuse' | 'llm' | 'manual';

  /**
   * Check if this extractor can handle the given field
   *
   * @param field - Field to check
   * @param context - Extraction context
   * @returns True if extractor can handle this field
   */
  abstract canExtract(field: SummaryField, context: ExtractionContext): Promise<boolean>;

  /**
   * Get confidence score for extraction capability
   *
   * Used by orchestrator to choose best extractor.
   *
   * @param field - Field to extract
   * @param context - Extraction context
   * @returns Confidence score 0-1 (0 = cannot extract, 1 = perfect match)
   */
  abstract getConfidenceScore(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<number>;
}

/**
 * Extractor priority levels for orchestration
 */
export enum ExtractorPriority {
  HIGH = 3, // Try first (e.g., reuse existing data)
  MEDIUM = 2, // Try second (e.g., LLM extraction)
  LOW = 1, // Fallback (e.g., manual)
}

/**
 * Extractor metadata for registration
 */
export interface ExtractorMetadata {
  name: string;
  priority: ExtractorPriority;
  description: string;
  costPerExtraction?: number; // relative cost (1 = cheap, 10 = expensive)
}

/**
 * Extractor factory interface
 */
export interface ExtractorFactory {
  create(): BaseExtractor;
  getMetadata(): ExtractorMetadata;
}
