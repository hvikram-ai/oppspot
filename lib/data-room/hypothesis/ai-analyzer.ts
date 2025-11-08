/**
 * AI Analyzer Service for Hypothesis Tracking
 * Analyzes documents to extract evidence and classify support for hypotheses
 */

import { OpenRouterClient } from '@/lib/ai/openrouter';
import { EvidenceType, HypothesisType, HypothesisMetric } from '../types';

export interface AnalysisResult {
  evidence_type: EvidenceType;
  relevance_score: number; // 0-100
  ai_reasoning: string;
  ai_confidence: number; // 0-1
  excerpts: {
    text: string;
    page_number?: number;
    relevance: number;
  }[];
  suggested_metrics?: {
    metric_name: string;
    target_value?: number;
    actual_value?: number;
    unit?: string;
  }[];
}

export interface ConfidenceCalculation {
  overall_confidence: number; // 0-100
  evidence_weight: number;
  relevance_weight: number;
  metrics_weight: number;
  breakdown: {
    supporting_evidence: number;
    contradicting_evidence: number;
    avg_relevance: number;
    metrics_met: number;
  };
}

/**
 * AIHypothesisAnalyzer - AI-powered hypothesis validation
 */
export class AIHypothesisAnalyzer {
  private llmClient: OpenRouterClient;
  private model = 'anthropic/claude-3.5-sonnet'; // Best for complex reasoning

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
    this.llmClient = new OpenRouterClient(apiKey);
  }

  /**
   * Analyze a document to find evidence for/against a hypothesis
   */
  async analyzeDocumentForHypothesis(
    documentText: string,
    hypothesisTitle: string,
    hypothesisDescription: string,
    hypothesisType: HypothesisType
  ): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(
      documentText,
      hypothesisTitle,
      hypothesisDescription,
      hypothesisType
    );

    try {
      const response = await this.llmClient.complete(prompt, {
        system_prompt: this.getSystemPrompt(),
        temperature: 0.3, // Low temperature for factual analysis
        max_tokens: 2000,
      });

      // Parse JSON response
      const result = JSON.parse(response);

      return {
        evidence_type: result.evidence_type as EvidenceType,
        relevance_score: Math.min(100, Math.max(0, result.relevance_score)),
        ai_reasoning: result.reasoning,
        ai_confidence: Math.min(1, Math.max(0, result.confidence)),
        excerpts: result.excerpts || [],
        suggested_metrics: result.suggested_metrics || [],
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      // Return neutral result on error
      return {
        evidence_type: 'neutral',
        relevance_score: 0,
        ai_reasoning: 'Analysis failed: ' + (error as Error).message,
        ai_confidence: 0,
        excerpts: [],
      };
    }
  }

  /**
   * Suggest metrics from financial/operational documents
   */
  async suggestMetricsFromDocuments(
    documents: { text: string; filename: string; document_type: string }[],
    hypothesisType: HypothesisType,
    hypothesisDescription: string
  ): Promise<HypothesisMetric[]> {
    const prompt = this.buildMetricsSuggestionPrompt(documents, hypothesisType, hypothesisDescription);

    try {
      const response = await this.llmClient.complete(prompt, {
        system_prompt: `You are a financial and business analyst. Extract quantitative metrics from documents that can be used to validate business hypotheses. Return a JSON array of metrics.`,
        temperature: 0.2,
        max_tokens: 1500,
      });

      const result = JSON.parse(response);
      return result.metrics || [];
    } catch (error) {
      console.error('Metrics suggestion error:', error);
      return [];
    }
  }

  /**
   * Calculate confidence score based on evidence and metrics
   */
  calculateConfidenceScore(
    supportingCount: number,
    contradictingCount: number,
    avgRelevanceScore: number,
    metricsMetCount: number,
    totalMetricsCount: number
  ): ConfidenceCalculation {
    const totalEvidence = supportingCount + contradictingCount;

    // Evidence weight (50%)
    const evidenceRatio = totalEvidence > 0 ? supportingCount / totalEvidence : 0;
    const evidenceWeight = evidenceRatio * 0.5;

    // Relevance weight (30%)
    const relevanceWeight = (avgRelevanceScore / 100) * 0.3;

    // Metrics weight (20%)
    const metricsRatio = totalMetricsCount > 0 ? metricsMetCount / totalMetricsCount : 0;
    const metricsWeight = metricsRatio * 0.2;

    // Overall confidence (0-100)
    const overallConfidence = Math.round(
      (evidenceWeight + relevanceWeight + metricsWeight) * 100
    );

    return {
      overall_confidence: Math.min(100, Math.max(0, overallConfidence)),
      evidence_weight: evidenceWeight * 100,
      relevance_weight: relevanceWeight * 100,
      metrics_weight: metricsWeight * 100,
      breakdown: {
        supporting_evidence: supportingCount,
        contradicting_evidence: contradictingCount,
        avg_relevance: avgRelevanceScore,
        metrics_met: metricsMetCount,
      },
    };
  }

  /**
   * Generate a summary of evidence for validation
   */
  async generateEvidenceSummary(
    hypothesisTitle: string,
    evidence: {
      evidence_type: EvidenceType;
      excerpt_text: string | null;
      ai_reasoning: string | null;
      relevance_score: number | null;
    }[]
  ): Promise<string> {
    const prompt = `
Hypothesis: "${hypothesisTitle}"

Evidence collected:
${evidence
  .map(
    (e, i) =>
      `${i + 1}. Type: ${e.evidence_type} (Relevance: ${e.relevance_score || 0}/100)
   Excerpt: "${e.excerpt_text || 'N/A'}"
   Reasoning: ${e.ai_reasoning || 'N/A'}`
  )
  .join('\n\n')}

Provide a concise executive summary (3-5 sentences) of the evidence and whether it supports or contradicts the hypothesis. Be objective and highlight key findings.
`;

    try {
      const response = await this.llmClient.complete(prompt, {
        system_prompt: `You are a strategic analyst providing evidence summaries for investment decisions. Be clear, objective, and concise.`,
        temperature: 0.4,
        max_tokens: 400,
      });

      return response.trim();
    } catch (error) {
      console.error('Evidence summary error:', error);
      return 'Unable to generate summary at this time.';
    }
  }

  /**
   * Identify key findings from evidence
   */
  async extractKeyFindings(
    hypothesisTitle: string,
    evidence: {
      evidence_type: EvidenceType;
      excerpt_text: string | null;
      ai_reasoning: string | null;
    }[]
  ): Promise<string[]> {
    const prompt = `
Hypothesis: "${hypothesisTitle}"

Evidence:
${evidence
  .map(
    (e, i) =>
      `${i + 1}. ${e.evidence_type.toUpperCase()}: "${e.excerpt_text || 'N/A'}"
   Reasoning: ${e.ai_reasoning || 'N/A'}`
  )
  .join('\n\n')}

Extract 3-5 key findings as bullet points. Focus on the most important insights that impact the hypothesis validation.

Return as JSON array of strings.
`;

    try {
      const response = await this.llmClient.complete(prompt, {
        system_prompt: `You are a strategic analyst extracting key findings. Return a JSON array of concise, actionable findings.`,
        temperature: 0.3,
        max_tokens: 500,
      });

      const result = JSON.parse(response);
      return Array.isArray(result) ? result : result.findings || [];
    } catch (error) {
      console.error('Key findings extraction error:', error);
      return ['Unable to extract key findings at this time.'];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getSystemPrompt(): string {
    return `You are an expert business analyst specializing in investment due diligence and M&A analysis.

Your task is to analyze documents to extract evidence that supports or contradicts investment hypotheses.

Guidelines:
1. Be objective and factual - don't make assumptions beyond what the document states
2. Classify evidence as "supporting", "contradicting", or "neutral"
3. Provide a relevance score (0-100) indicating how directly the evidence relates to the hypothesis
4. Give your reasoning confidence (0-1) for how certain you are about your classification
5. Extract specific excerpts that justify your classification
6. Suggest quantitative metrics when you find them

Return your analysis as JSON with this structure:
{
  "evidence_type": "supporting" | "contradicting" | "neutral",
  "relevance_score": 0-100,
  "reasoning": "Your explanation",
  "confidence": 0-1,
  "excerpts": [
    {
      "text": "Exact quote from document",
      "page_number": number or null,
      "relevance": 0-100
    }
  ],
  "suggested_metrics": [
    {
      "metric_name": "Revenue Growth Rate",
      "target_value": 20,
      "actual_value": 35,
      "unit": "%"
    }
  ]
}`;
  }

  private buildAnalysisPrompt(
    documentText: string,
    hypothesisTitle: string,
    hypothesisDescription: string,
    hypothesisType: HypothesisType
  ): string {
    // Truncate document text if too long (max ~8000 tokens ~= 32k chars)
    const maxLength = 32000;
    const truncatedText =
      documentText.length > maxLength
        ? documentText.substring(0, maxLength) + '\n\n[...document truncated...]'
        : documentText;

    return `
Hypothesis Title: "${hypothesisTitle}"
Hypothesis Type: ${hypothesisType}
Hypothesis Description: "${hypothesisDescription}"

Document Content:
---
${truncatedText}
---

Analyze this document to determine if it provides evidence that supports, contradicts, or is neutral to the hypothesis.

Focus on:
- ${this.getHypothesisTypeGuidance(hypothesisType)}
- Specific data points, metrics, or statements relevant to the hypothesis
- Any contradictory information that challenges the hypothesis
- Quantitative metrics that can be tracked

Return your analysis as JSON following the specified format.
`;
  }

  private buildMetricsSuggestionPrompt(
    documents: { text: string; filename: string; document_type: string }[],
    hypothesisType: HypothesisType,
    hypothesisDescription: string
  ): string {
    const documentsText = documents
      .map(
        (doc, i) =>
          `Document ${i + 1} (${doc.filename} - ${doc.document_type}):
---
${doc.text.substring(0, 10000)}
---`
      )
      .join('\n\n');

    return `
Hypothesis Type: ${hypothesisType}
Hypothesis Description: "${hypothesisDescription}"

Documents:
${documentsText}

Extract quantitative metrics from these documents that can be used to validate the hypothesis.

Focus on:
- ${this.getHypothesisTypeGuidance(hypothesisType)}
- Actual values found in the documents
- Target values or benchmarks mentioned
- Time periods and units

Return as JSON:
{
  "metrics": [
    {
      "metric_name": "Annual Revenue",
      "target_value": 10000000,
      "actual_value": 8500000,
      "unit": "USD",
      "description": "Found in Q4 2024 financial statement"
    }
  ]
}
`;
  }

  private getHypothesisTypeGuidance(type: HypothesisType): string {
    const guidance: Record<HypothesisType, string> = {
      revenue_growth: 'Revenue trends, growth rates, new revenue streams, market expansion',
      cost_synergy: 'Cost structures, redundancies, operational efficiencies, savings opportunities',
      market_expansion: 'Market size, addressable market, geographic expansion, new segments',
      tech_advantage: 'Technology capabilities, IP, competitive advantages, innovation',
      team_quality: 'Leadership experience, team capabilities, retention, culture',
      competitive_position: 'Market share, competitive advantages, differentiation, barriers to entry',
      operational_efficiency: 'Process metrics, productivity, automation, waste reduction',
      customer_acquisition: 'CAC, LTV, conversion rates, growth channels, retention',
      custom: 'Any relevant evidence based on the hypothesis description',
    };

    return guidance[type];
  }
}
