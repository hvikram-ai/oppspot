/**
 * JSON Exporter - Export summaries to JSON format
 *
 * Exports complete summary data including:
 * - Template metadata
 * - Field definitions
 * - Extracted values with confidence
 * - Evidence and citations
 * - Quality metrics and issues
 */

import type {
  SummaryWithFields,
  JSONExport,
  ExportOptions,
  ExportResult,
} from '../types';
import { EXPORT_MIMETYPES } from '../types';

export class JSONExporter {
  /**
   * Export summary to JSON format
   */
  async export(
    summary: SummaryWithFields,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Build JSON export structure
      const jsonExport: JSONExport = {
        summary: {
          id: summary.id,
          run_id: summary.run_id,
          document_id: summary.document_id,
          template_id: summary.template_id,
          coverage: summary.coverage,
          avg_confidence: summary.avg_confidence,
          quality_pass: summary.quality_pass,
          created_at: summary.created_at,
        },
        template: {
          id: summary.template.id,
          org_id: summary.template.org_id,
          key: summary.template.key,
          title: summary.template.title,
          description: summary.template.description,
          doc_type: summary.template.doc_type,
          version: summary.template.version,
          active: summary.template.active,
          required_coverage: summary.template.required_coverage,
          min_confidence: summary.template.min_confidence,
          created_at: summary.template.created_at,
          updated_at: summary.template.updated_at,
        },
        fields: summary.fields.map((f) => ({
          field: {
            id: f.field.id,
            template_id: f.field.template_id,
            key: f.field.key,
            title: f.field.title,
            description: f.field.description,
            field_type: f.field.field_type,
            required: f.field.required,
            source_hint: f.field.source_hint,
            normalizer: f.field.normalizer,
            validation: f.field.validation,
            order_index: f.field.order_index,
            created_at: f.field.created_at,
          },
          value: f.value
            ? {
                id: f.value.id,
                summary_id: f.value.summary_id,
                field_id: f.value.field_id,
                value_json: f.value.value_json,
                raw_value: f.value.raw_value,
                confidence: f.value.confidence,
                evidence: options.include_evidence ? f.value.evidence : undefined,
                page_number: f.value.page_number,
                chunk_index: f.value.chunk_index,
                start_char: f.value.start_char,
                end_char: f.value.end_char,
                extraction_method: f.value.extraction_method,
                created_at: f.value.created_at,
              }
            : null,
        })),
        quality: {
          coverage: summary.coverage,
          avg_confidence: summary.avg_confidence,
          quality_pass: summary.quality_pass,
          issues: options.include_quality_issues ? summary.qualityIssues : [],
        },
        metadata: {
          exported_at: new Date().toISOString(),
          exported_by: null, // Set by caller if needed
        },
      };

      // Optionally filter out evidence if not requested
      if (!options.include_evidence) {
        jsonExport.fields.forEach((f) => {
          if (f.value) {
            delete f.value.evidence;
          }
        });
      }

      // Convert to JSON string with formatting
      const jsonString = JSON.stringify(jsonExport, null, 2);
      const buffer = Buffer.from(jsonString, 'utf-8');

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename =
        options.filename ||
        `summary-${summary.template.key}-${timestamp}.json`;

      return {
        format: 'json',
        filename,
        buffer,
        mimetype: EXPORT_MIMETYPES.json,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export multiple summaries to JSON array
   */
  async exportBatch(
    summaries: SummaryWithFields[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const exports = await Promise.all(
        summaries.map(async (summary) => {
          const result = await this.export(summary, options);
          return JSON.parse(result.buffer.toString('utf-8'));
        })
      );

      const jsonString = JSON.stringify(exports, null, 2);
      const buffer = Buffer.from(jsonString, 'utf-8');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename =
        options.filename || `summaries-batch-${timestamp}.json`;

      return {
        format: 'json',
        filename,
        buffer,
        mimetype: EXPORT_MIMETYPES.json,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Batch JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export summary as pretty-printed JSON string (for API responses)
   */
  exportString(summary: SummaryWithFields, options: ExportOptions): string {
    const jsonExport: JSONExport = {
      summary: {
        id: summary.id,
        run_id: summary.run_id,
        document_id: summary.document_id,
        template_id: summary.template_id,
        coverage: summary.coverage,
        avg_confidence: summary.avg_confidence,
        quality_pass: summary.quality_pass,
        created_at: summary.created_at,
      },
      template: summary.template,
      fields: summary.fields,
      quality: {
        coverage: summary.coverage,
        avg_confidence: summary.avg_confidence,
        quality_pass: summary.quality_pass,
        issues: options.include_quality_issues ? summary.qualityIssues : [],
      },
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: null,
      },
    };

    return JSON.stringify(jsonExport, null, 2);
  }

  /**
   * Export summary as compact JSON (minified)
   */
  exportCompact(summary: SummaryWithFields): string {
    const data = {
      summary_id: summary.id,
      document_id: summary.document_id,
      template: summary.template.key,
      coverage: summary.coverage,
      confidence: summary.avg_confidence,
      quality_pass: summary.quality_pass,
      fields: summary.fields.reduce((acc, f) => {
        if (f.value) {
          acc[f.field.key] = {
            value: f.value.value_json,
            confidence: f.value.confidence,
          };
        }
        return acc;
      }, {} as Record<string, { value: unknown; confidence: number }>),
    };

    return JSON.stringify(data);
  }
}

/**
 * Singleton instance
 */
let exporterInstance: JSONExporter | null = null;

/**
 * Get or create exporter instance
 */
export function getJSONExporter(): JSONExporter {
  if (!exporterInstance) {
    exporterInstance = new JSONExporter();
  }
  return exporterInstance;
}
