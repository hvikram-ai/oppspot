/**
 * Contract Reuse Extractor - Reuses existing contract_extractions data
 *
 * Leverages existing contract extraction data to avoid redundant LLM calls.
 * Maps existing fields to summary template fields.
 */

import { BaseExtractor } from './base-extractor';
import type {
  SummaryField,
  ExtractionResult,
  ExtractionContext,
  FieldEvidence,
} from '../types';

/**
 * Field mapping configuration
 * Maps summary template field keys to contract_extractions field keys
 */
interface FieldMapping {
  summaryFieldKey: string;
  contractFieldKey: string;
  transform?: (value: unknown) => unknown;
  confidenceAdjustment?: number; // -1.0 to +1.0
}

/**
 * Pre-configured field mappings for common contract types
 */
const FIELD_MAPPINGS: FieldMapping[] = [
  // MSA mappings
  { summaryFieldKey: 'parties_provider', contractFieldKey: 'service_provider' },
  { summaryFieldKey: 'parties_customer', contractFieldKey: 'customer' },
  { summaryFieldKey: 'effective_date', contractFieldKey: 'effective_date' },
  { summaryFieldKey: 'term_length', contractFieldKey: 'contract_term' },
  { summaryFieldKey: 'termination_notice', contractFieldKey: 'termination_notice_period' },
  { summaryFieldKey: 'payment_terms', contractFieldKey: 'payment_terms' },
  { summaryFieldKey: 'governing_law', contractFieldKey: 'governing_law' },

  // NDA mappings
  { summaryFieldKey: 'party1_name', contractFieldKey: 'party_1' },
  { summaryFieldKey: 'party2_name', contractFieldKey: 'party_2' },
  { summaryFieldKey: 'nda_type', contractFieldKey: 'confidentiality_type' },

  // Order Form mappings
  { summaryFieldKey: 'order_number', contractFieldKey: 'po_number' },
  { summaryFieldKey: 'buyer_name', contractFieldKey: 'buyer' },
  { summaryFieldKey: 'seller_name', contractFieldKey: 'seller' },
  { summaryFieldKey: 'total_amount', contractFieldKey: 'total_value' },
];

/**
 * Contract reuse extractor
 */
export class ContractReuseExtractor extends BaseExtractor {
  private fieldMappings: Map<string, FieldMapping>;

  constructor(customMappings: FieldMapping[] = []) {
    super();
    // Combine default + custom mappings
    const allMappings = [...FIELD_MAPPINGS, ...customMappings];
    this.fieldMappings = new Map(
      allMappings.map((m) => [m.summaryFieldKey, m])
    );
  }

  /**
   * Extract field by reusing existing contract extraction data
   */
  async extractField(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    try {
      // Check if we have existing extractions
      if (!context.existing_extractions) {
        return {
          field_key: field.key,
          value: null,
          confidence: 0,
          method: 'reuse',
          error: 'No existing extractions available',
        };
      }

      // Find mapping for this field
      const mapping = this.fieldMappings.get(field.key);
      if (!mapping) {
        return {
          field_key: field.key,
          value: null,
          confidence: 0,
          method: 'reuse',
          error: 'No mapping found for field',
        };
      }

      // Get value from existing extractions
      const contractValue = context.existing_extractions[mapping.contractFieldKey];
      if (contractValue === undefined || contractValue === null) {
        return {
          field_key: field.key,
          value: null,
          confidence: 0,
          method: 'reuse',
          error: 'Field not found in existing extractions',
        };
      }

      // Apply transformation if configured
      const transformedValue = mapping.transform
        ? mapping.transform(contractValue)
        : contractValue;

      // Calculate confidence
      // Base confidence of 0.9 for reused data (high trust in existing extractions)
      let confidence = 0.9;

      // Apply adjustment if configured
      if (mapping.confidenceAdjustment !== undefined) {
        confidence = Math.max(0, Math.min(1, confidence + mapping.confidenceAdjustment));
      }

      // Reduce confidence if value seems incomplete or suspicious
      if (typeof transformedValue === 'string') {
        if (transformedValue.length < 2) confidence *= 0.5;
        if (transformedValue.toLowerCase().includes('unknown')) confidence *= 0.3;
        if (transformedValue.toLowerCase().includes('n/a')) confidence *= 0.3;
      }

      // Build evidence
      const evidence: FieldEvidence = {
        text: String(transformedValue),
        reasoning: `Reused from existing contract extraction (field: ${mapping.contractFieldKey})`,
        context: 'Previously extracted data',
      };

      return {
        field_key: field.key,
        value: transformedValue,
        raw_value: String(contractValue),
        confidence,
        evidence,
        method: 'reuse',
      };
    } catch (error) {
      console.error(`[ContractReuseExtractor] Error extracting field ${field.key}:`, error);
      return {
        field_key: field.key,
        value: null,
        confidence: 0,
        method: 'reuse',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getExtractionMethod(): 'reuse' {
    return 'reuse';
  }

  async canExtract(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<boolean> {
    // Can extract if:
    // 1. Existing extractions are available
    // 2. Field has a mapping
    // 3. Mapped field exists in extractions
    if (!context.existing_extractions) return false;

    const mapping = this.fieldMappings.get(field.key);
    if (!mapping) return false;

    const value = context.existing_extractions[mapping.contractFieldKey];
    return value !== undefined && value !== null;
  }

  async getConfidenceScore(
    field: SummaryField,
    context: ExtractionContext
  ): Promise<number> {
    const canExtract = await this.canExtract(field, context);
    if (!canExtract) return 0;

    // Reuse extractor has highest priority (0.95)
    // It's fast, cheap, and reliable
    return 0.95;
  }

  /**
   * Add custom field mapping
   */
  addMapping(mapping: FieldMapping): void {
    this.fieldMappings.set(mapping.summaryFieldKey, mapping);
  }

  /**
   * Add multiple custom mappings
   */
  addMappings(mappings: FieldMapping[]): void {
    mappings.forEach((m) => this.addMapping(m));
  }

  /**
   * Get all configured mappings
   */
  getMappings(): FieldMapping[] {
    return Array.from(this.fieldMappings.values());
  }

  /**
   * Check if a field has a mapping
   */
  hasMapping(fieldKey: string): boolean {
    return this.fieldMappings.has(fieldKey);
  }
}

/**
 * Helper function to create common field transformations
 */
export const FieldTransforms = {
  /**
   * Convert date string to ISO8601
   */
  toISO8601: (value: unknown): string | null => {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
    return null;
  },

  /**
   * Convert to boolean
   */
  toBoolean: (value: unknown): boolean | null => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (['true', 'yes', '1', 'y'].includes(lower)) return true;
      if (['false', 'no', '0', 'n'].includes(lower)) return false;
    }
    return null;
  },

  /**
   * Convert to number
   */
  toNumber: (value: unknown): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? null : num;
    }
    return null;
  },

  /**
   * Extract currency amount
   */
  toCurrency: (value: unknown): number | null => {
    if (typeof value === 'string') {
      // Remove currency symbols and parse
      const cleaned = value.replace(/[$£€,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return FieldTransforms.toNumber(value);
  },

  /**
   * Trim and clean string
   */
  cleanString: (value: unknown): string | null => {
    if (typeof value === 'string') {
      return value.trim() || null;
    }
    return value ? String(value).trim() : null;
  },
};
