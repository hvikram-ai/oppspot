/**
 * Export Manager - Central export orchestration
 *
 * Manages all export formats and provides a unified API for exporting summaries.
 * Supports JSON, Excel (.xlsx), and Word (.docx) formats.
 */

import { getJSONExporter } from './json-exporter';
import { getExcelExporter } from './excel-exporter';
import { getWordExporter } from './word-exporter';
import { getSummaryRepository } from '../repository/summary-repository';
import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  SummaryWithFields,
} from '../types';

/**
 * Export manager class
 */
export class ExportManager {
  private jsonExporter = getJSONExporter();
  private excelExporter = getExcelExporter();
  private wordExporter = getWordExporter();
  private repository = getSummaryRepository();

  /**
   * Export a summary in the specified format
   */
  async export(
    summaryId: string,
    format: ExportFormat,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    // Get summary with all related data
    const summary = await this.repository.getSummaryWithFields(summaryId);
    if (!summary) {
      throw new Error(`Summary not found: ${summaryId}`);
    }

    // Build full options with defaults
    const fullOptions: ExportOptions = {
      format,
      include_confidence: options.include_confidence ?? true,
      include_evidence: options.include_evidence ?? false,
      include_quality_issues: options.include_quality_issues ?? true,
      filename: options.filename,
    };

    // Export based on format
    return await this.exportSummary(summary, fullOptions);
  }

  /**
   * Export by document ID (gets latest summary)
   */
  async exportByDocument(
    documentId: string,
    format: ExportFormat,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    // Get latest summary for document
    const summary = await this.repository.getSummary(documentId);
    if (!summary) {
      throw new Error(`No summary found for document: ${documentId}`);
    }

    // Get full summary with fields
    const fullSummary = await this.repository.getSummaryWithFields(summary.id);
    if (!fullSummary) {
      throw new Error(`Failed to load summary data`);
    }

    // Build options
    const fullOptions: ExportOptions = {
      format,
      include_confidence: options.include_confidence ?? true,
      include_evidence: options.include_evidence ?? false,
      include_quality_issues: options.include_quality_issues ?? true,
      filename: options.filename,
    };

    return await this.exportSummary(fullSummary, fullOptions);
  }

  /**
   * Export multiple summaries
   */
  async exportBatch(
    summaryIds: string[],
    format: ExportFormat,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    // Load all summaries
    const summaries = await Promise.all(
      summaryIds.map((id) => this.repository.getSummaryWithFields(id))
    );

    // Filter out null summaries
    const validSummaries = summaries.filter((s): s is SummaryWithFields => s !== null);

    if (validSummaries.length === 0) {
      throw new Error('No valid summaries found');
    }

    // Build options
    const fullOptions: ExportOptions = {
      format,
      include_confidence: options.include_confidence ?? true,
      include_evidence: options.include_evidence ?? false,
      include_quality_issues: options.include_quality_issues ?? true,
      filename: options.filename,
    };

    // Export based on format
    switch (format) {
      case 'json':
        return await this.jsonExporter.exportBatch(validSummaries, fullOptions);
      case 'xlsx':
        return await this.excelExporter.exportBatch(validSummaries, fullOptions);
      case 'docx':
        return await this.wordExporter.exportBatch(validSummaries, fullOptions);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export a summary (internal helper)
   */
  private async exportSummary(
    summary: SummaryWithFields,
    options: ExportOptions
  ): Promise<ExportResult> {
    switch (options.format) {
      case 'json':
        return await this.jsonExporter.export(summary, options);
      case 'xlsx':
        return await this.excelExporter.export(summary, options);
      case 'docx':
        return await this.wordExporter.export(summary, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): ExportFormat[] {
    return ['json', 'xlsx', 'docx'];
  }

  /**
   * Validate export options
   */
  validateOptions(options: Partial<ExportOptions>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (options.format && !this.getAvailableFormats().includes(options.format)) {
      errors.push(`Invalid format: ${options.format}`);
    }

    if (options.filename) {
      // Check filename doesn't contain path separators
      if (options.filename.includes('/') || options.filename.includes('\\')) {
        errors.push('Filename cannot contain path separators');
      }

      // Check filename length
      if (options.filename.length > 255) {
        errors.push('Filename too long (max 255 characters)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get export format from filename extension
   */
  getFormatFromFilename(filename: string): ExportFormat | null {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'json':
        return 'json';
      case 'xlsx':
      case 'xls':
        return 'xlsx';
      case 'docx':
      case 'doc':
        return 'docx';
      default:
        return null;
    }
  }

  /**
   * Generate default filename for a summary
   */
  generateFilename(
    summary: SummaryWithFields,
    format: ExportFormat
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const templateKey = summary.template.key.replace(/[^a-z0-9]/gi, '-');
    const extension = format === 'xlsx' ? 'xlsx' : format === 'docx' ? 'docx' : 'json';

    return `summary-${templateKey}-${timestamp}.${extension}`;
  }

  /**
   * Estimate export size (rough approximation)
   */
  estimateSize(summary: SummaryWithFields, format: ExportFormat): number {
    const fieldCount = summary.fields.length;
    const issueCount = summary.qualityIssues.length;

    // Rough estimates in bytes
    switch (format) {
      case 'json':
        // JSON is approximately 500 bytes per field + 200 per issue
        return fieldCount * 500 + issueCount * 200 + 1000;
      case 'xlsx':
        // Excel is approximately 1KB per field + 500 per issue + overhead
        return fieldCount * 1024 + issueCount * 512 + 5000;
      case 'docx':
        // Word is approximately 2KB per field + 1KB per issue + overhead
        return fieldCount * 2048 + issueCount * 1024 + 10000;
      default:
        return 0;
    }
  }

  /**
   * Check if export would exceed size limit
   */
  checkSizeLimit(
    summary: SummaryWithFields,
    format: ExportFormat,
    maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
  ): { withinLimit: boolean; estimatedSize: number; maxSize: number } {
    const estimatedSize = this.estimateSize(summary, format);

    return {
      withinLimit: estimatedSize <= maxSizeBytes,
      estimatedSize,
      maxSize: maxSizeBytes,
    };
  }
}

/**
 * Singleton instance
 */
let managerInstance: ExportManager | null = null;

/**
 * Get or create export manager instance
 */
export function getExportManager(): ExportManager {
  if (!managerInstance) {
    managerInstance = new ExportManager();
  }
  return managerInstance;
}
