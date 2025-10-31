/**
 * Red Flag Radar - TypeScript Type Definitions
 *
 * Core types for the Red Flag detection and management system.
 * These types align with the database schema defined in the migration files.
 */

// ============================================================================
// Database Enums
// ============================================================================

export type EntityType = 'company' | 'data_room';
export type FlagCategory = 'financial' | 'legal' | 'operational' | 'cyber' | 'esg';
export type FlagSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FlagStatus = 'open' | 'reviewing' | 'mitigating' | 'resolved' | 'false_positive';
export type EvidenceType = 'document' | 'alert' | 'signal' | 'kpi' | 'news';
export type ActionType = 'assign' | 'note' | 'status_change' | 'snooze' | 'remediation' | 'override';
export type RunStatus = 'running' | 'success' | 'partial' | 'error';

// ============================================================================
// Red Flag Run Types
// ============================================================================

export interface RunStats {
  detectors_ran: number;
  detectors_succeeded: number;
  detectors_failed: number;
  flags_detected: number;
  flags_new: number;
  flags_updated: number;
}

export interface RedFlagRun {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  started_at: string;
  finished_at: string | null;
  detector_version: string | null;
  stats: RunStats | null;
  status: RunStatus;
}

// ============================================================================
// Red Flag Types
// ============================================================================

export interface FlagMetadata {
  explainer?: {
    why: string;
    key_evidence: string[];
    suggested_remediation: string;
    timeframe: string;
    cached_at: string;
    model: string;
    inputs_hash: string;
  };
  overrides?: {
    severity?: {
      from: FlagSeverity;
      to: FlagSeverity;
      actor_id: string;
      reason: string;
    };
    confidence?: {
      from: number;
      to: number;
      actor_id: string;
      reason: string;
    };
  };
  detector_metadata?: Record<string, unknown>;
}

export interface RedFlag {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  category: FlagCategory;
  title: string;
  description: string | null;
  severity: FlagSeverity;
  confidence: number | null;
  status: FlagStatus;
  first_detected_at: string;
  last_updated_at: string;
  run_id: string | null;
  fingerprint: string;
  meta: FlagMetadata;
  owner_id: string | null;
  snoozed_until: string | null;
}

// ============================================================================
// Evidence Types
// ============================================================================

export type CitationData =
  | { type: 'document'; documentId: string; pageNumber: number; chunkIndex: number }
  | { type: 'alert'; alertId: string; severity: string }
  | { type: 'kpi'; kpiId: string; value: number; threshold: number }
  | { type: 'news'; newsId: string; source: string; published_at: string }
  | { type: 'signal'; signalId: string; value: number };

export interface RedFlagEvidence {
  id: string;
  flag_id: string;
  evidence_type: EvidenceType;
  source_id: string | null;
  title: string | null;
  preview: string | null;
  citation: CitationData | null;
  importance: number | null;
  score: number | null;
  url: string | null;
  page_number: number | null;
  chunk_index: number | null;
  created_at: string;
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionPayload =
  | { type: 'assign'; assignee_id: string; previous_owner_id: string | null }
  | { type: 'note'; text: string; is_internal: boolean }
  | { type: 'status_change'; from: FlagStatus; to: FlagStatus; reason?: string }
  | { type: 'snooze'; duration_days: number; until: string; reason: string }
  | { type: 'remediation'; plan: string; eta: string; stakeholders: string[] }
  | { type: 'override'; field: 'severity' | 'confidence'; from: unknown; to: unknown; reason: string };

export interface RedFlagAction {
  id: string;
  flag_id: string;
  action_type: ActionType;
  actor_id: string | null;
  payload: ActionPayload;
  created_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface FlagSummary {
  total: number;
  by_category: Record<FlagCategory, number>;
  by_severity: Record<FlagSeverity, number>;
  by_status: Record<FlagStatus, number>;
}

export interface FlagFilters {
  status?: FlagStatus[];
  category?: FlagCategory[];
  severity?: FlagSeverity[];
  search?: string;
  sort?: 'severity' | 'updated' | 'detected';
  page?: number;
  limit?: number;
}

export interface FlagListResult {
  flags: RedFlag[];
  summary: FlagSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface RedFlagDetail extends RedFlag {
  evidence: RedFlagEvidence[];
  actions: RedFlagAction[];
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

// ============================================================================
// Detector Types
// ============================================================================

export interface DetectorResult {
  flags: Partial<RedFlag>[];
  metadata: {
    detector: string;
    version: string;
    duration_ms: number;
    error?: string;
  };
}

export interface DetectorOptions {
  entityId: string;
  entityType: EntityType;
  timeRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// Explainability Types
// ============================================================================

export interface Explainer {
  why: string;
  key_evidence: string[];
  suggested_remediation: string;
  timeframe: string;
}

export interface RemediationSuggestion {
  plan: string;
  timeframe: string;
  stakeholders?: string[];
}

// ============================================================================
// Evidence Resolution Types
// ============================================================================

export interface EvidenceMetadata {
  id: string;
  title: string;
  type: EvidenceType;
  preview: string;
  citation: CitationData;
  url?: string;
  available: boolean;
}

export interface ResolvedEvidence extends RedFlagEvidence {
  metadata?: EvidenceMetadata;
}
