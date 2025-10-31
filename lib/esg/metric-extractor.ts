/**
 * ESG Metric Extractor
 * Extracts and normalizes ESG metrics from documents using AI
 */

import type { ESGDisclosure, ESGMetric, ESGCategory, ESGSubcategory } from '@/types/esg';
import { ESG_METRIC_DEFINITIONS } from '@/types/esg';

export interface ExtractionOptions {
  company_id: string;
  document_id: string;
  period_year: number;
  text_content: string;
  use_ai?: boolean;
  ai_model?: string;
}

export interface ExtractedMetric {
  metric_key: string;
  metric_name: string;
  category: ESGCategory;
  subcategory: ESGSubcategory;
  value_numeric?: number;
  value_text?: string;
  value_boolean?: boolean;
  unit?: string;
  citation: {
    document_id: string;
    page_number?: number;
    chunk_index?: number;
    excerpt: string;
  };
  confidence: number;
}

export class ESGMetricExtractor {
  /**
   * Extract ESG metrics from document text
   */
  async extractMetrics(options: ExtractionOptions): Promise<ExtractedMetric[]> {
    const { text_content, document_id } = options;

    if (!text_content || text_content.length < 10) {
      return [];
    }

    const metrics: ExtractedMetric[] = [];

    // Use AI-powered extraction if enabled
    if (options.use_ai) {
      const aiMetrics = await this.extractWithAI(options);
      metrics.push(...aiMetrics);
    } else {
      // Fallback to pattern-based extraction
      const patternMetrics = await this.extractWithPatterns(options);
      metrics.push(...patternMetrics);
    }

    return metrics;
  }

  /**
   * AI-powered extraction using LLM
   */
  private async extractWithAI(options: ExtractionOptions): Promise<ExtractedMetric[]> {
    const { text_content, document_id, period_year } = options;

    // TODO: Integrate with LLMManager
    // For now, return empty array - will be implemented with full AI integration
    console.log('[ESG Extractor] AI extraction not yet implemented');
    return [];
  }

  /**
   * Pattern-based extraction (regex and keywords)
   */
  private async extractWithPatterns(options: ExtractionOptions): Promise<ExtractedMetric[]> {
    const { text_content, document_id } = options;
    const metrics: ExtractedMetric[] = [];

    // GHG Emissions patterns
    const ghgPatterns = [
      {
        metric_key: 'ghg_scope1_tco2e',
        patterns: [
          /scope\s*1[:\s]+([0-9,]+\.?\d*)\s*(tCO2e?|tonnes?\s*CO2|metric\s*tons)/i,
          /direct\s+emissions[:\s]+([0-9,]+\.?\d*)\s*(tCO2e?|tonnes?)/i,
        ],
      },
      {
        metric_key: 'ghg_scope2_tco2e',
        patterns: [
          /scope\s*2[:\s]+([0-9,]+\.?\d*)\s*(tCO2e?|tonnes?\s*CO2)/i,
          /indirect\s+emissions[:\s]+([0-9,]+\.?\d*)\s*(tCO2e?|tonnes?)/i,
        ],
      },
      {
        metric_key: 'ghg_scope3_tco2e',
        patterns: [
          /scope\s*3[:\s]+([0-9,]+\.?\d*)\s*(tCO2e?|tonnes?\s*CO2)/i,
          /value\s+chain\s+emissions[:\s]+([0-9,]+\.?\d*)\s*(tCO2e?)/i,
        ],
      },
    ];

    // Energy patterns
    const energyPatterns = [
      {
        metric_key: 'energy_consumption_kwh',
        patterns: [
          /total\s+energy\s+consumption[:\s]+([0-9,]+\.?\d*)\s*(kWh|MWh|GWh)/i,
          /energy\s+use[:\s]+([0-9,]+\.?\d*)\s*(kWh|MWh)/i,
        ],
      },
      {
        metric_key: 'renewable_energy_pct',
        patterns: [
          /renewable\s+energy[:\s]+([0-9.]+)%/i,
          /([0-9.]+)%\s+renewable/i,
        ],
      },
    ];

    // Combine all patterns
    const allPatterns = [...ghgPatterns, ...energyPatterns];

    for (const { metric_key, patterns } of allPatterns) {
      for (const pattern of patterns) {
        const match = text_content.match(pattern);
        if (match) {
          const definition = ESG_METRIC_DEFINITIONS[metric_key];
          if (!definition) continue;

          const valueStr = match[1].replace(/,/g, '');
          const value = parseFloat(valueStr);
          const unit = match[2] || definition.unit || '';

          // Extract context (surrounding text)
          const matchIndex = text_content.indexOf(match[0]);
          const contextStart = Math.max(0, matchIndex - 100);
          const contextEnd = Math.min(text_content.length, matchIndex + match[0].length + 100);
          const excerpt = text_content.substring(contextStart, contextEnd).trim();

          metrics.push({
            metric_key,
            metric_name: definition.name,
            category: definition.category,
            subcategory: definition.subcategory,
            value_numeric: value,
            unit: unit,
            citation: {
              document_id,
              excerpt,
            },
            confidence: 0.7, // Pattern matching has moderate confidence
          });

          break; // Use first match for each metric
        }
      }
    }

    return metrics;
  }

  /**
   * Normalize unit to canonical form
   */
  normalizeUnit(value: number, fromUnit: string, toUnit: string): number {
    const conversions: Record<string, Record<string, number>> = {
      // Energy conversions (to kWh)
      kWh: { kWh: 1, MWh: 1000, GWh: 1000000 },
      // Mass conversions (to kg)
      kg: { kg: 1, tonnes: 1000, 'metric tons': 1000 },
      // CO2 conversions (to tCO2e)
      tCO2e: { tCO2e: 1, 'tCO2': 1, 'tonnes CO2': 1, 'metric tons CO2': 1 },
    };

    const conversionGroup = conversions[toUnit];
    if (!conversionGroup) return value;

    const conversionFactor = conversionGroup[fromUnit];
    if (!conversionFactor) return value;

    return value * conversionFactor;
  }

  /**
   * Parse boolean values from text
   */
  parseBoolean(text: string): boolean | null {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('yes') || lowerText.includes('true') || lowerText.includes('exists')) {
      return true;
    }

    if (lowerText.includes('no') || lowerText.includes('false') || lowerText.includes('not')) {
      return false;
    }

    return null;
  }

  /**
   * Calculate confidence score based on extraction method and data quality
   */
  calculateConfidence(
    extractionMethod: 'ai' | 'pattern' | 'manual',
    hasUnit: boolean,
    hasContext: boolean
  ): number {
    let confidence = 0;

    // Base confidence by method
    switch (extractionMethod) {
      case 'ai':
        confidence = 0.85;
        break;
      case 'pattern':
        confidence = 0.7;
        break;
      case 'manual':
        confidence = 1.0;
        break;
    }

    // Adjust based on data quality
    if (hasUnit) confidence += 0.05;
    if (hasContext) confidence += 0.05;

    return Math.min(1.0, confidence);
  }
}

// Singleton instance
let extractorInstance: ESGMetricExtractor | null = null;

export function getMetricExtractor(): ESGMetricExtractor {
  if (!extractorInstance) {
    extractorInstance = new ESGMetricExtractor();
  }
  return extractorInstance;
}
