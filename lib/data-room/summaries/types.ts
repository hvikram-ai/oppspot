/**
 * Structured Smart Summaries - Type Definitions
 *
 * Extract structured key points from contracts and corporate documents
 * with quality gates, confidence scoring, and multi-format exports.
 */

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export const FieldTypes = [
  'string',
  'number',
  'boolean',
  'date',
  'enum',
  'richtext',
  'json',
  'currency',
  'duration',
] as const;

export type FieldType = typeof FieldTypes[number];

export const RunStatuses = ['queued', 'running', 'success', 'partial', 'error'] as const;
export type RunStatus = typeof RunStatuses[number];

export const QualitySeverities = ['low', 'medium', 'high'] as const;
export type QualitySeverity = typeof QualitySeverities[number];

export const ExtractionMethods = ['reuse', 'llm', 'manual'] as const;
export type ExtractionMethod = typeof ExtractionMethods[number];

export const ExportFormats = ['json', 'xlsx', 'docx'] as const;
export type ExportFormat = typeof ExportFormats[number];

export const DocumentTypes = ['contract', 'corporate_profile', 'policy'] as const;
export type DocumentType = typeof DocumentTypes[number];

// =====================================================
// TEMPLATE INTERFACES
// =====================================================

export interface SummaryTemplate {
  id: string;
  org_id: string | null; // null = system template
  key: string;
  title: string;
  description: string | null;
  doc_type: DocumentType | string | null;
  version: string;
  active: boolean;
  required_coverage: number; // 0-1
  min_confidence: number; // 0-1
  created_at: string;
  updated_at: string;
}

export interface SummaryField {
  id: string;
  template_id: string;
  key: string;
  title: string;
  description: string | null;
  field_type: FieldType;
  required: boolean;
  source_hint: string | null;
  normalizer: FieldNormalizer | null;
  validation: FieldValidation | null;
  order_index: number;
  created_at: string;
}

export interface FieldNormalizer {
  // Currency normalization
  currency?: string; // e.g., 'USD', 'EUR'
  currencySymbol?: string;

  // Duration normalization
  unit?: 'days' | 'weeks' | 'months' | 'years';

  // Date normalization
  format?: string; // e.g., 'ISO8601', 'MM/DD/YYYY'

  // Enum normalization
  values?: string[]; // allowed enum values
  caseInsensitive?: boolean;

  // Number normalization
  precision?: number;
  min?: number;
  max?: number;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string; // regex pattern
  message?: string; // custom validation error message
}

// =====================================================
// RUN & SUMMARY INTERFACES
// =====================================================

export interface SummaryRun {
  id: string;
  document_id: string;
  template_id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  coverage: number | null; // 0-1
  avg_confidence: number | null; // 0-1
  quality_pass: boolean | null;
  details: RunDetails | null;
  created_by: string | null;
}

export interface RunDetails {
  error?: string;
  fields_extracted?: number;
  fields_failed?: number;
  extraction_times?: Record<string, number>; // field_key → ms
  llm_tokens_used?: number;
  reused_extractions?: number;
  llm_extractions?: number;
}

export interface DocumentSummary {
  id: string;
  run_id: string;
  document_id: string;
  template_id: string;
  coverage: number;
  avg_confidence: number;
  quality_pass: boolean;
  created_at: string;
}

export interface SummaryFieldValue {
  id: string;
  summary_id: string;
  field_id: string;
  value_json: unknown; // JSONB - can be string, number, boolean, array, object
  raw_value: string | null;
  confidence: number; // 0-1
  evidence: FieldEvidence | null;
  page_number: number | null;
  chunk_index: number | null;
  start_char: number | null;
  end_char: number | null;
  extraction_method: ExtractionMethod;
  created_at: string;
}

export interface FieldEvidence {
  text?: string; // text excerpt from document
  reasoning?: string; // LLM reasoning for extraction
  citations?: Array<{
    page: number;
    chunk: number;
    text: string;
  }>;
  context?: string; // surrounding context
}

export interface SummaryQualityIssue {
  id: string;
  run_id: string;
  field_key: string | null;
  issue: string;
  severity: QualitySeverity;
  context: QualityIssueContext | null;
  remediation: string | null;
  created_at: string;
}

export interface QualityIssueContext {
  field_id?: string;
  field_title?: string;
  expected_value?: unknown;
  actual_value?: unknown;
  confidence?: number;
  conflicting_evidence?: string[];
}

// =====================================================
// EXTRACTION INTERFACES
// =====================================================

export interface ExtractionSource {
  method: ExtractionMethod;
  source_id?: string; // e.g., contract_extraction_id
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface ExtractionResult {
  field_key: string;
  value: unknown;
  raw_value?: string;
  confidence: number;
  evidence?: FieldEvidence;
  page_number?: number;
  chunk_index?: number;
  start_char?: number;
  end_char?: number;
  method: ExtractionMethod;
  error?: string;
}

export interface ExtractionContext {
  document_id: string;
  template: SummaryTemplate;
  fields: SummaryField[];
  document_chunks?: DocumentChunk[];
  existing_extractions?: Record<string, unknown>; // from contract_extractions
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  content: string;
  start_char: number;
  end_char: number;
  embedding?: number[]; // vector embedding
}

// =====================================================
// QUALITY CHECK INTERFACES
// =====================================================

export interface QualityCheckResult {
  coverage: number; // 0-1
  avg_confidence: number; // 0-1
  quality_pass: boolean;
  issues: SummaryQualityIssue[];
  missing_required_fields: string[];
  low_confidence_fields: Array<{
    field_key: string;
    confidence: number;
  }>;
}

export interface QualityGateConfig {
  required_coverage: number; // 0-1
  min_confidence: number; // 0-1
  allow_high_severity_issues: boolean;
}

// =====================================================
// EXPORT INTERFACES
// =====================================================

export interface ExportOptions {
  format: ExportFormat;
  include_confidence?: boolean;
  include_evidence?: boolean;
  include_quality_issues?: boolean;
  filename?: string;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface JSONExport {
  summary: DocumentSummary;
  template: SummaryTemplate;
  fields: Array<{
    field: SummaryField;
    value: SummaryFieldValue;
  }>;
  quality: {
    coverage: number;
    avg_confidence: number;
    quality_pass: boolean;
    issues: SummaryQualityIssue[];
  };
  metadata: {
    exported_at: string;
    exported_by: string | null;
  };
}

// =====================================================
// API REQUEST/RESPONSE INTERFACES
// =====================================================

export interface RunSummaryRequest {
  templateKey?: string; // defaults to auto-detect based on doc type
  force?: boolean; // force re-run even if summary exists
}

export interface RunSummaryResponse {
  runId: string;
  status: RunStatus;
  message?: string;
}

export interface GetSummaryResponse {
  summary: DocumentSummary | null;
  template: SummaryTemplate;
  fields: Array<{
    field: SummaryField;
    value: SummaryFieldValue | null;
  }>;
  qualityIssues: SummaryQualityIssue[];
  run: SummaryRun | null;
}

export interface ListTemplatesResponse {
  templates: Array<{
    template: SummaryTemplate;
    field_count: number;
  }>;
}

// =====================================================
// SERVICE INTERFACES
// =====================================================

export interface SummaryServiceConfig {
  llm_provider?: string;
  llm_model?: string;
  max_chunks_per_field?: number; // for vector retrieval
  similarity_threshold?: number; // for vector retrieval
  extraction_timeout_ms?: number;
  parallel_extractions?: boolean;
}

export interface NormalizerResult {
  value: unknown;
  normalized: boolean;
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type PartialSummaryField = Omit<SummaryField, 'id' | 'template_id' | 'created_at'>;

export type PartialFieldValue = Omit<
  SummaryFieldValue,
  'id' | 'summary_id' | 'field_id' | 'created_at'
>;

export type SummaryWithFields = DocumentSummary & {
  template: SummaryTemplate;
  fields: Array<{
    field: SummaryField;
    value: SummaryFieldValue | null;
  }>;
  qualityIssues: SummaryQualityIssue[];
};

// =====================================================
// TYPE GUARDS
// =====================================================

export function isFieldType(value: string): value is FieldType {
  return FieldTypes.includes(value as FieldType);
}

export function isRunStatus(value: string): value is RunStatus {
  return RunStatuses.includes(value as RunStatus);
}

export function isQualitySeverity(value: string): value is QualitySeverity {
  return QualitySeverities.includes(value as QualitySeverity);
}

export function isExtractionMethod(value: string): value is ExtractionMethod {
  return ExtractionMethods.includes(value as ExtractionMethod);
}

export function isExportFormat(value: string): value is ExportFormat {
  return ExportFormats.includes(value as ExportFormat);
}

// =====================================================
// CONSTANTS
// =====================================================

export const DEFAULT_QUALITY_GATES: QualityGateConfig = {
  required_coverage: 0.85,
  min_confidence: 0.75,
  allow_high_severity_issues: false,
};

export const DEFAULT_SERVICE_CONFIG: SummaryServiceConfig = {
  max_chunks_per_field: 5,
  similarity_threshold: 0.7,
  extraction_timeout_ms: 30000, // 30 seconds
  parallel_extractions: true,
};

export const EXPORT_MIMETYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
