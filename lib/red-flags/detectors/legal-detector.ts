/**
 * Legal Detector
 *
 * Detects legal red flags using LLM-assisted contract analysis:
 * - Change of control clauses
 * - Termination for convenience rights
 * - Most Favored Nation (MFN) clauses
 * - Assignment restrictions
 * - Liability/indemnity concerns
 *
 * Uses OpenRouter API with Claude Sonnet 3.5 for contract review.
 * Data sources: Supabase documents table (contracts)
 */

import { BaseDetector } from './base-detector';
import { createClient } from '../../supabase/server';
import { OpenRouterClient } from '../../ai/openrouter';
import {
  RedFlag,
  DetectorResult,
  DetectorOptions,
  FlagSeverity,
  CitationData,
} from '../types';
import { scrubEvidencePreview } from '../utils/pii-scrubber';

/**
 * LLM response structure for legal clause detection
 */
interface LegalClauseDetection {
  flag: boolean;
  category: 'legal';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  evidence: string;
  explanation: string;
  clause_type?: string;
  page_number?: number;
  chunk_index?: number;
}

/**
 * Legal Red Flag Detector
 */
export class LegalDetector extends BaseDetector {
  readonly name = 'legal';
  readonly category = 'legal' as const;
  readonly version = '1.0.0';

  private llmClient: OpenRouterClient;

  constructor() {
    super();
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    this.llmClient = new OpenRouterClient(apiKey);
  }

  /**
   * Run legal detection
   */
  async detect(options: DetectorOptions): Promise<DetectorResult> {
    return this.safeExecute(async () => {
      const flags: Partial<RedFlag>[] = [];

      // Get contract documents for this entity
      const contracts = await this.getContractDocuments(options.entityId, options.entityType);

      if (contracts.length === 0) {
        console.log(`[LegalDetector] No contracts found for entity ${options.entityId}`);
        return [];
      }

      console.log(`[LegalDetector] Analyzing ${contracts.length} contract documents`);

      // Analyze each contract (limit to first 5 for performance)
      const contractsToAnalyze = contracts.slice(0, 5);

      for (const contract of contractsToAnalyze) {
        try {
          const detections = await this.analyzeContract(contract, options);
          flags.push(...detections);
        } catch (error) {
          console.error(`[LegalDetector] Error analyzing contract ${contract.id}:`, error);
          // Continue with other contracts
        }
      }

      return flags;
    });
  }

  /**
   * Get contract documents from the database
   */
  private async getContractDocuments(
    entityId: string,
    entityType: string
  ): Promise<Array<{ id: string; file_name: string; content: string }>> {
    const supabase = await createClient();

    // Query documents table for contracts
    // Assuming Data Room documents are associated with entities
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, file_name, document_type, ai_classification, extracted_text')
      .or(`document_type.eq.contract,ai_classification->>document_type.eq.contract`)
      .limit(10);

    if (error) {
      console.warn('[LegalDetector] Error fetching documents:', error);
      return [];
    }

    if (!documents || documents.length === 0) {
      return [];
    }

    // Filter to only contracts with extracted text
    return documents
      .filter(doc => doc.extracted_text)
      .map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        content: doc.extracted_text || '',
      }));
  }

  /**
   * Analyze a single contract using LLM
   */
  private async analyzeContract(
    contract: { id: string; file_name: string; content: string },
    options: DetectorOptions
  ): Promise<Partial<RedFlag>[]> {
    const flags: Partial<RedFlag>[] = [];

    // Split content into chunks (max 4000 chars per chunk for LLM context)
    const chunks = this.chunkText(contract.content, 4000);

    // Analyze each chunk (limit to first 3 chunks for cost control)
    const chunksToAnalyze = chunks.slice(0, 3);

    for (let i = 0; i < chunksToAnalyze.length; i++) {
      const chunk = chunksToAnalyze[i];
      const detections = await this.analyzeLegalClause(chunk, contract, i);

      for (const detection of detections) {
        const flag = this.createFlagFromDetection(
          detection,
          contract,
          i,
          options
        );
        flags.push(flag);
      }
    }

    return flags;
  }

  /**
   * Analyze a contract chunk using LLM
   */
  private async analyzeLegalClause(
    chunk: string,
    contract: { id: string; file_name: string },
    chunkIndex: number
  ): Promise<LegalClauseDetection[]> {
    const prompt = this.buildLegalAnalysisPrompt(chunk);

    try {
      const response = await this.llmClient.complete(prompt, {
        model: 'anthropic/claude-3.5-sonnet', // Use Sonnet for legal analysis
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 2000,
        system_prompt: 'You are a legal risk analyst specializing in contract review for M&A due diligence. Analyze contracts for high-risk clauses that could impact deal value or create post-acquisition liabilities.',
      });

      // Parse JSON response
      const parsed = JSON.parse(response);

      // Handle both single object and array responses
      const detections = Array.isArray(parsed) ? parsed : [parsed];

      // Filter to only flagged items
      return detections.filter((d: LegalClauseDetection) => d.flag);
    } catch (error) {
      console.error('[LegalDetector] LLM analysis error:', error);
      return [];
    }
  }

  /**
   * Build LLM prompt for legal clause analysis
   */
  private buildLegalAnalysisPrompt(chunk: string): string {
    return `You are a legal risk analyst. Review the following contract excerpt and identify high-risk clauses.

EXAMPLES:
1. Input: "Customer may terminate this agreement for convenience with 30 days notice."
   Output: {
     "flag": true,
     "category": "legal",
     "severity": "high",
     "confidence": 0.85,
     "title": "Termination for Convenience Risk",
     "evidence": "Customer may terminate...30 days notice",
     "explanation": "This clause allows unilateral termination without cause, creating revenue risk.",
     "clause_type": "termination_for_convenience"
   }

2. Input: "Pricing shall not exceed most favored nation terms."
   Output: {
     "flag": true,
     "category": "legal",
     "severity": "medium",
     "confidence": 0.90,
     "title": "Most Favored Nation Clause Present",
     "evidence": "Pricing shall not exceed...terms",
     "explanation": "MFN clauses limit pricing flexibility and may trigger repricing obligations.",
     "clause_type": "mfn"
   }

3. Input: "This Agreement may not be assigned without prior written consent of both parties."
   Output: {
     "flag": false,
     "category": "legal",
     "severity": "low",
     "confidence": 0.95,
     "title": "Standard Assignment Clause",
     "evidence": "may not be assigned without prior written consent",
     "explanation": "Standard mutual consent requirement, typical and reasonable."
   }

CONTRACT EXCERPT:
${chunk}

TASK: Analyze for these HIGH-RISK clauses:
- Change of control provisions that trigger customer termination rights
- Termination for convenience (unilateral termination without cause)
- Most Favored Nation (MFN) pricing clauses
- Assignment restrictions that prevent M&A transactions
- Unlimited liability or indemnity obligations
- Automatic renewal with short notice periods

Return a JSON array of findings. For each clause found, include:
- flag: true if HIGH RISK, false if standard/acceptable
- category: "legal"
- severity: "critical" | "high" | "medium" | "low"
- confidence: 0.0-1.0 (how certain you are)
- title: Brief title of the risk
- evidence: Relevant excerpt (max 200 chars)
- explanation: Why this matters (1-2 sentences)
- clause_type: Type identifier (e.g., "change_of_control", "termination_for_convenience", "mfn")

If no high-risk clauses found, return empty array: []`;
  }

  /**
   * Create a RedFlag from LLM detection
   */
  private createFlagFromDetection(
    detection: LegalClauseDetection,
    contract: { id: string; file_name: string },
    chunkIndex: number,
    options: DetectorOptions
  ): Partial<RedFlag> {
    const citation: CitationData = {
      type: 'document',
      documentId: contract.id,
      pageNumber: detection.page_number || 1,
      chunkIndex: detection.chunk_index || chunkIndex,
    };

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'legal',
      title: detection.title,
      description: detection.explanation,
      severity: detection.severity as FlagSeverity,
      confidence: detection.confidence,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          clause_type: detection.clause_type,
          contract_id: contract.id,
          contract_name: contract.file_name,
          chunk_index: chunkIndex,
          evidence_preview: scrubEvidencePreview(detection.evidence),
          llm_model: 'anthropic/claude-3.5-sonnet',
        },
      },
    };

    // Generate fingerprint
    flag.fingerprint = this.generateFingerprint(flag);

    return flag;
  }

  /**
   * Split text into chunks for LLM processing
   */
  private chunkText(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split by paragraphs (double newline)
    const paragraphs = text.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If single paragraph is too large, split by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
              }
              currentChunk = sentence;
            } else {
              currentChunk += ' ' + sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

/**
 * Singleton instance
 */
let legalDetectorInstance: LegalDetector | null = null;

/**
 * Get legal detector instance
 */
export function getLegalDetector(): LegalDetector {
  if (!legalDetectorInstance) {
    legalDetectorInstance = new LegalDetector();
  }
  return legalDetectorInstance;
}
