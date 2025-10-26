/**
 * Text Extraction Utilities
 * Extract text from various document formats
 */

import pdf from 'pdf-parse';

export interface TextExtractionResult {
  text: string;
  pageCount: number;
  isScanned: boolean;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
  };
}

/**
 * Extract text from a PDF buffer
 * @param buffer - PDF file buffer
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDF(
  buffer: Buffer
): Promise<TextExtractionResult> {
  try {
    const data = await pdf(buffer);

    const extractedText = data.text || '';
    const isScanned = detectIfScanned(extractedText);

    return {
      text: extractedText,
      pageCount: data.numpages,
      isScanned,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate
          ? new Date(data.info.CreationDate)
          : undefined,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Detect if a PDF is scanned (image-based) by analyzing the extracted text
 * @param text - Extracted text from PDF
 * @returns true if the document appears to be scanned
 */
export function detectIfScanned(text: string): boolean {
  // Remove whitespace for analysis
  const cleanText = text.trim();

  // If text is empty or very short, likely scanned
  if (cleanText.length < 50) {
    return true;
  }

  // Calculate ratio of alphanumeric characters
  const alphanumericCount = (cleanText.match(/[a-zA-Z0-9]/g) || []).length;
  const totalCount = cleanText.length;
  const alphanumericRatio = alphanumericCount / totalCount;

  // If very low ratio of alphanumeric characters, likely gibberish from OCR
  if (alphanumericRatio < 0.5) {
    return true;
  }

  // Check for common OCR artifacts
  const ocrArtifacts = [
    /[|]{3,}/, // Multiple vertical bars
    /\s{10,}/, // Excessive whitespace
    /[^a-zA-Z0-9\s.,!?;:'"()-]{5,}/, // Long sequences of special characters
  ];

  for (const pattern of ocrArtifacts) {
    if (pattern.test(cleanText)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract text from a scanned image/PDF using OCR
 * Note: This is a stub for future implementation with Tesseract.js
 * @param buffer - Image or PDF buffer
 * @returns Extracted text via OCR
 */
export async function extractTextFromImage(
  buffer: Buffer
): Promise<TextExtractionResult> {
  // TODO: Implement OCR using Tesseract.js in Phase 2
  // For now, return empty result
  console.warn(
    'OCR not yet implemented. Please implement Tesseract.js integration for scanned documents.'
  );

  return {
    text: '',
    pageCount: 1,
    isScanned: true,
    metadata: {},
  };
}

/**
 * Clean and normalize extracted text
 * @param text - Raw extracted text
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  return (
    text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Trim
      .trim()
  );
}

/**
 * Split text into chunks for processing
 * Useful for large documents that exceed AI token limits
 * @param text - Text to split
 * @param maxChunkSize - Maximum characters per chunk (default: 4000)
 * @returns Array of text chunks
 */
export function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = 4000
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit
    if (currentChunk.length + sentence.length > maxChunkSize) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // Start new chunk with this sentence
      currentChunk = sentence;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract key statistics from text
 * Useful for quick analysis before full AI processing
 * @param text - Text to analyze
 * @returns Basic statistics
 */
export function getTextStatistics(text: string): {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  uniqueWordCount: number;
} {
  const cleanedText = cleanText(text);

  const words = cleanedText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanedText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));

  return {
    characterCount: cleanedText.length,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence:
      sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    uniqueWordCount: uniqueWords.size,
  };
}
