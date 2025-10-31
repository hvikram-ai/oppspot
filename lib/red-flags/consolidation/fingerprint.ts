/**
 * Fingerprinting and Deduplication Logic
 *
 * Generates deterministic fingerprints for red flags to enable:
 * - Deduplication across multiple detection runs
 * - Consistent identification of the same underlying issue
 * - Severity escalation tracking
 *
 * Based on SHA-256 hashing of normalized attributes.
 */

import { createHash } from 'crypto';
import { RedFlag, FlagCategory } from '../types';

/**
 * Generate a deterministic fingerprint for a red flag
 *
 * The fingerprint uniquely identifies a flag based on:
 * - Entity type and ID (which company/data room)
 * - Category (financial, legal, etc.)
 * - Normalized title (lowercase, no punctuation)
 * - Key attributes specific to the flag type
 *
 * @param flag Partial flag data (must include category, title, entity_id, entity_type)
 * @returns 16-character hex fingerprint
 */
export function generateFingerprint(flag: Partial<RedFlag>): string {
  if (!flag.category || !flag.title || !flag.entity_id || !flag.entity_type) {
    throw new Error('Cannot generate fingerprint: missing required fields (category, title, entity_id, entity_type)');
  }

  const normalized = {
    category: flag.category.toLowerCase(),
    title: normalizeText(flag.title),
    entityType: flag.entity_type,
    entityId: flag.entity_id,
    // Extract and sort key attributes for deterministic ordering
    keyAttributes: extractKeyAttributes(flag),
  };

  const hash = createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');

  // Use first 16 characters for brevity while maintaining low collision rate
  // 16 hex chars = 64 bits = ~18 quintillion combinations
  return hash.substring(0, 16);
}

/**
 * Normalize text for consistent fingerprinting
 * Handles variations in:
 * - Case (uppercase vs lowercase)
 * - Whitespace (single vs multiple spaces)
 * - Punctuation (with vs without)
 *
 * @param text Input text
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')        // Collapse multiple spaces
    .replace(/[^\w\s]/g, '');    // Remove punctuation
}

/**
 * Extract key attributes from flag metadata for fingerprinting
 *
 * Different categories have different key attributes that define uniqueness:
 * - Financial: metric name, threshold, customer/vendor ID
 * - Legal: clause type, contract ID, party names
 * - Operational: SLA ID, metric type, threshold
 * - Cyber: incident type, asset ID, CVE ID
 * - ESG: disclosure topic, metric name, reporting period
 *
 * @param flag Partial flag data
 * @returns Sorted object of key attributes
 */
export function extractKeyAttributes(flag: Partial<RedFlag>): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  const metadata = flag.meta?.detector_metadata;

  if (!metadata) {
    return {};
  }

  // Category-specific attribute extraction
  switch (flag.category) {
    case 'financial':
      extractFinancialAttributes(metadata, attributes);
      break;
    case 'legal':
      extractLegalAttributes(metadata, attributes);
      break;
    case 'operational':
      extractOperationalAttributes(metadata, attributes);
      break;
    case 'cyber':
      extractCyberAttributes(metadata, attributes);
      break;
    case 'esg':
      extractESGAttributes(metadata, attributes);
      break;
  }

  // Sort keys for deterministic ordering
  return Object.keys(attributes)
    .sort()
    .reduce((sorted: Record<string, unknown>, key) => {
      sorted[key] = attributes[key];
      return sorted;
    }, {});
}

/**
 * Extract financial-specific attributes
 */
function extractFinancialAttributes(
  metadata: Record<string, unknown>,
  attributes: Record<string, unknown>
): void {
  if ('metric_name' in metadata) attributes.metric_name = metadata.metric_name;
  if ('threshold' in metadata) attributes.threshold = metadata.threshold;
  if ('customer_id' in metadata) attributes.customer_id = metadata.customer_id;
  if ('vendor_id' in metadata) attributes.vendor_id = metadata.vendor_id;
  if ('period' in metadata) attributes.period = metadata.period;
}

/**
 * Extract legal-specific attributes
 */
function extractLegalAttributes(
  metadata: Record<string, unknown>,
  attributes: Record<string, unknown>
): void {
  if ('clause_type' in metadata) attributes.clause_type = metadata.clause_type;
  if ('contract_id' in metadata) attributes.contract_id = metadata.contract_id;
  if ('party_names' in metadata) {
    // Sort party names for consistent ordering
    const parties = metadata.party_names as string[];
    attributes.party_names = parties.sort().join(',');
  }
  if ('effective_date' in metadata) attributes.effective_date = metadata.effective_date;
}

/**
 * Extract operational-specific attributes
 */
function extractOperationalAttributes(
  metadata: Record<string, unknown>,
  attributes: Record<string, unknown>
): void {
  if ('sla_id' in metadata) attributes.sla_id = metadata.sla_id;
  if ('metric_type' in metadata) attributes.metric_type = metadata.metric_type;
  if ('threshold' in metadata) attributes.threshold = metadata.threshold;
  if ('service_name' in metadata) attributes.service_name = metadata.service_name;
}

/**
 * Extract cyber-specific attributes
 */
function extractCyberAttributes(
  metadata: Record<string, unknown>,
  attributes: Record<string, unknown>
): void {
  if ('incident_type' in metadata) attributes.incident_type = metadata.incident_type;
  if ('asset_id' in metadata) attributes.asset_id = metadata.asset_id;
  if ('cve_id' in metadata) attributes.cve_id = metadata.cve_id;
  if ('severity_score' in metadata) attributes.severity_score = metadata.severity_score;
}

/**
 * Extract ESG-specific attributes
 */
function extractESGAttributes(
  metadata: Record<string, unknown>,
  attributes: Record<string, unknown>
): void {
  if ('disclosure_topic' in metadata) attributes.disclosure_topic = metadata.disclosure_topic;
  if ('metric_name' in metadata) attributes.metric_name = metadata.metric_name;
  if ('reporting_period' in metadata) attributes.reporting_period = metadata.reporting_period;
  if ('framework' in metadata) attributes.framework = metadata.framework;
}

/**
 * Check if two flags have the same fingerprint
 * (i.e., represent the same underlying issue)
 */
export function isSameIssue(flag1: Partial<RedFlag>, flag2: Partial<RedFlag>): boolean {
  try {
    return generateFingerprint(flag1) === generateFingerprint(flag2);
  } catch {
    return false;
  }
}
