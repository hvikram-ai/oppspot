/**
 * Document Classifier
 * AI-powered document type classification using LLM Manager
 */

import { DocumentType } from '../types';
import { getUserLLMManager } from '@/lib/ai/llm-client-wrapper';

interface ClassificationResult {
  document_type: DocumentType;
  confidence_score: number;
  reasoning: string;
  alternative_types?: {
    type: DocumentType;
    confidence: number;
  }[];
}


/**
 * DocumentClassifier - Classifies documents using AI via LLM Manager
 */
export class DocumentClassifier {
  private userId: string;
  private model: string;

  constructor(userId: string = 'system') {
    this.userId = userId;
    this.model = 'anthropic/claude-3.5-sonnet'; // Claude Sonnet 3.5 for accuracy
  }

  /**
   * Classify a document based on its text content
   * @param text - Extracted text from document
   * @param filename - Original filename (optional, provides context)
   * @returns Classification result with type, confidence, and reasoning
   */
  async classify(
    text: string,
    filename?: string
  ): Promise<ClassificationResult> {
    const manager = await getUserLLMManager(this.userId);

    try {
      // Truncate text if too long (keep first 10k characters for classification)
      const truncatedText = text.slice(0, 10000);

      const systemPrompt = `You are an expert document classifier for due diligence and business analysis.

Classify documents into one of these categories:
- financial: Financial statements, P&L, balance sheets, cash flow statements, budgets, forecasts
- contract: Legal agreements, vendor contracts, customer agreements, NDAs, partnerships
- due_diligence: Due diligence reports, audit reports, compliance documents
- legal: Legal opinions, court documents, regulatory filings, patents
- hr: Employment agreements, org charts, compensation plans, employee handbooks
- other: Any document that doesn't fit the above categories

Return your response as a JSON object with this exact structure:
{
  "document_type": "<type>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>",
  "alternative_types": [
    {"type": "<type>", "confidence": <0.0-1.0>}
  ]
}

Be conservative with confidence scores:
- 0.9-1.0: Highly confident, clear indicators
- 0.7-0.9: Confident, most evidence points to this type
- 0.5-0.7: Moderate confidence, some ambiguity
- Below 0.5: Low confidence, unclear or mixed signals`;

      const userPrompt = `Document: ${filename ? `Filename: ${filename}\n\n` : ''}Text content:\n\n${truncatedText}`;

      // Use LLM Manager with automatic fallback
      const response = await manager.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: this.model,
          temperature: 0.1, // Low temperature for consistent classification
          maxTokens: 500,
          feature: 'data-room', // Track usage under data-room feature
        }
      );

      if (!response.content) {
        throw new Error('No response content from LLM');
      }

      // Parse JSON response
      const parsed = JSON.parse(response.content);

      // Validate and normalize response
      const result: ClassificationResult = {
        document_type: this.normalizeDocumentType(parsed.document_type),
        confidence_score: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        alternative_types: (parsed.alternative_types || [])
          .map((alt: { type: string; confidence: number }) => ({
            type: this.normalizeDocumentType(alt.type),
            confidence: Math.max(0, Math.min(1, alt.confidence || 0)),
          }))
          .filter((alt: { confidence: number }) => alt.confidence > 0.3) // Only keep alternatives with >30% confidence
          .slice(0, 2), // Max 2 alternatives
      };

      return result;
    } catch (error) {
      throw new Error(
        `Document classification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      await manager.cleanup();
    }
  }

  /**
   * Batch classify multiple documents
   * @param documents - Array of {text, filename} objects
   * @returns Array of classification results
   */
  async classifyBatch(
    documents: Array<{ text: string; filename?: string }>
  ): Promise<ClassificationResult[]> {
    // Process in parallel with max concurrency of 3 to avoid rate limits
    const results: ClassificationResult[] = [];
    const batchSize = 3;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((doc) => this.classify(doc.text, doc.filename))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Normalize document type to ensure it matches our enum
   * @param type - Type string from AI
   * @returns Valid DocumentType
   */
  private normalizeDocumentType(type: string): DocumentType {
    const normalized = type.toLowerCase().trim();

    const typeMap: Record<string, DocumentType> = {
      financial: 'financial',
      finance: 'financial',
      'financial statement': 'financial',
      contract: 'contract',
      agreement: 'contract',
      'legal agreement': 'contract',
      due_diligence: 'due_diligence',
      'due diligence': 'due_diligence',
      audit: 'due_diligence',
      legal: 'legal',
      'legal document': 'legal',
      hr: 'hr',
      'human resources': 'hr',
      employment: 'hr',
      other: 'other',
    };

    return typeMap[normalized] || 'other';
  }

  /**
   * Get confidence level label
   * @param score - Confidence score (0-1)
   * @returns Human-readable confidence level
   */
  static getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Check if classification needs human review
   * @param result - Classification result
   * @returns true if confidence is low or alternatives are close
   */
  static needsHumanReview(result: ClassificationResult): boolean {
    // Low confidence
    if (result.confidence_score < 0.6) {
      return true;
    }

    // Close alternatives
    if (result.alternative_types && result.alternative_types.length > 0) {
      const topAlternative = result.alternative_types[0];
      const confidenceDiff = result.confidence_score - topAlternative.confidence;

      // If difference is less than 0.2, it's ambiguous
      if (confidenceDiff < 0.2) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Factory function to get a DocumentClassifier instance
 * @param userId - User ID for per-user LLM configuration
 * @returns DocumentClassifier instance
 */
export function getDocumentClassifier(userId?: string): DocumentClassifier {
  return new DocumentClassifier(userId || 'system');
}
