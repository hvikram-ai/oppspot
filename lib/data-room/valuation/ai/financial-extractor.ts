/**
 * AI Financial Extractor
 *
 * Extracts SaaS financial metrics from documents using Claude Sonnet 3.5
 * Targets: ARR, MRR, growth rate, gross margin, NRR, CAC payback, burn rate, runway, EBITDA
 */

import { getLLMProvider } from '@/lib/ai/llm-factory';
import { createClient } from '@/lib/supabase/server';
import type {
  ExtractFinancialsInput,
  ExtractedFinancials,
  ValuationError,
  ValuationErrorCode,
} from '../types';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a financial analyst expert specializing in SaaS business metrics extraction.

Your task is to extract key SaaS financial metrics from documents like financial statements, pitch decks, investor reports, and annual filings.

Extract the following metrics when available:
- **ARR** (Annual Recurring Revenue): Total recurring revenue annualized
- **MRR** (Monthly Recurring Revenue): Monthly recurring revenue
- **Revenue Growth Rate**: Year-over-year or quarter-over-quarter growth %
- **Gross Margin**: (Revenue - COGS) / Revenue as percentage
- **Net Revenue Retention (NRR)**: Expansion minus churn, typically >100% for good SaaS
- **CAC Payback**: Months to recover customer acquisition cost
- **Burn Rate**: Monthly cash consumption (if operating at a loss)
- **Runway**: Months of cash remaining at current burn rate
- **EBITDA**: Earnings before interest, taxes, depreciation, amortization
- **Employees**: Total headcount

**Instructions:**
1. Look for explicit statements of these metrics in the text
2. If metrics are stated for different periods (Q1, Q2, FY2023, etc.), extract the MOST RECENT values
3. Convert all metrics to consistent units (e.g., millions → numeric, percentages → decimals)
4. If a metric is not found or cannot be reliably extracted, set it to null
5. Provide confidence scores for each extracted metric (0.0 to 1.0)
6. Explain your reasoning for each extraction

**Output Format:**
Return a JSON object with this exact structure:
\`\`\`json
{
  "arr": number | null,
  "mrr": number | null,
  "revenue": number | null,
  "revenue_growth_rate": number | null,
  "gross_margin": number | null,
  "net_revenue_retention": number | null,
  "cac_payback_months": number | null,
  "burn_rate": number | null,
  "runway_months": number | null,
  "ebitda": number | null,
  "employees": number | null,
  "confidence_scores": {
    "arr": number,
    "mrr": number,
    "revenue": number,
    "revenue_growth_rate": number,
    "gross_margin": number,
    "net_revenue_retention": number,
    "cac_payback_months": number,
    "burn_rate": number,
    "runway_months": number,
    "ebitda": number,
    "employees": number
  },
  "reasoning": string,
  "warnings": string[]
}
\`\`\`

**Important:**
- All revenue/financial numbers should be in the document's native currency (don't convert)
- Percentages should be returned as numbers (e.g., 75.5 for 75.5%, not 0.755)
- Be conservative with confidence scores - only use >0.8 when explicitly stated
- If you make assumptions or estimates, note them in warnings array`;

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract financial metrics from documents
 */
export async function extractFinancials(
  input: ExtractFinancialsInput,
  userId: string
): Promise<ExtractedFinancials> {
  const startTime = Date.now();

  try {
    // Step 1: Fetch document content
    const documentTexts = await fetchDocumentTexts(input.document_ids);

    if (documentTexts.length === 0) {
      throw new Error('No document content found');
    }

    // Step 2: Build extraction prompt
    const prompt = buildExtractionPrompt(
      documentTexts,
      input.company_name,
      input.fiscal_year_end,
      input.currency
    );

    // Step 3: Call LLM for extraction
    const llmProvider = await getLLMProvider();
    const response = await llmProvider.complete(prompt, {
      system_prompt: SYSTEM_PROMPT,
      temperature: 0.1, // Low temperature for factual extraction
      max_tokens: 2000,
    });

    // Step 4: Parse LLM response
    const extracted = parseExtractionResponse(response);

    // Step 5: Calculate data quality score
    const dataQualityScore = calculateDataQualityScore(
      extracted,
      documentTexts.length
    );

    // Step 6: Return structured result
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      ...extracted,
      data_quality_score: dataQualityScore,
      source_documents: input.document_ids,
      extraction_method: 'ai_extracted',
      ai_model_used: llmProvider.model || 'claude-3.5-sonnet',
      processing_time_ms: processingTime,
    };
  } catch (error) {
    console.error('[FinancialExtractor] Extraction failed:', error);

    return {
      success: false,
      confidence_scores: {},
      data_quality_score: 0,
      source_documents: input.document_ids,
      ai_reasoning: 'Extraction failed',
      ai_model_used: 'claude-3.5-sonnet',
      processing_time_ms: Date.now() - startTime,
      extraction_method: 'ai_extracted',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch text content from document IDs
 */
async function fetchDocumentTexts(
  documentIds: string[]
): Promise<Array<{ id: string; text: string; filename: string }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_pages')
      .select('document_id, page_number, text_content')
      .in('document_id', documentIds)
      .order('document_id')
      .order('page_number');

    if (error) throw error;

    // Get document metadata
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, filename')
      .in('id', documentIds);

    if (docsError) throw docsError;

    // Group pages by document
    const documentMap = new Map<string, { filename: string; pages: string[] }>();

    docs?.forEach((doc) => {
      documentMap.set(doc.id, { filename: doc.filename, pages: [] });
    });

    data?.forEach((page) => {
      const doc = documentMap.get(page.document_id);
      if (doc) {
        doc.pages.push(page.text_content || '');
      }
    });

    // Convert to array of document texts
    const documentTexts: Array<{ id: string; text: string; filename: string }> = [];

    documentMap.forEach((doc, id) => {
      documentTexts.push({
        id,
        text: doc.pages.join('\n\n'),
        filename: doc.filename,
      });
    });

    return documentTexts;
  } catch (error) {
    console.error('[FinancialExtractor] Fetch document texts failed:', error);
    return [];
  }
}

/**
 * Build extraction prompt with document context
 */
function buildExtractionPrompt(
  documentTexts: Array<{ id: string; text: string; filename: string }>,
  companyName: string,
  fiscalYearEnd?: string,
  currency?: string
): string {
  const documentsSection = documentTexts
    .map(
      (doc, index) =>
        `## Document ${index + 1}: ${doc.filename}

${doc.text.substring(0, 15000)} ${doc.text.length > 15000 ? '...[truncated]' : ''}`
    )
    .join('\n\n---\n\n');

  return `Extract SaaS financial metrics for **${companyName}**.

${fiscalYearEnd ? `Fiscal Year End: ${fiscalYearEnd}` : ''}
${currency ? `Currency: ${currency}` : 'Currency: Unknown (detect from documents)'}

# Documents to Analyze:

${documentsSection}

# Task:

Extract the following SaaS metrics from the documents above:
- Annual Recurring Revenue (ARR)
- Monthly Recurring Revenue (MRR)
- Total Revenue (if ARR not stated)
- Revenue Growth Rate (YoY or QoQ %)
- Gross Margin (%)
- Net Revenue Retention (NRR %)
- CAC Payback Period (months)
- Monthly Burn Rate
- Cash Runway (months)
- EBITDA
- Employee Count

**Focus on the MOST RECENT financial data available.**

Return your analysis in the JSON format specified in the system prompt.`;
}

/**
 * Parse LLM response and extract structured data
 */
function parseExtractionResponse(response: string): Partial<ExtractedFinancials> {
  try {
    // Try to extract JSON from response (may be wrapped in markdown)
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    return {
      arr: parsed.arr,
      mrr: parsed.mrr,
      revenue: parsed.revenue,
      revenue_growth_rate: parsed.revenue_growth_rate,
      gross_margin: parsed.gross_margin,
      net_revenue_retention: parsed.net_revenue_retention,
      cac_payback_months: parsed.cac_payback_months,
      burn_rate: parsed.burn_rate,
      runway_months: parsed.runway_months,
      ebitda: parsed.ebitda,
      employees: parsed.employees,
      confidence_scores: parsed.confidence_scores || {},
      ai_reasoning: parsed.reasoning || '',
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error('[FinancialExtractor] Parse response failed:', error);
    throw new Error('Failed to parse LLM response');
  }
}

/**
 * Calculate overall data quality score
 */
function calculateDataQualityScore(
  extracted: Partial<ExtractedFinancials>,
  documentCount: number
): number {
  // Count how many key metrics were extracted
  const keyMetrics = [
    'arr',
    'mrr',
    'revenue_growth_rate',
    'gross_margin',
    'net_revenue_retention',
  ];

  const extractedCount = keyMetrics.filter(
    (metric) => extracted[metric as keyof ExtractedFinancials] !== null &&
      extracted[metric as keyof ExtractedFinancials] !== undefined
  ).length;

  const completeness = extractedCount / keyMetrics.length;

  // Average confidence scores
  const confidenceScores = Object.values(extracted.confidence_scores || {});
  const avgConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

  // Bonus for multiple documents (more validation)
  const documentBonus = Math.min(documentCount / 5, 0.2); // Up to 20% bonus

  // Final score: 60% completeness + 30% confidence + 10% document count
  const score = completeness * 0.6 + avgConfidence * 0.3 + documentBonus;

  return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate extracted financials for consistency
 */
export function validateExtractedFinancials(
  extracted: ExtractedFinancials
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check ARR/MRR consistency (ARR should be ~12x MRR)
  if (extracted.arr && extracted.mrr) {
    const expectedARR = extracted.mrr * 12;
    const diff = Math.abs(extracted.arr - expectedARR) / expectedARR;

    if (diff > 0.15) {
      // More than 15% difference
      warnings.push(
        `ARR ($${extracted.arr.toLocaleString()}) and MRR ($${extracted.mrr.toLocaleString()}) are inconsistent. Expected ARR ≈ $${expectedARR.toLocaleString()}`
      );
    }
  }

  // Check gross margin range (should be 0-100%)
  if (extracted.gross_margin !== null && extracted.gross_margin !== undefined) {
    if (extracted.gross_margin < 0 || extracted.gross_margin > 100) {
      warnings.push(`Gross margin (${extracted.gross_margin}%) is out of valid range (0-100%)`);
    }
  }

  // Check NRR range (typically 80-130% for SaaS)
  if (extracted.net_revenue_retention !== null && extracted.net_revenue_retention !== undefined) {
    if (extracted.net_revenue_retention < 50 || extracted.net_revenue_retention > 200) {
      warnings.push(
        `NRR (${extracted.net_revenue_retention}%) seems unusual. Typical range: 80-130%`
      );
    }
  }

  // Check runway calculation
  if (extracted.burn_rate && extracted.runway_months) {
    // If burn rate is positive, company is losing money
    if (extracted.burn_rate > 0 && extracted.runway_months < 3) {
      warnings.push(
        `Cash runway is critically low (${extracted.runway_months} months) with burn rate of $${extracted.burn_rate.toLocaleString()}/month`
      );
    }
  }

  // Check growth rate range
  if (extracted.revenue_growth_rate !== null && extracted.revenue_growth_rate !== undefined) {
    if (extracted.revenue_growth_rate < -50 || extracted.revenue_growth_rate > 500) {
      warnings.push(
        `Revenue growth rate (${extracted.revenue_growth_rate}%) is extreme. Verify this is correct.`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get extraction confidence level
 */
export function getExtractionConfidenceLevel(
  extracted: ExtractedFinancials
): 'high' | 'medium' | 'low' {
  const score = extracted.data_quality_score;

  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Get missing critical metrics
 */
export function getMissingCriticalMetrics(
  extracted: ExtractedFinancials
): string[] {
  const critical = ['arr', 'mrr', 'revenue_growth_rate', 'gross_margin'];
  const missing: string[] = [];

  critical.forEach((metric) => {
    if (
      extracted[metric as keyof ExtractedFinancials] === null ||
      extracted[metric as keyof ExtractedFinancials] === undefined
    ) {
      missing.push(metric);
    }
  });

  return missing;
}
