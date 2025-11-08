/**
 * Word Exporter - Export summaries to Word (.docx) format
 *
 * Creates a professional Word document with:
 * - Cover page with summary metrics
 * - Field values in a structured format
 * - Quality issues section
 * - Evidence citations
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import type {
  SummaryWithFields,
  ExportOptions,
  ExportResult,
} from '../types';
import { EXPORT_MIMETYPES } from '../types';

export class WordExporter {
  /**
   * Export summary to Word format
   */
  async export(
    summary: SummaryWithFields,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Create document sections
      const sections = [
        ...this.createCoverPage(summary),
        ...this.createSummarySection(summary),
        ...this.createFieldsSection(summary, options),
      ];

      // Add quality issues section if requested
      if (options.include_quality_issues && summary.qualityIssues.length > 0) {
        sections.push(...this.createQualitySection(summary));
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: sections,
          },
        ],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename =
        options.filename ||
        `summary-${summary.template.key}-${timestamp}.docx`;

      return {
        format: 'docx',
        filename,
        buffer: Buffer.from(buffer),
        mimetype: EXPORT_MIMETYPES.docx,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Word export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create cover page
   */
  private createCoverPage(summary: SummaryWithFields): Paragraph[] {
    return [
      new Paragraph({
        text: 'Document Summary Report',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: summary.template.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Document ID: ${summary.document_id}`,
            break: 2,
          }),
          new TextRun({
            text: `Template: ${summary.template.key} (v${summary.template.version})`,
            break: 1,
          }),
          new TextRun({
            text: `Generated: ${new Date().toLocaleString()}`,
            break: 1,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: '',
        spacing: { after: 400 },
      }),
    ];
  }

  /**
   * Create summary metrics section
   */
  private createSummarySection(summary: SummaryWithFields): Paragraph[] {
    const qualityStatus = summary.quality_pass ? '✓ PASS' : '✗ FAIL';
    const qualityColor = summary.quality_pass ? '008000' : 'FF0000';

    return [
      new Paragraph({
        text: 'Quality Metrics',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Coverage: ', bold: true }),
          new TextRun(`${Math.round(summary.coverage * 100)}%`),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Average Confidence: ', bold: true }),
          new TextRun(`${Math.round(summary.avg_confidence * 100)}%`),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Quality Gate: ', bold: true }),
          new TextRun({ text: qualityStatus, color: qualityColor, bold: true }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Extraction Statistics', bold: true, underline: {} }),
        ],
        spacing: { before: 100, after: 100 },
      }),
      new Paragraph({
        text: `Total Fields: ${summary.fields.length}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Required Fields: ${summary.fields.filter((f) => f.field.required).length}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Extracted Fields: ${summary.fields.filter((f) => f.value !== null).length}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Missing Fields: ${summary.fields.filter((f) => f.field.required && !f.value).length}`,
        spacing: { after: 400 },
      }),
    ];
  }

  /**
   * Create fields section with table
   */
  private createFieldsSection(
    summary: SummaryWithFields,
    options: ExportOptions
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Extracted Field Values',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      }),
    ];

    // Create table rows
    const tableRows: TableRow[] = [
      // Header row
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Field', bold: true })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Value', bold: true })],
            width: { size: 40, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Confidence', bold: true })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Method', bold: true })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ];

    // Data rows
    summary.fields.forEach((f) => {
      const value = f.value
        ? this.formatValue(f.value.value_json)
        : '(not extracted)';
      const confidence = f.value
        ? `${Math.round(f.value.confidence * 100)}%`
        : 'N/A';
      const method = f.value?.extraction_method || 'N/A';

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: f.field.title, bold: f.field.required }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [new Paragraph(value)],
            }),
            new TableCell({
              children: [new Paragraph(confidence)],
            }),
            new TableCell({
              children: [new Paragraph(method)],
            }),
          ],
        })
      );

      // Add evidence if requested and available
      if (options.include_evidence && f.value?.evidence?.text) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'Evidence:', italics: true })],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: f.value.evidence.text.substring(0, 300),
                    italics: true,
                  }),
                ],
                columnSpan: 3,
              }),
            ],
          })
        );
      }
    });

    // Create table
    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
    });

    paragraphs.push(new Paragraph({ children: [table] }));

    return paragraphs;
  }

  /**
   * Create quality issues section
   */
  private createQualitySection(summary: SummaryWithFields): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Quality Issues',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    ];

    // Group by severity
    const highIssues = summary.qualityIssues.filter((i) => i.severity === 'high');
    const mediumIssues = summary.qualityIssues.filter((i) => i.severity === 'medium');
    const lowIssues = summary.qualityIssues.filter((i) => i.severity === 'low');

    // High severity
    if (highIssues.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: 'High Severity', bold: true, color: 'FF0000' })],
          spacing: { before: 200, after: 100 },
        })
      );

      highIssues.forEach((issue, index) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. `, bold: true }),
              new TextRun(issue.issue),
            ],
            spacing: { after: 50 },
          })
        );

        if (issue.remediation) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: '   Remediation: ', italics: true }),
                new TextRun({ text: issue.remediation, italics: true }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      });
    }

    // Medium severity
    if (mediumIssues.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: 'Medium Severity', bold: true, color: 'FFA500' })],
          spacing: { before: 200, after: 100 },
        })
      );

      mediumIssues.forEach((issue, index) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. `, bold: true }),
              new TextRun(issue.issue),
            ],
            spacing: { after: 50 },
          })
        );

        if (issue.remediation) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: '   Remediation: ', italics: true }),
                new TextRun({ text: issue.remediation, italics: true }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      });
    }

    // Low severity
    if (lowIssues.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: 'Low Severity', bold: true, color: '008000' })],
          spacing: { before: 200, after: 100 },
        })
      );

      lowIssues.forEach((issue, index) => {
        paragraphs.push(
          new Paragraph({
            text: `${index + 1}. ${issue.issue}`,
            spacing: { after: 100 },
          })
        );
      });
    }

    return paragraphs;
  }

  /**
   * Format value for display in Word
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  /**
   * Export multiple summaries to single Word document
   */
  async exportBatch(
    summaries: SummaryWithFields[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const allSections: Paragraph[] = [];

      summaries.forEach((summary, index) => {
        if (index > 0) {
          // Add page break between summaries
          allSections.push(
            new Paragraph({
              text: '',
              pageBreakBefore: true,
            })
          );
        }

        allSections.push(
          ...this.createCoverPage(summary),
          ...this.createSummarySection(summary),
          ...this.createFieldsSection(summary, options)
        );

        if (options.include_quality_issues && summary.qualityIssues.length > 0) {
          allSections.push(...this.createQualitySection(summary));
        }
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: allSections,
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename =
        options.filename || `summaries-batch-${timestamp}.docx`;

      return {
        format: 'docx',
        filename,
        buffer: Buffer.from(buffer),
        mimetype: EXPORT_MIMETYPES.docx,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Batch Word export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Singleton instance
 */
let exporterInstance: WordExporter | null = null;

/**
 * Get or create exporter instance
 */
export function getWordExporter(): WordExporter {
  if (!exporterInstance) {
    exporterInstance = new WordExporter();
  }
  return exporterInstance;
}
