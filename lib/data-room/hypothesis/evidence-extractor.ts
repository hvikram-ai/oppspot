/**
 * Evidence Extractor Service
 * Extracts and classifies evidence from documents using vector search and AI analysis
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { retrieveChunks, RetrievedChunk } from '../qa/retrieval-service';
import { AIHypothesisAnalyzer, AnalysisResult } from './ai-analyzer';
import { HypothesisRepository } from '../repository/hypothesis-repository';
import { Hypothesis, EvidenceType } from '../types';

export interface DocumentToAnalyze {
  id: string;
  filename: string;
  document_type: string;
  storage_path: string;
}

export interface ExtractionResult {
  document_id: string;
  evidence_type: EvidenceType;
  relevance_score: number;
  excerpt_text: string;
  page_number: number | null;
  ai_reasoning: string;
  ai_confidence: number;
  ai_model: string;
  chunk_id: string | null;
}

export interface BulkAnalysisProgress {
  total_documents: number;
  processed_documents: number;
  evidence_found: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * EvidenceExtractor - Extract and classify hypothesis evidence from documents
 */
export class EvidenceExtractor {
  private supabase: SupabaseClient;
  private aiAnalyzer: AIHypothesisAnalyzer;
  private hypothesisRepo: HypothesisRepository;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.aiAnalyzer = new AIHypothesisAnalyzer();
    this.hypothesisRepo = new HypothesisRepository(supabase);
  }

  /**
   * Extract evidence from a single document for a hypothesis
   */
  async extractEvidenceFromDocument(
    documentId: string,
    hypothesis: Hypothesis,
    userId: string
  ): Promise<ExtractionResult | null> {
    try {
      // Get document details
      const { data: document, error: docError } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        console.error('Document not found:', documentId);
        return null;
      }

      // Use vector search to find relevant chunks
      const hypothesisQuery = `${hypothesis.title}. ${hypothesis.description}`;

      const retrievalResult = await retrieveChunks(
        hypothesis.data_room_id,
        hypothesisQuery,
        userId,
        {
          limit: 10, // Get top 10 most relevant chunks
          minSimilarity: 0.6, // Lower threshold for hypothesis matching
          includeMetadata: true,
        }
      );

      // Filter chunks from the specific document
      const documentChunks = retrievalResult.chunks.filter(
        (chunk: RetrievedChunk) => chunk.document_id === documentId
      );

      if (documentChunks.length === 0) {
        // No relevant chunks found
        return null;
      }

      // Combine chunks into document text (limit to avoid token limits)
      const combinedText = documentChunks
        .slice(0, 5) // Use top 5 chunks
        .map((chunk: RetrievedChunk) => chunk.text_content)
        .join('\n\n');

      // Analyze with AI
      const analysis = await this.aiAnalyzer.analyzeDocumentForHypothesis(
        combinedText,
        hypothesis.title,
        hypothesis.description,
        hypothesis.hypothesis_type
      );

      // Only return if evidence is relevant (relevance > 30)
      if (analysis.relevance_score < 30) {
        return null;
      }

      // Get the best excerpt from AI analysis or use top chunk
      const bestExcerpt =
        analysis.excerpts.length > 0
          ? analysis.excerpts[0]
          : { text: documentChunks[0].text_content, page_number: documentChunks[0].page_number };

      return {
        document_id: documentId,
        evidence_type: analysis.evidence_type,
        relevance_score: analysis.relevance_score,
        excerpt_text: bestExcerpt.text.substring(0, 2000), // Limit excerpt length
        page_number: bestExcerpt.page_number || documentChunks[0].page_number || null,
        ai_reasoning: analysis.ai_reasoning,
        ai_confidence: analysis.ai_confidence,
        ai_model: 'anthropic/claude-3.5-sonnet',
        chunk_id: documentChunks[0].id, // Reference to the chunk
      };
    } catch (error) {
      console.error('Evidence extraction error:', error);
      return null;
    }
  }

  /**
   * Bulk analyze all documents in a data room for a hypothesis
   */
  async bulkAnalyzeDocuments(
    hypothesis: Hypothesis,
    userId: string,
    documentIds?: string[],
    progressCallback?: (progress: BulkAnalysisProgress) => void
  ): Promise<ExtractionResult[]> {
    try {
      // Get documents to analyze
      let query = this.supabase
        .from('documents')
        .select('id, filename, document_type, storage_path')
        .eq('data_room_id', hypothesis.data_room_id)
        .eq('processing_status', 'complete') // Only analyze processed documents
        .is('deleted_at', null);

      if (documentIds && documentIds.length > 0) {
        query = query.in('id', documentIds);
      }

      const { data: documents, error } = await query;

      if (error || !documents) {
        throw new Error(`Failed to fetch documents: ${error?.message}`);
      }

      const results: ExtractionResult[] = [];
      const totalDocuments = documents.length;
      let processedDocuments = 0;

      // Progress callback
      const updateProgress = (status: BulkAnalysisProgress['status'], errorMsg?: string) => {
        if (progressCallback) {
          progressCallback({
            total_documents: totalDocuments,
            processed_documents: processedDocuments,
            evidence_found: results.length,
            status,
            error: errorMsg,
          });
        }
      };

      updateProgress('running');

      // Process documents sequentially to avoid rate limits
      for (const document of documents) {
        try {
          const evidence = await this.extractEvidenceFromDocument(
            document.id,
            hypothesis,
            userId
          );

          if (evidence) {
            results.push(evidence);

            // Auto-link evidence to hypothesis
            await this.hypothesisRepo.linkEvidence(
              {
                hypothesis_id: hypothesis.id,
                document_id: evidence.document_id,
                evidence_type: evidence.evidence_type,
                excerpt_text: evidence.excerpt_text,
                page_number: evidence.page_number,
              },
              userId
            );

            // Update evidence with AI analysis
            const { data: linkedEvidence } = await this.supabase
              .from('hypothesis_evidence')
              .select('id')
              .eq('hypothesis_id', hypothesis.id)
              .eq('document_id', evidence.document_id)
              .single();

            if (linkedEvidence) {
              await this.hypothesisRepo.updateEvidence(linkedEvidence.id, {
                ai_reasoning: evidence.ai_reasoning,
                ai_confidence: evidence.ai_confidence,
                ai_model: evidence.ai_model,
                relevance_score: evidence.relevance_score,
                chunk_id: evidence.chunk_id,
              });
            }
          }

          processedDocuments++;
          updateProgress('running');

          // Small delay to avoid overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing document ${document.id}:`, error);
          processedDocuments++;
          // Continue with next document
        }
      }

      // Update hypothesis last_analyzed_at timestamp
      await this.supabase
        .from('hypotheses')
        .update({ last_analyzed_at: new Date().toISOString() })
        .eq('id', hypothesis.id);

      // Recalculate confidence score
      await this.hypothesisRepo.updateConfidenceScore(hypothesis.id);

      updateProgress('completed');

      return results;
    } catch (error) {
      console.error('Bulk analysis error:', error);
      if (progressCallback) {
        progressCallback({
          total_documents: 0,
          processed_documents: 0,
          evidence_found: 0,
          status: 'failed',
          error: (error as Error).message,
        });
      }
      throw error;
    }
  }

  /**
   * Re-analyze existing evidence with updated AI reasoning
   */
  async reanalyzeEvidence(
    evidenceId: string,
    hypothesis: Hypothesis,
    userId: string
  ): Promise<boolean> {
    try {
      // Get existing evidence
      const { data: evidence, error } = await this.supabase
        .from('hypothesis_evidence')
        .select('*, documents(*)')
        .eq('id', evidenceId)
        .single();

      if (error || !evidence) {
        return false;
      }

      // Extract new evidence
      const newEvidence = await this.extractEvidenceFromDocument(
        evidence.document_id,
        hypothesis,
        userId
      );

      if (!newEvidence) {
        return false;
      }

      // Update evidence
      await this.hypothesisRepo.updateEvidence(evidenceId, {
        evidence_type: newEvidence.evidence_type,
        relevance_score: newEvidence.relevance_score,
        excerpt_text: newEvidence.excerpt_text,
        ai_reasoning: newEvidence.ai_reasoning,
        ai_confidence: newEvidence.ai_confidence,
        ai_model: newEvidence.ai_model,
      });

      // Recalculate confidence
      await this.hypothesisRepo.updateConfidenceScore(hypothesis.id);

      return true;
    } catch (error) {
      console.error('Re-analyze evidence error:', error);
      return false;
    }
  }

  /**
   * Find similar hypotheses based on vector search
   */
  async findSimilarHypotheses(
    dataRoomId: string,
    hypothesisTitle: string,
    hypothesisDescription: string,
    userId: string,
    limit: number = 5
  ): Promise<Hypothesis[]> {
    try {
      // Use vector search to find similar content
      const query = `${hypothesisTitle}. ${hypothesisDescription}`;

      const retrievalResult = await retrieveChunks(dataRoomId, query, userId, {
        limit: 20,
        minSimilarity: 0.7,
      });

      // Get document IDs from chunks
      const documentIds = [...new Set(retrievalResult.chunks.map((c: RetrievedChunk) => c.document_id))];

      // Find hypotheses that reference these documents
      const { data: evidence } = await this.supabase
        .from('hypothesis_evidence')
        .select('hypothesis_id')
        .in('document_id', documentIds);

      if (!evidence || evidence.length === 0) {
        return [];
      }

      const hypothesisIds = [...new Set(evidence.map((e) => e.hypothesis_id))];

      // Get hypothesis details
      const { data: hypotheses } = await this.supabase
        .from('hypotheses')
        .select('*')
        .in('id', hypothesisIds)
        .is('deleted_at', null)
        .limit(limit);

      return (hypotheses as Hypothesis[]) || [];
    } catch (error) {
      console.error('Find similar hypotheses error:', error);
      return [];
    }
  }
}
