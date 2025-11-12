/**
 * Evidence Extractor
 * Vector search integration for finding technology evidence in documents
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { EmbeddingsService } from '../qa/embeddings-service';

export interface TechnologyEvidence {
  chunk_id: string;
  document_id: string;
  document_filename: string;
  page_number: number | null;
  chunk_index: number;
  content: string;
  relevance_score: number; // 0-100 (similarity * 100)
  metadata: {
    chunk_token_count: number;
    document_page_count: number;
  };
}

export interface EvidenceSearchResult {
  technology_name: string;
  evidence: TechnologyEvidence[];
  total_matches: number;
  search_time_ms: number;
}

/**
 * EvidenceExtractor - Find evidence of technologies in documents using vector search
 */
export class EvidenceExtractor {
  private supabase: SupabaseClient;
  private embeddingsService: EmbeddingsService;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.embeddingsService = new EmbeddingsService();
  }

  /**
   * Search for evidence of a technology in data room documents
   */
  async searchForTechnology(
    dataRoomId: string,
    technologyName: string,
    options: {
      minSimilarity?: number; // 0-1, default 0.7
      maxResults?: number; // default 5
      documentIds?: string[]; // Optional: filter to specific documents
    } = {}
  ): Promise<EvidenceSearchResult> {
    const startTime = Date.now();
    const minSimilarity = options.minSimilarity || 0.7;
    const maxResults = options.maxResults || 5;

    try {
      // Generate embedding for the technology search query
      const searchQuery = this.buildSearchQuery(technologyName);
      const queryEmbedding = await this.embeddingsService.generateEmbedding(searchQuery);

      // Build vector search query
      const rpcQuery = this.supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: minSimilarity,
        match_count: maxResults * 2, // Get more candidates for filtering
      });

      // Execute search
      const { data: chunks, error } = await rpcQuery;

      if (error) {
        console.error('[EvidenceExtractor] Vector search failed:', error);
        return {
          technology_name: technologyName,
          evidence: [],
          total_matches: 0,
          search_time_ms: Date.now() - startTime,
        };
      }

      if (!chunks || chunks.length === 0) {
        return {
          technology_name: technologyName,
          evidence: [],
          total_matches: 0,
          search_time_ms: Date.now() - startTime,
        };
      }

      // Filter chunks to only those from the specified data room
      const dataRoomChunks = await this.filterByDataRoom(chunks, dataRoomId, options.documentIds);

      // Convert to evidence format
      const evidence = dataRoomChunks.slice(0, maxResults).map((chunk: any) => ({
        chunk_id: chunk.chunk_id,
        document_id: chunk.document_id,
        document_filename: chunk.document_filename,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        relevance_score: Math.round(chunk.similarity * 100),
        metadata: {
          chunk_token_count: chunk.token_count || 0,
          document_page_count: chunk.document_page_count || 0,
        },
      }));

      return {
        technology_name: technologyName,
        evidence,
        total_matches: dataRoomChunks.length,
        search_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[EvidenceExtractor] Search failed:', error);
      return {
        technology_name: technologyName,
        evidence: [],
        total_matches: 0,
        search_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Search for evidence of multiple technologies in parallel
   */
  async searchForTechnologies(
    dataRoomId: string,
    technologyNames: string[],
    options: {
      minSimilarity?: number;
      maxResultsPerTech?: number;
      documentIds?: string[];
    } = {}
  ): Promise<EvidenceSearchResult[]> {
    // Search in parallel
    const searchPromises = technologyNames.map((techName) =>
      this.searchForTechnology(dataRoomId, techName, {
        minSimilarity: options.minSimilarity,
        maxResults: options.maxResultsPerTech,
        documentIds: options.documentIds,
      })
    );

    return Promise.all(searchPromises);
  }

  /**
   * Build optimized search query for technology detection
   */
  private buildSearchQuery(technologyName: string): string {
    // Enhance the query with context to improve embedding quality
    return `technology stack implementation: ${technologyName}, usage patterns, version information, configuration, dependencies`;
  }

  /**
   * Filter chunks to only those from documents in the specified data room
   */
  private async filterByDataRoom(
    chunks: any[],
    dataRoomId: string,
    documentIds?: string[]
  ): Promise<any[]> {
    // Get document IDs that belong to this data room
    let query = this.supabase
      .from('documents')
      .select('id, filename, data_room_id')
      .eq('data_room_id', dataRoomId);

    if (documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds);
    }

    const { data: documents } = await query;

    if (!documents || documents.length === 0) {
      return [];
    }

    const validDocumentIds = new Set(documents.map((d) => d.id));

    // Filter chunks and enrich with document metadata
    return chunks
      .filter((chunk: any) => validDocumentIds.has(chunk.document_id))
      .map((chunk: any) => {
        const doc = documents.find((d) => d.id === chunk.document_id);
        return {
          ...chunk,
          document_filename: doc?.filename || 'Unknown',
        };
      });
  }

  /**
   * Search for wrapper vs proprietary AI indicators
   */
  async searchForAIIndicators(
    dataRoomId: string,
    options: {
      documentIds?: string[];
    } = {}
  ): Promise<{
    wrapper_evidence: TechnologyEvidence[];
    proprietary_evidence: TechnologyEvidence[];
  }> {
    const wrapperQueries = [
      'OpenAI API integration ChatGPT GPT-4 API calls',
      'Claude Anthropic API wrapper simple prompt engineering',
      'third party LLM API no custom training',
    ];

    const proprietaryQueries = [
      'custom model training fine-tuning ML pipeline',
      'proprietary AI architecture training data preprocessing',
      'model evaluation metrics hyperparameter optimization',
    ];

    // Search for wrapper evidence
    const wrapperSearches = await Promise.all(
      wrapperQueries.map((query) =>
        this.searchCustomQuery(dataRoomId, query, {
          maxResults: 3,
          documentIds: options.documentIds,
        })
      )
    );

    // Search for proprietary evidence
    const proprietarySearches = await Promise.all(
      proprietaryQueries.map((query) =>
        this.searchCustomQuery(dataRoomId, query, {
          maxResults: 3,
          documentIds: options.documentIds,
        })
      )
    );

    // Flatten and deduplicate results
    const wrapper_evidence = this.deduplicateEvidence(
      wrapperSearches.flatMap((result) => result.evidence)
    );

    const proprietary_evidence = this.deduplicateEvidence(
      proprietarySearches.flatMap((result) => result.evidence)
    );

    return {
      wrapper_evidence,
      proprietary_evidence,
    };
  }

  /**
   * Search using a custom query string
   */
  private async searchCustomQuery(
    dataRoomId: string,
    query: string,
    options: {
      minSimilarity?: number;
      maxResults?: number;
      documentIds?: string[];
    } = {}
  ): Promise<{ evidence: TechnologyEvidence[] }> {
    const result = await this.searchForTechnology(dataRoomId, query, options);
    return { evidence: result.evidence };
  }

  /**
   * Deduplicate evidence by chunk_id
   */
  private deduplicateEvidence(evidence: TechnologyEvidence[]): TechnologyEvidence[] {
    const seen = new Set<string>();
    const deduplicated: TechnologyEvidence[] = [];

    for (const item of evidence) {
      if (!seen.has(item.chunk_id)) {
        seen.add(item.chunk_id);
        deduplicated.push(item);
      }
    }

    // Sort by relevance score descending
    return deduplicated.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Extract the best evidence excerpt for a technology
   * Returns the single most relevant chunk
   */
  async getBestEvidenceExcerpt(
    dataRoomId: string,
    technologyName: string
  ): Promise<TechnologyEvidence | null> {
    const result = await this.searchForTechnology(dataRoomId, technologyName, {
      minSimilarity: 0.75,
      maxResults: 1,
    });

    return result.evidence.length > 0 ? result.evidence[0] : null;
  }

  /**
   * Check if document chunks exist for a data room
   */
  async hasProcessedDocuments(dataRoomId: string): Promise<boolean> {
    // Get document IDs for this data room
    const { data: documents } = await this.supabase
      .from('documents')
      .select('id')
      .eq('data_room_id', dataRoomId)
      .limit(1);

    if (!documents || documents.length === 0) {
      return false;
    }

    // Check if any chunks exist
    const { data: chunks, error } = await this.supabase
      .from('document_chunks')
      .select('id')
      .eq('document_id', documents[0].id)
      .limit(1);

    return !error && chunks && chunks.length > 0;
  }
}
