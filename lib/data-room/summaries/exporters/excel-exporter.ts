/**
 * Excel Exporter - Export summaries to Excel (.xlsx) format
 *
 * Creates a structured Excel workbook with:
 * - Summary sheet: Overview and metrics
 * - Fields sheet: Extracted field values
 * - Quality sheet: Quality issues and validation
 */

import * as XLSX from 'xlsx';
import type {
  SummaryWithFields,
  ExportOptions,
  ExportResult,
} from '../types';
import { EXPORT_MIMETYPES } from '../types';

export class ExcelExporter {
  /**
   * Export summary to Excel format
   */
  async export(
    summary: SummaryWithFields,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary Overview
      this.addSummarySheet(workbook, summary, options);

      // Sheet 2: Field Values
      this.addFieldsSheet(workbook, summary, options);

      // Sheet 3: Quality Issues (if requested)
      if (options.include_quality_issues && summary.qualityIssues.length > 0) {
        this.addQualitySheet(workbook, summary);
      }

      // Write to buffer
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename =
        options.filename ||
        `summary-${summary.template.key}-${timestamp}.xlsx`;

      return {
        format: 'xlsx',
        filename,
        buffer: Buffer.from(buffer),
        mimetype: EXPORT_MIMETYPES.xlsx,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Excel export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add summary overview sheet
   */
  private addSummarySheet(
    workbook: XLSX.WorkBook,
    summary: SummaryWithFields,
    options: ExportOptions
  ): void {
    const data: Array<[string, string | number | boolean]> = [
      ['Summary Report', ''],
      ['', ''],
      ['Document ID', summary.document_id],
      ['Template', summary.template.title],
      ['Template Key', summary.template.key],
      ['Template Version', summary.template.version],
      ['Document Type', summary.template.doc_type || 'N/A'],
      ['', ''],
      ['Quality Metrics', ''],
      ['Coverage', `${Math.round(summary.coverage * 100)}%`],
      ['Average Confidence', `${Math.round(summary.avg_confidence * 100)}%`],
      ['Quality Pass', summary.quality_pass ? 'YES' : 'NO'],
      ['', ''],
      ['Extraction Details', ''],
      ['Total Fields', summary.fields.length],
      [
        'Required Fields',
        summary.fields.filter((f) => f.field.required).length,
      ],
      [
        'Extracted Fields',
        summary.fields.filter((f) => f.value !== null).length,
      ],
      [
        'Missing Fields',
        summary.fields.filter((f) => f.field.required && !f.value).length,
      ],
      ['', ''],
      ['Thresholds', ''],
      [
        'Required Coverage',
        `${Math.round(summary.template.required_coverage * 100)}%`,
      ],
      [
        'Minimum Confidence',
        `${Math.round(summary.template.min_confidence * 100)}%`,
      ],
      ['', ''],
      ['Export Information', ''],
      ['Exported At', new Date().toISOString()],
      ['Summary Created', summary.created_at],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [{ wch: 25 }, { wch: 40 }];

    // Add styling (bold headers)
    const boldCells = ['A1', 'A9', 'A14', 'A20', 'A24'];
    boldCells.forEach((cell) => {
      if (worksheet[cell]) {
        worksheet[cell].s = { font: { bold: true } };
      }
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  /**
   * Add fields sheet with extracted values
   */
  private addFieldsSheet(
    workbook: XLSX.WorkBook,
    summary: SummaryWithFields,
    options: ExportOptions
  ): void {
    // Build header row
    const headers = [
      'Field',
      'Type',
      'Required',
      'Value',
      'Raw Value',
    ];

    if (options.include_confidence) {
      headers.push('Confidence');
    }

    headers.push('Extraction Method', 'Page Number');

    if (options.include_evidence) {
      headers.push('Evidence');
    }

    // Build data rows
    const rows = summary.fields.map((f) => {
      const row: Array<string | number | boolean | null> = [
        f.field.title,
        f.field.field_type,
        f.field.required ? 'Yes' : 'No',
        this.formatValue(f.value?.value_json),
        f.value?.raw_value || '',
      ];

      if (options.include_confidence) {
        row.push(
          f.value ? `${Math.round(f.value.confidence * 100)}%` : 'N/A'
        );
      }

      row.push(
        f.value?.extraction_method || 'N/A',
        f.value?.page_number || ''
      );

      if (options.include_evidence) {
        row.push(
          f.value?.evidence?.text
            ? f.value.evidence.text.substring(0, 200)
            : ''
        );
      }

      return row;
    });

    // Create worksheet
    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Field
      { wch: 12 }, // Type
      { wch: 10 }, // Required
      { wch: 30 }, // Value
      { wch: 30 }, // Raw Value
    ];

    if (options.include_confidence) {
      worksheet['!cols']!.push({ wch: 12 }); // Confidence
    }

    worksheet['!cols']!.push(
      { wch: 15 }, // Method
      { wch: 10 } // Page
    );

    if (options.include_evidence) {
      worksheet['!cols']!.push({ wch: 50 }); // Evidence
    }

    // Add autofilter
    worksheet['!autofilter'] = { ref: `A1:${this.getColumnLetter(headers.length - 1)}${rows.length + 1}` };

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Field Values');
  }

  /**
   * Add quality issues sheet
   */
  private addQualitySheet(
    workbook: XLSX.WorkBook,
    summary: SummaryWithFields
  ): void {
    const headers = [
      'Severity',
      'Field',
      'Issue',
      'Remediation',
    ];

    const rows = summary.qualityIssues.map((issue) => [
      issue.severity.toUpperCase(),
      issue.field_key || 'General',
      issue.issue,
      issue.remediation || '',
    ]);

    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Severity
      { wch: 25 }, // Field
      { wch: 50 }, // Issue
      { wch: 50 }, // Remediation
    ];

    // Add conditional formatting for severity
    // Note: xlsx library doesn't support full conditional formatting,
    // but we can add cell colors manually
    for (let i = 2; i <= rows.length + 1; i++) {
      const severityCell = `A${i}`;
      if (worksheet[severityCell]) {
        const severity = worksheet[severityCell].v;
        if (severity === 'HIGH') {
          worksheet[severityCell].s = { fill: { fgColor: { rgb: 'FFCCCC' } } };
        } else if (severity === 'MEDIUM') {
          worksheet[severityCell].s = { fill: { fgColor: { rgb: 'FFFFCC' } } };
        } else {
          worksheet[severityCell].s = { fill: { fgColor: { rgb: 'CCFFCC' } } };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quality Issues');
  }

  /**
   * Format value for display in Excel
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      // For objects/arrays, show JSON representation
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Get Excel column letter from index (0-based)
   */
  private getColumnLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  /**
   * Export multiple summaries to single Excel file with multiple sheets
   */
  async exportBatch(
    summaries: SummaryWithFields[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const workbook = XLSX.utils.book_new();

      // Create a sheet for each summary
      summaries.forEach((summary, index) => {
        const sheetName = `Summary ${index + 1}`;

        // Add summary data as a simple table
        const headers = ['Field', 'Value', 'Confidence'];
        const rows = summary.fields
          .filter((f) => f.value !== null)
          .map((f) => [
            f.field.title,
            this.formatValue(f.value!.value_json),
            `${Math.round(f.value!.confidence * 100)}%`,
          ]);

        const data = [
          [summary.template.title],
          [`Document: ${summary.document_id}`],
          [`Coverage: ${Math.round(summary.coverage * 100)}%`],
          [`Quality: ${summary.quality_pass ? 'PASS' : 'FAIL'}`],
          [],
          headers,
          ...rows,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 12 }];

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Write to buffer
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename =
        options.filename || `summaries-batch-${timestamp}.xlsx`;

      return {
        format: 'xlsx',
        filename,
        buffer: Buffer.from(buffer),
        mimetype: EXPORT_MIMETYPES.xlsx,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Batch Excel export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Singleton instance
 */
let exporterInstance: ExcelExporter | null = null;

/**
 * Get or create exporter instance
 */
export function getExcelExporter(): ExcelExporter {
  if (!exporterInstance) {
    exporterInstance = new ExcelExporter();
  }
  return exporterInstance;
}
