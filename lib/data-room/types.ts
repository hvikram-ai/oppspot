/**
 * Data Room Types
 * AI-Powered Due Diligence Platform
 */

// ============================================================================
// ENUMS
// ============================================================================

export type DealType =
  | 'acquisition'
  | 'investment'
  | 'partnership'
  | 'merger'
  | 'sale'
  | 'due_diligence'
  | 'other';

export type DataRoomStatus = 'active' | 'archived' | 'deleted';

export type DocumentType =
  | 'financial'
  | 'contract'
  | 'due_diligence'
  | 'legal'
  | 'hr'
  | 'other';

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type PermissionLevel = 'owner' | 'editor' | 'viewer' | 'commenter';

export type ActivityAction =
  | 'upload'
  | 'view'
  | 'download'
  | 'edit'
  | 'delete'
  | 'share'
  | 'revoke'
  | 'generate_report'
  | 'create_room'
  | 'archive_room'
  | 'delete_room';

export type AnnotationType = 'highlight' | 'comment' | 'sticky_note';

export type AnalysisType = 'classification' | 'financial' | 'contract' | 'risk';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface DataRoom {
  id: string;
  user_id: string;
  company_id: string | null;

  // Basic information
  name: string;
  description: string | null;
  deal_type: DealType;
  status: DataRoomStatus;

  // Storage metrics
  storage_used_bytes: number;
  document_count: number;

  // Metadata
  metadata: {
    deal_value?: number;
    currency?: string;
    target_close_date?: string;
    retention_days?: number;
    tags?: string[];
  };

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Document {
  id: string;
  data_room_id: string;

  // File information
  filename: string;
  folder_path: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;

  // Upload tracking
  uploaded_by: string;
  upload_completed: boolean;

  // AI classification
  document_type: DocumentType;
  confidence_score: number;
  processing_status: ProcessingStatus;

  // Extracted metadata
  metadata: DocumentMetadata;

  // Error handling
  error_message: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentMetadata {
  // Common fields
  dates?: string[];
  amounts?: {
    value: number;
    currency: string;
    context: string;
  }[];
  parties?: {
    name: string;
    type: 'person' | 'company';
    role?: string;
  }[];

  // Document-specific fields
  document_date?: string;
  fiscal_period?: string;
  contract_parties?: string[];
  contract_value?: number;
  effective_date?: string;
  expiration_date?: string;
}

export interface DocumentAnalysis {
  id: string;
  document_id: string;
  analysis_type: AnalysisType;

  // Analysis results
  findings: AnalysisFindings;

  // Quality metrics
  confidence: ConfidenceLevel;
  risks_identified: number;

  // Processing metadata
  processing_time_ms: number;
  ai_model: string;
  ai_tokens_used: number;

  // Timestamps
  created_at: string;
}

export type AnalysisFindings =
  | ClassificationFindings
  | FinancialFindings
  | ContractFindings
  | RiskFindings;

export interface ClassificationFindings {
  document_type: DocumentType;
  confidence_score: number;
  reasoning: string;
  alternative_types?: {
    type: DocumentType;
    confidence: number;
  }[];
}

export interface FinancialFindings {
  metrics: {
    revenue?: number;
    cogs?: number;
    gross_margin?: number;
    ebitda?: number;
    net_income?: number;
    cash_balance?: number;
    burn_rate?: number;
    runway_months?: number;
  };

  growth_rates: {
    revenue_yoy?: number;
    revenue_mom?: number;
  };

  anomalies: {
    type: 'missing_period' | 'unusual_spike' | 'unusual_drop' | 'negative_margin';
    severity: 'high' | 'medium' | 'low';
    description: string;
    period?: string;
    value?: number;
  }[];

  time_series: {
    period: string;
    revenue?: number;
    profit?: number;
    cash?: number;
  }[];
}

export interface ContractFindings {
  contract_type: ContractType;
  parties: string[];
  effective_date: string | null;
  expiration_date: string | null;
  renewal_terms: string | null;
  payment_terms: string | null;
  termination_clauses: string | null;

  high_risk_clauses: {
    clause_type: string;
    text: string;
    page_number: number;
    risk_level: 'high' | 'medium' | 'low';
    explanation: string;
  }[];

  missing_clauses: {
    clause_type: string;
    importance: 'critical' | 'recommended';
    recommendation: string;
  }[];

  obligations: {
    party: string;
    obligation: string;
    deadline?: string;
    recurring?: boolean;
  }[];

  unusual_terms: {
    term_type: string;
    description: string;
    context: string;
  }[];
}

export type ContractType =
  | 'customer_agreement'
  | 'vendor_contract'
  | 'employment_agreement'
  | 'nda'
  | 'partnership'
  | 'license'
  | 'other';

export interface RiskFindings {
  overall_risk_score: number;
  risk_categories: {
    category: 'financial' | 'legal' | 'operational' | 'compliance' | 'reputational';
    score: number;
    findings: string[];
  }[];

  top_risks: {
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    mitigation: string;
    source_document_id: string;
  }[];
}

export interface DataRoomAccess {
  id: string;
  data_room_id: string;
  user_id: string;

  // Permission level
  permission_level: PermissionLevel;

  // Invitation tracking
  invited_by: string;
  invite_token: string;
  invite_email: string;

  // Expiration
  expires_at: string;

  // Status
  accepted_at: string | null;
  revoked_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  data_room_id: string;
  document_id: string | null;

  // Actor information
  actor_id: string;
  actor_name: string;
  actor_email: string;

  // Action details
  action: ActivityAction;
  details: Record<string, unknown>;

  // Technical details
  ip_address: string;
  user_agent: string;

  // Timestamp
  created_at: string;
}

export interface DocumentAnnotation {
  id: string;
  document_id: string;
  user_id: string;

  // Annotation type
  annotation_type: AnnotationType;

  // Position
  page_number: number | null;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  // Content
  text: string;
  color: string;

  // Resolution tracking
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateDataRoomRequest {
  name: string;
  description?: string;
  company_id?: string;
  deal_type?: DealType;
  metadata?: DataRoom['metadata'];
}

export interface UpdateDataRoomRequest {
  name?: string;
  description?: string;
  deal_type?: DealType;
  status?: DataRoomStatus;
  metadata?: DataRoom['metadata'];
}

export interface UploadDocumentRequest {
  data_room_id: string;
  filename: string;
  folder_path?: string;
  file: File;
}

export interface ShareDataRoomRequest {
  data_room_id: string;
  email: string;
  permission_level: PermissionLevel;
  expires_in_days?: number;
}

export interface CreateAnnotationRequest {
  document_id: string;
  annotation_type: AnnotationType;
  page_number?: number;
  position?: DocumentAnnotation['position'];
  text: string;
  color?: string;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface DataRoomWithStats extends DataRoom {
  access_count: number;
  recent_activity: ActivityLog[];
  owner_name: string;
  my_permission: PermissionLevel | null;
}

export interface DocumentWithAnalysis extends Document {
  analysis: DocumentAnalysis[];
  annotation_count: number;
}

export interface DocumentListItem {
  id: string;
  filename: string;
  document_type: DocumentType;
  file_size_bytes: number;
  created_at: string;
  uploaded_by_name: string;
  processing_status: ProcessingStatus;
  confidence_score: number;
}

// ============================================================================
// WORKFLOW TYPES (Phase 3.9)
// ============================================================================

export type WorkflowType = 'approval' | 'review' | 'checklist' | 'custom';

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ChecklistItemStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'not_applicable';

export type ApprovalDecision = 'approved' | 'rejected' | 'needs_changes';

// Workflow Definition
export interface Workflow {
  id: string;
  data_room_id: string;

  // Basic info
  name: string;
  description: string | null;
  workflow_type: WorkflowType;
  status: WorkflowStatus;

  // Configuration
  config: {
    auto_start?: boolean;
    require_all_approvals?: boolean;
    allow_parallel_steps?: boolean;
    due_date?: string;
    reminder_days?: number[];
  };

  // Creator
  created_by: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Workflow Steps
export interface WorkflowStep {
  id: string;
  workflow_id: string;

  // Step info
  name: string;
  description: string | null;
  step_order: number;
  step_type: 'approval' | 'review' | 'task' | 'checklist' | 'notification';
  status: WorkflowStepStatus;

  // Assignees
  assigned_to: string[];

  // Dependencies
  depends_on_step_id: string | null;

  // Configuration
  config: {
    required_approvals?: number;
    allow_delegation?: boolean;
    auto_approve_timeout_hours?: number;
  };

  // Timestamps
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
}

// Tasks
export interface WorkflowTask {
  id: string;
  workflow_step_id: string;
  document_id: string | null;

  // Task info
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;

  // Assignment
  assigned_to: string;
  assigned_by: string;

  // Timestamps
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Document Review Checklist
export interface ReviewChecklist {
  id: string;
  data_room_id: string;
  workflow_id: string | null;

  // Checklist info
  name: string;
  description: string | null;
  checklist_type: DealType; // Uses same deal types

  // Progress
  total_items: number;
  completed_items: number;

  // Created by
  created_by: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Checklist Items
export interface ChecklistItem {
  id: string;
  checklist_id: string;

  // Item info
  category: string; // e.g., "Financial", "Legal", "HR"
  item_name: string;
  description: string | null;
  status: ChecklistItemStatus;

  // Optional document link
  document_id: string | null;

  // Assignment
  assigned_to: string | null;

  // Notes
  notes: string | null;

  // Timestamps
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Approval Request
export interface ApprovalRequest {
  id: string;
  workflow_step_id: string;
  document_id: string | null;

  // Request info
  title: string;
  description: string | null;

  // Approver
  requested_from: string;
  requested_by: string;

  // Decision
  decision: ApprovalDecision | null;
  decision_notes: string | null;
  decided_at: string | null;

  // Timestamps
  created_at: string;
  expires_at: string | null;
}

// Workflow Template (Pre-defined workflows)
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflow_type: WorkflowType;
  deal_types: DealType[]; // Which deal types this template applies to
  steps: {
    name: string;
    step_type: string;
    step_order: number;
    description: string;
    config: Record<string, unknown>;
  }[];
  created_at: string;
}

// Checklist Template
export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  deal_type: DealType;
  categories: {
    name: string;
    items: {
      name: string;
      description: string;
      required: boolean;
    }[];
  }[];
  created_at: string;
}

// ============================================================================
// WORKFLOW API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateWorkflowRequest {
  data_room_id: string;
  name: string;
  description?: string;
  workflow_type: WorkflowType;
  template_id?: string;
  config?: Workflow['config'];
}

export interface CreateChecklistRequest {
  data_room_id: string;
  name: string;
  description?: string;
  checklist_type: DealType;
  template_id?: string;
}

export interface CreateTaskRequest {
  workflow_step_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  priority?: TaskPriority;
  due_date?: string;
  document_id?: string;
}

export interface CreateApprovalRequest {
  workflow_step_id: string;
  title: string;
  description?: string;
  requested_from: string;
  document_id?: string;
  expires_at?: string;
}

export interface UpdateChecklistItemRequest {
  status: ChecklistItemStatus;
  document_id?: string;
  notes?: string;
  assigned_to?: string;
}

export interface UpdateApprovalRequest {
  decision: ApprovalDecision;
  decision_notes?: string;
}

// ============================================================================
// WORKFLOW UI TYPES
// ============================================================================

export interface WorkflowWithProgress extends Workflow {
  total_steps: number;
  completed_steps: number;
  pending_approvals: number;
  overdue_tasks: number;
}

export interface ChecklistWithItems extends ReviewChecklist {
  items: ChecklistItem[];
  categories: {
    name: string;
    items: ChecklistItem[];
    completed: number;
    total: number;
  }[];
}

// ============================================================================
// HYPOTHESIS TRACKING TYPES (Deal Hypothesis Tracker Feature)
// ============================================================================

export type HypothesisType =
  | 'revenue_growth'
  | 'cost_synergy'
  | 'market_expansion'
  | 'tech_advantage'
  | 'team_quality'
  | 'competitive_position'
  | 'operational_efficiency'
  | 'customer_acquisition'
  | 'custom';

export type HypothesisStatus =
  | 'draft'
  | 'active'
  | 'validated'
  | 'invalidated'
  | 'needs_revision';

export type EvidenceType = 'supporting' | 'contradicting' | 'neutral';

export type MetricStatus = 'not_tested' | 'testing' | 'met' | 'not_met' | 'partially_met';

export type ValidationStatus = 'pass' | 'fail' | 'inconclusive';

// Hypothesis
export interface Hypothesis {
  id: string;
  data_room_id: string;
  created_by: string;

  // Content
  title: string;
  description: string;
  hypothesis_type: HypothesisType;

  // Status and confidence
  status: HypothesisStatus;
  confidence_score: number | null; // 0-100

  // Statistics (denormalized)
  evidence_count: number;
  supporting_evidence_count: number;
  contradicting_evidence_count: number;
  metrics_count: number;
  metrics_met_count: number;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_analyzed_at: string | null;
  deleted_at: string | null;
}

// Evidence linking documents to hypotheses
export interface HypothesisEvidence {
  id: string;
  hypothesis_id: string;
  document_id: string;

  // Classification
  evidence_type: EvidenceType;
  relevance_score: number | null; // 0-100

  // Content
  excerpt_text: string | null;
  page_number: number | null;
  chunk_id: string | null; // References document_chunks from Q&A

  // AI analysis
  ai_reasoning: string | null;
  ai_model: string | null;
  ai_confidence: number | null; // 0-1

  // Manual annotations
  manual_note: string | null;
  manually_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Quantitative metrics for hypothesis validation
export interface HypothesisMetric {
  id: string;
  hypothesis_id: string;

  // Metric definition
  metric_name: string;
  description: string | null;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null; // e.g., "USD", "%", "users"

  // Status
  status: MetricStatus;

  // Source tracking
  source_document_id: string | null;
  source_excerpt: string | null;
  source_page_number: number | null;

  // Metadata
  metadata: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Manual validation records
export interface HypothesisValidation {
  id: string;
  hypothesis_id: string;
  validated_by: string;

  // Outcome
  validation_status: ValidationStatus;

  // Details
  notes: string | null;
  confidence_adjustment: number | null; // -100 to +100

  // Supporting data
  evidence_summary: string | null;
  key_findings: string[];

  // Timestamp
  created_at: string;
}

// ============================================================================
// HYPOTHESIS API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateHypothesisRequest {
  data_room_id: string;
  title: string;
  description: string;
  hypothesis_type: HypothesisType;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateHypothesisRequest {
  title?: string;
  description?: string;
  hypothesis_type?: HypothesisType;
  status?: HypothesisStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface LinkEvidenceRequest {
  hypothesis_id: string;
  document_id: string;
  evidence_type: EvidenceType;
  excerpt_text?: string;
  page_number?: number;
  manual_note?: string;
}

export interface CreateMetricRequest {
  hypothesis_id: string;
  metric_name: string;
  description?: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
  source_document_id?: string;
}

export interface UpdateMetricRequest {
  metric_name?: string;
  description?: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
  status?: MetricStatus;
  source_document_id?: string;
}

export interface CreateValidationRequest {
  hypothesis_id: string;
  validation_status: ValidationStatus;
  notes?: string;
  confidence_adjustment?: number;
  evidence_summary?: string;
  key_findings?: string[];
}

export interface AnalyzeDocumentsRequest {
  hypothesis_id: string;
  document_ids?: string[]; // If empty, analyze all documents
}

// ============================================================================
// HYPOTHESIS UI TYPES
// ============================================================================

export interface HypothesisWithDetails extends Hypothesis {
  // Related entities
  evidence: HypothesisEvidence[];
  metrics: HypothesisMetric[];
  validations: HypothesisValidation[];

  // Creator info
  creator_name: string;
  creator_email: string;

  // Derived stats
  avg_relevance_score: number | null;
  metrics_completion_rate: number; // 0-100
}

export interface EvidenceWithDocument extends HypothesisEvidence {
  // Document info
  document_filename: string;
  document_type: DocumentType;
  document_storage_path: string;
}

export interface HypothesisListItem {
  id: string;
  title: string;
  hypothesis_type: HypothesisType;
  status: HypothesisStatus;
  confidence_score: number | null;
  evidence_count: number;
  supporting_evidence_count: number;
  contradicting_evidence_count: number;
  metrics_met_count: number;
  metrics_count: number;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

export interface HypothesisSummary {
  total_hypotheses: number;
  active_hypotheses: number;
  validated_hypotheses: number;
  invalidated_hypotheses: number;
  avg_confidence_score: number;
  total_evidence: number;
  recent_validations: HypothesisValidation[];
}
