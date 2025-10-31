/**
 * Citation Generator
 * Task: T018
 *
 * Extracts and formats citations from LLM responses with deep-linking support.
 * Maps citation markers ([1], [2], etc.) to document metadata and generates navigation URLs.
 * Reference: research.md section 7 (citation deep-linking)
 */

import type { RetrievedChunk } from './retrieval-service';

/**
 * Citation with full metadata
 */
export interface Citation {
  index: number;              // Citation number (1-based)
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  chunkId: string;
  textPreview: string;        // ~240 characters around cited text
  relevanceScore: number;     // From vector search
  navigationUrl: string;      // Deep-link to document location
  highlightText?: string;     // Exact text to highlight
}

/**
 * Citation extraction result
 */
export interface CitationResult {
  citations: Citation[];
  answerWithLinks: string;    // Answer text with citation links enhanced
  totalCitations: number;
  uniqueDocuments: number;
}

/**
 * Configuration for citation generation
 */
export interface CitationConfig {
  baseUrl?: string;           // Base URL for navigation (default: '')
  previewLength?: number;     // Preview text length in chars (default: 240)
  includeHighlight?: boolean; // Include highlight text (default: true)
}

/**
 * Default citation configuration
 */
const DEFAULT_CONFIG: CitationConfig = {
  baseUrl: '',
  previewLength: 240,
  includeHighlight: true,
};

/**
 * Extract citation markers from LLM response
 * Matches patterns like [1], [2], [3-5], etc.
 */
function extractCitationMarkers(text: string): number[] {
  const pattern = /\[(\d+)\]/g;
  const matches = [...text.matchAll(pattern)];
  const citationNumbers = matches.map(m => parseInt(m[1], 10));

  // Return unique, sorted citation numbers
  return [...new Set(citationNumbers)].sort((a, b) => a - b);
}

/**
 * Get text preview around a chunk
 * Extracts ~240 characters centered on the chunk or from the beginning
 */
function getTextPreview(chunk: RetrievedChunk, maxLength: number = 240): string {
  const text = chunk.text_content;

  if (text.length <= maxLength) {
    return text;
  }

  // Take first maxLength characters and add ellipsis
  const preview = text.slice(0, maxLength);
  const lastSpace = preview.lastIndexOf(' ');

  // Trim to last complete word
  if (lastSpace > maxLength * 0.8) {
    return preview.slice(0, lastSpace) + '...';
  }

  return preview + '...';
}

/**
 * Generate navigation URL for citation
 * Format: /data-room/{dataRoomId}/documents/{docId}#page={num}&chunk={chunkId}
 */
function generateNavigationUrl(
  dataRoomId: string,
  documentId: string,
  pageNumber: number,
  chunkId: string,
  baseUrl: string = ''
): string {
  const path = `/data-room/${dataRoomId}/documents/${documentId}`;
  const hash = `#page=${pageNumber}&chunk=${chunkId}`;

  return `${baseUrl}${path}${hash}`;
}

/**
 * Generate citations from LLM response and retrieved chunks
 *
 * @param llmResponse - LLM's answer text with citation markers
 * @param retrievedChunks - Chunks used as context (ordered by relevance)
 * @param dataRoomId - Data room ID for URL generation
 * @param config - Optional configuration
 * @returns Citation result with all metadata
 *
 * @example
 * ```typescript
 * const answer = "The revenue was $5M [1] and expenses were $3M [2].";
 * const citations = generateCitations(answer, chunks, dataRoomId);
 *
 * citations.citations.forEach(cite => {
 *   console.log(`[${cite.index}] ${cite.documentTitle} - Page ${cite.pageNumber}`);
 *   console.log(`   "${cite.textPreview}"`);
 *   console.log(`   Link: ${cite.navigationUrl}`);
 * });
 * ```
 */
export function generateCitations(
  llmResponse: string,
  retrievedChunks: RetrievedChunk[],
  dataRoomId: string,
  config: CitationConfig = {}
): CitationResult {
  const { baseUrl, previewLength, includeHighlight } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Extract citation markers from response
  const citationNumbers = extractCitationMarkers(llmResponse);

  // Build citations array
  const citations: Citation[] = [];
  const uniqueDocuments = new Set<string>();

  for (const citationNum of citationNumbers) {
    // Citation numbers are 1-based, array indices are 0-based
    const chunkIndex = citationNum - 1;

    if (chunkIndex < 0 || chunkIndex >= retrievedChunks.length) {
      // Invalid citation number - skip
      console.warn(`[CitationGenerator] Invalid citation number: ${citationNum}`);
      continue;
    }

    const chunk = retrievedChunks[chunkIndex];

    if (!chunk.document_title || chunk.page_number === undefined) {
      console.warn(`[CitationGenerator] Missing metadata for chunk ${chunk.id}`);
      continue;
    }

    uniqueDocuments.add(chunk.document_id);

    const citation: Citation = {
      index: citationNum,
      documentId: chunk.document_id,
      documentTitle: chunk.document_title,
      pageNumber: chunk.page_number,
      chunkId: chunk.id,
      textPreview: getTextPreview(chunk, previewLength),
      relevanceScore: chunk.similarity,
      navigationUrl: generateNavigationUrl(
        dataRoomId,
        chunk.document_id,
        chunk.page_number,
        chunk.id,
        baseUrl
      ),
      ...(includeHighlight && {
        highlightText: chunk.text_content,
      }),
    };

    citations.push(citation);
  }

  // Sort citations by index
  citations.sort((a, b) => a.index - b.index);

  return {
    citations,
    answerWithLinks: llmResponse,
    totalCitations: citations.length,
    uniqueDocuments: uniqueDocuments.size,
  };
}

/**
 * Format citations as footnotes for display
 * Returns markdown-formatted citation list
 */
export function formatCitationsAsFootnotes(citations: Citation[]): string {
  if (citations.length === 0) {
    return '';
  }

  const footnotes = citations.map(cite => {
    return `[${cite.index}] **${cite.documentTitle}** (Page ${cite.pageNumber}) - ${cite.textPreview}`;
  });

  return '## Sources\n\n' + footnotes.join('\n\n');
}

/**
 * Format citations as JSON for API responses
 */
export function formatCitationsAsJSON(citations: Citation[]): Array<{
  index: number;
  document_id: string;
  document_title: string;
  page_number: number;
  chunk_id: string;
  text_preview: string;
  relevance_score: number;
  url: string;
}> {
  return citations.map(cite => ({
    index: cite.index,
    document_id: cite.documentId,
    document_title: cite.documentTitle,
    page_number: cite.pageNumber,
    chunk_id: cite.chunkId,
    text_preview: cite.textPreview,
    relevance_score: Math.round(cite.relevanceScore * 100) / 100,
    url: cite.navigationUrl,
  }));
}

/**
 * Validate that all citations in response are valid
 */
export function validateCitations(
  llmResponse: string,
  retrievedChunks: RetrievedChunk[]
): {
  valid: boolean;
  invalidCitations: number[];
  message?: string;
} {
  const citationNumbers = extractCitationMarkers(llmResponse);
  const maxValidCitation = retrievedChunks.length;

  const invalidCitations = citationNumbers.filter(
    num => num < 1 || num > maxValidCitation
  );

  if (invalidCitations.length > 0) {
    return {
      valid: false,
      invalidCitations,
      message: `Invalid citation numbers: ${invalidCitations.join(', ')}. Valid range is 1-${maxValidCitation}.`,
    };
  }

  return {
    valid: true,
    invalidCitations: [],
  };
}

/**
 * Enhance answer text with clickable citation links (HTML)
 * Converts [1] to <a href="...">[1]</a>
 */
export function enhanceAnswerWithLinks(
  answerText: string,
  citations: Citation[]
): string {
  let enhanced = answerText;

  // Create a map of citation index to URL
  const citationMap = new Map(
    citations.map(c => [c.index, c.navigationUrl])
  );

  // Replace each [N] with linked version
  enhanced = enhanced.replace(/\[(\d+)\]/g, (match, num) => {
    const citationNum = parseInt(num, 10);
    const url = citationMap.get(citationNum);

    if (url) {
      return `<a href="${url}" class="citation-link" data-citation="${citationNum}">${match}</a>`;
    }

    return match;
  });

  return enhanced;
}

/**
 * Group citations by document
 */
export function groupCitationsByDocument(
  citations: Citation[]
): Map<string, Citation[]> {
  const grouped = new Map<string, Citation[]>();

  for (const citation of citations) {
    const docId = citation.documentId;
    if (!grouped.has(docId)) {
      grouped.set(docId, []);
    }
    grouped.get(docId)!.push(citation);
  }

  return grouped;
}

/**
 * Get citation statistics
 */
export function getCitationStats(citations: Citation[]): {
  total: number;
  byDocument: Map<string, number>;
  avgRelevanceScore: number;
  citationDensity: number;  // Citations per 100 words
} {
  const byDocument = new Map<string, number>();

  for (const citation of citations) {
    const count = byDocument.get(citation.documentTitle) || 0;
    byDocument.set(citation.documentTitle, count + 1);
  }

  const avgRelevanceScore =
    citations.length > 0
      ? citations.reduce((sum, c) => sum + c.relevanceScore, 0) / citations.length
      : 0;

  return {
    total: citations.length,
    byDocument,
    avgRelevanceScore,
    citationDensity: 0, // Calculated externally based on answer word count
  };
}

/**
 * Extract unique documents from citations
 */
export function getUniqueCitedDocuments(citations: Citation[]): Array<{
  documentId: string;
  documentTitle: string;
  citationCount: number;
}> {
  const documentMap = new Map<string, { title: string; count: number }>();

  for (const citation of citations) {
    const existing = documentMap.get(citation.documentId);
    if (existing) {
      existing.count++;
    } else {
      documentMap.set(citation.documentId, {
        title: citation.documentTitle,
        count: 1,
      });
    }
  }

  return Array.from(documentMap.entries()).map(([id, data]) => ({
    documentId: id,
    documentTitle: data.title,
    citationCount: data.count,
  }));
}

/**
 * Constants export
 */
export const CONSTANTS = {
  DEFAULT_PREVIEW_LENGTH: DEFAULT_CONFIG.previewLength!,
  CITATION_PATTERN: /\[(\d+)\]/g,
} as const;
