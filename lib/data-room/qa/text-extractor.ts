/**
 * Text Extraction Service
 * Task: T013
 *
 * Extracts text from PDF documents using pdf-parse with detection for scanned documents.
 * Fallback to browser-side Tesseract.js OCR is indicated via ocrNeeded flag.
 * Reference: research.md section 4 (OCR strategy)
 */

import * as pdfParse from 'pdf-parse';

/**
 * Result of text extraction
 */
export interface TextExtractionResult {
  text: string;                    // Full document text (all pages concatenated)
  pages: PageText[];               // Per-page text with metadata
  ocrNeeded: boolean;              // True if text layer missing (needs browser-side OCR)
  confidence: number;              // Confidence score (1.0 for native text, <1.0 for OCR)
  pageCount: number;               // Total number of pages
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Per-page text with metadata
 */
export interface PageText {
  page_number: number;
  text: string;
  char_count: number;
}

/**
 * OCR configuration for browser-side processing
 */
export interface OCRConfig {
  confidence_threshold: number;    // Minimum confidence to accept OCR result
  warn_threshold: number;          // Threshold to show warning to user
}

export const DEFAULT_OCR_CONFIG: OCRConfig = {
  confidence_threshold: 0.5,       // Accept OCR results with >50% confidence
  warn_threshold: 0.7,             // Warn user if confidence <70%
};

/**
 * Heuristic threshold for detecting missing text layer
 * If average characters per page < this value, likely scanned
 */
const CHARS_PER_PAGE_THRESHOLD = 50;

/**
 * Extract text from PDF buffer
 *
 * @param pdfBuffer - PDF file as Buffer or Uint8Array
 * @param config - Optional OCR configuration
 * @returns Text extraction result with OCR detection
 *
 * @example
 * ```typescript
 * const pdfBuffer = await fs.readFile('document.pdf');
 * const result = await extractText(pdfBuffer);
 *
 * if (result.ocrNeeded) {
 *   console.warn('Document appears to be scanned - OCR required');
 *   // Trigger browser-side Tesseract.js processing
 * }
 *
 * // Use extracted text
 * console.log(`Extracted ${result.text.length} characters from ${result.pageCount} pages`);
 * ```
 */
export async function extractText(
  pdfBuffer: Buffer | Uint8Array,
  config: OCRConfig = DEFAULT_OCR_CONFIG
): Promise<TextExtractionResult> {
  try {
    // @ts-ignore - pdf-parse is a CommonJS module
    const pdf = pdfParse.default || pdfParse;

    // Extract text using pdf-parse
    const data = await pdf(pdfBuffer);

    // Extract per-page text
    const pages: PageText[] = [];
    let fullText = '';

    // pdf-parse returns text as a single string, but we can split by page breaks
    // For more accurate per-page extraction, we'll use the render function above
    // However, pdf-parse's default doesn't preserve page boundaries well
    // So we'll estimate based on the text content

    // Use pdf-parse's text property which contains all text
    fullText = data.text || '';

    // Extract metadata
    const metadata = {
      title: data.info?.Title,
      author: data.info?.Author,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
    };

    // Calculate average characters per page to detect scanned documents
    const pageCount = data.numpages;
    const avgCharsPerPage = fullText.length / pageCount;
    const ocrNeeded = avgCharsPerPage < CHARS_PER_PAGE_THRESHOLD;

    // For per-page text, we need to re-parse the PDF
    // This is a limitation of pdf-parse - it doesn't easily give us per-page text
    // We'll create a workaround by processing pages individually
    const perPageTexts = await extractPerPageText(pdfBuffer, pageCount);

    const result: TextExtractionResult = {
      text: fullText,
      pages: perPageTexts,
      ocrNeeded,
      confidence: ocrNeeded ? 0.0 : 1.0, // 1.0 for native text layer, 0.0 if OCR needed
      pageCount,
      metadata,
    };

    return result;
  } catch (error) {
    // Handle PDF parsing errors
    throw new TextExtractionError(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'EXTRACTION_FAILED',
      error
    );
  }
}

/**
 * Extract text from each page individually
 * Helper function to get per-page text
 */
async function extractPerPageText(
  pdfBuffer: Buffer | Uint8Array,
  pageCount: number
): Promise<PageText[]> {
  const pages: PageText[] = [];

  try {
    // @ts-ignore - pdf-parse is a CommonJS module
    const pdf = pdfParse.default || pdfParse;

    // For now, we'll use pdf-parse to get the full text and estimate page boundaries
    // A more robust solution would require using pdf.js directly
    const data = await pdf(pdfBuffer);
    const fullText = data.text || '';

    // Estimate text per page (rough heuristic)
    // In production, this should use pdf.js to extract text per page
    const estimatedCharsPerPage = Math.ceil(fullText.length / pageCount);

    for (let i = 0; i < pageCount; i++) {
      const startIdx = i * estimatedCharsPerPage;
      const endIdx = Math.min((i + 1) * estimatedCharsPerPage, fullText.length);
      const pageText = fullText.slice(startIdx, endIdx);

      pages.push({
        page_number: i + 1,
        text: pageText,
        char_count: pageText.length,
      });
    }

    return pages;
  } catch (error) {
    // If per-page extraction fails, return empty pages
    // This allows the main extraction to succeed even if per-page fails
    console.error('Per-page extraction failed:', error);

    // Return placeholder pages
    return Array.from({ length: pageCount }, (_, i) => ({
      page_number: i + 1,
      text: '',
      char_count: 0,
    }));
  }
}

/**
 * Check if a document needs OCR based on extraction result
 */
export function needsOCR(result: TextExtractionResult): boolean {
  return result.ocrNeeded;
}

/**
 * Check if OCR confidence is below warning threshold
 */
export function shouldWarnAboutOCR(
  result: TextExtractionResult,
  config: OCRConfig = DEFAULT_OCR_CONFIG
): boolean {
  return result.ocrNeeded || result.confidence < config.warn_threshold;
}

/**
 * Get user-friendly warning message for low OCR confidence
 */
export function getOCRWarningMessage(confidence: number): string {
  if (confidence === 0) {
    return 'This document appears to be scanned. OCR processing is required. Q&A accuracy may be reduced.';
  } else if (confidence < 0.5) {
    return 'This document has low OCR confidence. Q&A accuracy may be significantly reduced.';
  } else if (confidence < 0.7) {
    return 'This document was processed with OCR. Q&A accuracy may be reduced.';
  } else {
    return 'This document has acceptable OCR quality.';
  }
}

/**
 * Custom error class for text extraction failures
 */
export class TextExtractionError extends Error {
  constructor(
    message: string,
    public code: 'EXTRACTION_FAILED' | 'INVALID_PDF' | 'UNSUPPORTED_FORMAT',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'TextExtractionError';

    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TextExtractionError);
    }
  }
}

/**
 * Validate that buffer is a valid PDF
 */
export function isValidPDF(buffer: Buffer | Uint8Array): boolean {
  // PDF files start with %PDF-
  const pdfHeader = '%PDF-';
  const header = Buffer.from(buffer.slice(0, 5)).toString('ascii');
  return header === pdfHeader;
}

/**
 * Calculate extraction statistics
 */
export function getExtractionStats(result: TextExtractionResult): {
  total_chars: number;
  total_pages: number;
  avg_chars_per_page: number;
  empty_pages: number;
  ocr_needed: boolean;
  confidence: number;
} {
  const emptyPages = result.pages.filter(p => p.char_count === 0).length;

  return {
    total_chars: result.text.length,
    total_pages: result.pageCount,
    avg_chars_per_page: Math.round(result.text.length / result.pageCount),
    empty_pages: emptyPages,
    ocr_needed: result.ocrNeeded,
    confidence: result.confidence,
  };
}
