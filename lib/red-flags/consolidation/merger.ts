/**
 * Evidence Merger for Flag Deduplication
 *
 * When multiple detectors (or multiple runs) identify the same underlying issue,
 * we need to merge the evidence and update the flag appropriately.
 *
 * Key behaviors:
 * - Take maximum severity between existing and incoming flags
 * - Merge evidence arrays (deduplicate by source_id)
 * - Update timestamps
 * - Detect severity escalations for alerting
 */

import {
  RedFlag,
  RedFlagEvidence,
  FlagSeverity,
  FlagMetadata,
} from '../types';

/**
 * Result of merging two flags
 */
export interface MergeResult {
  updatedFlag: RedFlag;
  severityIncreased: boolean;
  evidenceAdded: number;
}

/**
 * Severity ranking for comparison (higher = more severe)
 */
const SEVERITY_RANK: Record<FlagSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Merge an incoming flag detection with an existing flag
 *
 * This is called during deduplication when a new detection matches
 * an existing flag's fingerprint.
 *
 * @param existing The existing flag in the database
 * @param incoming The newly detected flag
 * @param incomingEvidence Evidence from the new detection
 * @returns Merge result with updated flag and severity change indicator
 */
export function mergeFlags(
  existing: RedFlag,
  incoming: Partial<RedFlag>,
  incomingEvidence: RedFlagEvidence[] = []
): MergeResult {
  // Determine if severity increased
  const oldSeverity = existing.severity;
  const newSeverity = incoming.severity || existing.severity;
  const severityIncreased = compareSeverity(newSeverity, oldSeverity) > 0;

  // Take the maximum severity
  const mergedSeverity = severityIncreased ? newSeverity : oldSeverity;

  // Merge metadata
  const mergedMeta = mergeMetadata(existing.meta, incoming.meta || {});

  // Update the flag
  const updatedFlag: RedFlag = {
    ...existing,
    severity: mergedSeverity,
    confidence: Math.max(existing.confidence || 0, incoming.confidence || 0),
    last_updated_at: new Date().toISOString(),
    meta: mergedMeta,
    // Update description if incoming has more detail
    description: incoming.description || existing.description,
  };

  return {
    updatedFlag,
    severityIncreased,
    evidenceAdded: incomingEvidence.length,
  };
}

/**
 * Merge evidence arrays from existing and incoming flags
 *
 * Deduplicates by (evidence_type, source_id) to avoid duplicate evidence.
 * Preserves all unique evidence and takes the higher importance/score
 * when duplicates are found.
 *
 * @param existing Existing evidence array
 * @param incoming New evidence to merge
 * @returns Merged and deduplicated evidence array
 */
export function mergeEvidence(
  existing: RedFlagEvidence[],
  incoming: RedFlagEvidence[]
): RedFlagEvidence[] {
  const evidenceMap = new Map<string, RedFlagEvidence>();

  // Add existing evidence to map
  for (const evidence of existing) {
    const key = getEvidenceKey(evidence);
    evidenceMap.set(key, evidence);
  }

  // Merge incoming evidence
  for (const evidence of incoming) {
    const key = getEvidenceKey(evidence);
    const existingEvidence = evidenceMap.get(key);

    if (!existingEvidence) {
      // New evidence, add it
      evidenceMap.set(key, evidence);
    } else {
      // Duplicate evidence, take the one with higher importance
      const mergedEvidence = mergeSingleEvidence(existingEvidence, evidence);
      evidenceMap.set(key, mergedEvidence);
    }
  }

  // Convert map back to array and sort by importance (descending)
  return Array.from(evidenceMap.values()).sort((a, b) => {
    const importanceA = a.importance || 0;
    const importanceB = b.importance || 0;
    return importanceB - importanceA;
  });
}

/**
 * Generate a unique key for evidence deduplication
 */
function getEvidenceKey(evidence: RedFlagEvidence): string {
  return `${evidence.evidence_type}:${evidence.source_id || 'null'}`;
}

/**
 * Merge two evidence items (same source)
 * Takes the maximum importance and score
 */
function mergeSingleEvidence(
  existing: RedFlagEvidence,
  incoming: RedFlagEvidence
): RedFlagEvidence {
  return {
    ...existing,
    importance: Math.max(existing.importance || 0, incoming.importance || 0),
    score: Math.max(existing.score || 0, incoming.score || 0),
    // Use incoming preview if it's longer/more detailed
    preview: (incoming.preview && incoming.preview.length > (existing.preview?.length || 0))
      ? incoming.preview
      : existing.preview,
    // Preserve citation from whichever has it
    citation: existing.citation || incoming.citation,
  };
}

/**
 * Merge metadata from existing and incoming flags
 *
 * Preserves explainer cache if inputs haven't changed.
 * Merges detector_metadata, keeping both old and new values.
 * Preserves override history.
 */
function mergeMetadata(
  existing: FlagMetadata,
  incoming: FlagMetadata
): FlagMetadata {
  return {
    // Preserve explainer if it exists (will be regenerated if needed)
    explainer: existing.explainer,

    // Preserve overrides (these are append-only)
    overrides: existing.overrides,

    // Merge detector metadata
    detector_metadata: {
      ...(existing.detector_metadata || {}),
      ...(incoming.detector_metadata || {}),
      // Track merge history
      last_merge_at: new Date().toISOString(),
    },
  };
}

/**
 * Compare two severity levels
 *
 * @returns Positive if severity1 > severity2, negative if severity1 < severity2, 0 if equal
 */
export function compareSeverity(
  severity1: FlagSeverity,
  severity2: FlagSeverity
): number {
  return SEVERITY_RANK[severity1] - SEVERITY_RANK[severity2];
}

/**
 * Check if severity escalation requires alerting
 *
 * Alert on:
 * - Any escalation to critical
 * - Escalation from medium/low to high
 * - (But not low -> medium, that's too noisy)
 */
export function shouldAlertOnSeverityChange(
  oldSeverity: FlagSeverity,
  newSeverity: FlagSeverity
): boolean {
  // Must be an actual increase
  if (compareSeverity(newSeverity, oldSeverity) <= 0) {
    return false;
  }

  // Alert on any escalation to critical
  if (newSeverity === 'critical') {
    return true;
  }

  // Alert on escalation to high (from medium or low)
  if (newSeverity === 'high' && (oldSeverity === 'medium' || oldSeverity === 'low')) {
    return true;
  }

  // Don't alert on low -> medium
  return false;
}
