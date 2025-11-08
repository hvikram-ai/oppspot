/**
 * Summary Service - Main orchestration service for document summarization
 *
 * 5-Step Extraction Pipeline:
 * 1. Load template and fields
 * 2. Choose extractors for each field (orchestration)
 * 3. Extract field values (parallel when possible)
 * 4. Normalize extracted values
 * 5. Validate quality and enforce gates
 */

import { getSummaryRepository } from './repository/summary-repository';
import { BaseExtractor } from './extractors/base-extractor';
import { LLMExtractor } from './extractors/llm-extractor';
import { ContractReuseExtractor } from './extractors/contract-reuse-extractor';
import { getFieldNormalizer } from './normalizers/field-normalizer';
import { getQualityChecker } from './quality-checker';
import type {
  SummaryTemplate,
  SummaryField,
  SummaryRun,
  DocumentSummary,
  SummaryFieldValue,
  ExtractionContext,
  ExtractionResult,
  RunDetails,
  SummaryServiceConfig,
  DocumentChunk,
} from './types';

/**
 * Result of summarization process
 */
export interface SummarizationResult {
  run: SummaryRun;
  summary: DocumentSummary | null;
  success: boolean;
  error?: string;
}

/**
 * Main summary service
 */
export class SummaryService {
  private repository = getSummaryRepository();
  private normalizer = getFieldNormalizer();
  private qualityChecker = getQualityChecker();
  private extractors: BaseExtractor[] = [];
  private config: Required<SummaryServiceConfig>;

  constructor(config: SummaryServiceConfig = {}) {
    this.config = {
      llm_provider: config.llm_provider || 'openrouter',
      llm_model: config.llm_model || 'anthropic/claude-3.5-sonnet',
      max_chunks_per_field: config.max_chunks_per_field || 5,
      similarity_threshold: config.similarity_threshold || 0.7,
      extraction_timeout_ms: config.extraction_timeout_ms || 30000,
      parallel_extractions: config.parallel_extractions ?? true,
    };

    // Initialize extractors in priority order
    this.initializeExtractors();
  }

  /**
   * Initialize extractors in priority order
   */
  private initializeExtractors(): void {
    // Priority 1: Contract reuse (fast, cheap, reliable)
    this.extractors.push(new ContractReuseExtractor());

    // Priority 2: LLM extraction (accurate but slower/expensive)
    this.extractors.push(
      new LLMExtractor({
        maxChunksPerField: this.config.max_chunks_per_field,
        similarityThreshold: this.config.similarity_threshold,
        timeoutMs: this.config.extraction_timeout_ms,
      })
    );

    // Priority 3: Manual extraction would go here (future)
  }

  /**
   * Main entry point: Summarize a document
   */
  async summarize(
    documentId: string,
    options?: {
      templateKey?: string;
      userId?: string;
      force?: boolean;
      existingExtractions?: Record<string, unknown>;
      documentChunks?: DocumentChunk[];
    }
  ): Promise<SummarizationResult> {
    const startTime = Date.now();

    try {
      // Check for existing summary
      if (!options?.force) {
        const existing = await this.repository.getSummary(documentId);
        if (existing && existing.quality_pass) {
          const run = await this.repository.getLatestRun(documentId);
          return {
            run: run!,
            summary: existing,
            success: true,
          };
        }
      }

      // Step 1: Load template and fields
      const { template, fields } = await this.loadTemplateAndFields(
        options?.templateKey,
        documentId
      );

      // Create run record
      const run = await this.repository.createRun(
        documentId,
        template.id,
        options?.userId
      );

      try {
        // Update run to "running"
        await this.repository.updateRunStatus(run.id, 'running');

        // Step 2: Build extraction context
        const context: ExtractionContext = {
          document_id: documentId,
          template,
          fields,
          existing_extractions: options?.existingExtractions,
          document_chunks: options?.documentChunks,
        };

        // Step 3: Extract field values
        const extractionResults = await this.extractAllFields(fields, context);

        // Step 4: Normalize extracted values
        const normalizedResults = await this.normalizeResults(fields, extractionResults);

        // Step 5: Validate quality
        const qualityResult = this.qualityChecker.checkQuality(
          template,
          fields,
          normalizedResults.map((r) => r.value).filter((v) => v !== null) as SummaryFieldValue[]
        );

        // Create summary record
        const summary = await this.repository.createSummary(
          run.id,
          documentId,
          template.id,
          qualityResult.coverage,
          qualityResult.avg_confidence,
          qualityResult.quality_pass
        );

        // Insert field values
        const fieldValuesToInsert = normalizedResults
          .filter((r) => r.value !== null)
          .map((r) => r.value!);

        if (fieldValuesToInsert.length > 0) {
          await this.repository.insertFieldValues(summary.id, fieldValuesToInsert);
        }

        // Insert quality issues
        if (qualityResult.issues.length > 0) {
          await this.repository.insertQualityIssues(run.id, qualityResult.issues);
        }

        // Calculate final metrics
        const duration = Date.now() - startTime;
        const runDetails: RunDetails = {
          fields_extracted: normalizedResults.filter((r) => r.value !== null).length,
          fields_failed: normalizedResults.filter((r) => r.error).length,
          extraction_times: normalizedResults.reduce((acc, r) => {
            if (r.extractionTimeMs) {
              acc[r.fieldKey] = r.extractionTimeMs;
            }
            return acc;
          }, {} as Record<string, number>),
          reused_extractions: normalizedResults.filter((r) => r.method === 'reuse').length,
          llm_extractions: normalizedResults.filter((r) => r.method === 'llm').length,
        };

        // Update run with final status
        const finalStatus = qualityResult.quality_pass ? 'success' : 'partial';
        await this.repository.updateRunStatus(run.id, finalStatus, {
          coverage: qualityResult.coverage,
          avg_confidence: qualityResult.avg_confidence,
          quality_pass: qualityResult.quality_pass,
          finished_at: new Date().toISOString(),
          duration_ms: duration,
          details: runDetails,
        });

        // Fetch updated run
        const finalRun = await this.repository.getRun(run.id);

        return {
          run: finalRun!,
          summary,
          success: true,
        };
      } catch (error) {
        // Update run with error status
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.repository.updateRunStatus(run.id, 'error', {
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          details: {
            error: errorMessage,
          },
        });

        const finalRun = await this.repository.getRun(run.id);

        return {
          run: finalRun!,
          summary: null,
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SummaryService] Summarization failed:', error);

      // Return error result without run (template loading failed)
      return {
        run: {} as SummaryRun, // Placeholder
        summary: null,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Step 1: Load template and fields
   */
  private async loadTemplateAndFields(
    templateKey?: string,
    documentId?: string
  ): Promise<{ template: SummaryTemplate; fields: SummaryField[] }> {
    // If template key provided, use it
    if (templateKey) {
      const template = await this.repository.getTemplateByKey(templateKey);
      if (!template) {
        throw new Error(`Template not found: ${templateKey}`);
      }

      const fields = await this.repository.getTemplateFields(template.id);
      return { template, fields };
    }

    // Otherwise, auto-detect template based on document type
    // TODO: Implement document type detection
    // For now, default to MSA template
    const template = await this.repository.getTemplateByKey('msa_standard');
    if (!template) {
      throw new Error('Default template (msa_standard) not found');
    }

    const fields = await this.repository.getTemplateFields(template.id);
    return { template, fields };
  }

  /**
   * Step 2: Choose best extractor for each field
   */
  private async chooseExtractor(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<BaseExtractor | null> {
    let bestExtractor: BaseExtractor | null = null;
    let bestScore = 0;

    for (const extractor of this.extractors) {
      const canExtract = await extractor.canExtract(field, context);
      if (!canExtract) continue;

      const score = await extractor.getConfidenceScore(field, context);
      if (score > bestScore) {
        bestScore = score;
        bestExtractor = extractor;
      }
    }

    return bestExtractor;
  }

  /**
   * Step 3: Extract all field values
   */
  private async extractAllFields(
    fields: SummaryField[],
    context: ExtractionContext
  ): Promise<ExtractionResult[]> {
    if (this.config.parallel_extractions) {
      // Extract in parallel
      return await Promise.all(
        fields.map((field) => this.extractSingleField(field, context))
      );
    } else {
      // Extract sequentially
      const results: ExtractionResult[] = [];
      for (const field of fields) {
        const result = await this.extractSingleField(field, context);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Extract a single field using the best extractor
   */
  private async extractSingleField(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      // Choose best extractor
      const extractor = await this.chooseExtractor(field, context);

      if (!extractor) {
        return {
          field_key: field.key,
          value: null,
          confidence: 0,
          method: 'llm', // Default
          error: 'No suitable extractor found',
        };
      }

      // Extract with timeout
      const result = await this.withTimeout(
        extractor.extractField(field, context),
        this.config.extraction_timeout_ms,
        `Extraction timeout for field: ${field.key}`
      );

      return result;
    } catch (error) {
      console.error(`[SummaryService] Field extraction failed for ${field.key}:`, error);
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
   * Step 4: Normalize extracted values
   */
  private async normalizeResults(
    fields: SummaryField[],
    results: ExtractionResult[]
  ): Promise<
    Array<{
      fieldKey: string;
      method: 'reuse' | 'llm' | 'manual';
      value: Omit<SummaryFieldValue, 'id' | 'summary_id' | 'created_at'> | null;
      error?: string;
      extractionTimeMs?: number;
    }>
  > {
    return results.map((result) => {
      const field = fields.find((f) => f.key === result.field_key);
      if (!field) {
        return {
          fieldKey: result.field_key,
          method: result.method,
          value: null,
          error: 'Field definition not found',
        };
      }

      // Skip normalization if extraction failed
      if (result.error || result.value === null) {
        return {
          fieldKey: result.field_key,
          method: result.method,
          value: null,
          error: result.error || 'No value extracted',
        };
      }

      // Normalize value
      const normalizeResult = this.normalizer.normalize(
        result.value,
        field.field_type,
        field.normalizer
      );

      if (!normalizeResult.normalized || normalizeResult.value === null) {
        return {
          fieldKey: result.field_key,
          method: result.method,
          value: null,
          error: normalizeResult.error || 'Normalization failed',
        };
      }

      // Build field value object
      const fieldValue: Omit<SummaryFieldValue, 'id' | 'summary_id' | 'created_at'> = {
        field_id: field.id,
        value_json: normalizeResult.value,
        raw_value: result.raw_value || null,
        confidence: result.confidence,
        evidence: result.evidence || null,
        page_number: result.page_number || null,
        chunk_index: result.chunk_index || null,
        start_char: result.start_char || null,
        end_char: result.end_char || null,
        extraction_method: result.method,
      };

      return {
        fieldKey: result.field_key,
        method: result.method,
        value: fieldValue,
      };
    });
  }

  /**
   * Utility: Execute with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Get summary with all details
   */
  async getSummaryWithFields(documentId: string, templateId?: string) {
    const summary = await this.repository.getSummary(documentId, templateId);
    if (!summary) return null;

    return await this.repository.getSummaryWithFields(summary.id);
  }

  /**
   * Get available templates
   */
  async getTemplates(orgId?: string) {
    return await this.repository.getActiveTemplates(orgId);
  }

  /**
   * Get extraction history for a document
   */
  async getDocumentRuns(documentId: string, limit = 10) {
    return await this.repository.getDocumentRuns(documentId, { limit });
  }
}

/**
 * Singleton instance
 */
let serviceInstance: SummaryService | null = null;

/**
 * Get or create service instance
 */
export function getSummaryService(config?: SummaryServiceConfig): SummaryService {
  if (!serviceInstance) {
    serviceInstance = new SummaryService(config);
  }
  return serviceInstance;
}
