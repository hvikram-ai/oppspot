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

// ============================================================================
// TECH STACK ANALYSIS
// ============================================================================

export type TechRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TechAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type TechCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'infrastructure'
  | 'devops'
  | 'ml_ai'
  | 'security'
  | 'testing'
  | 'monitoring'
  | 'other';
export type TechAuthenticity =
  | 'proprietary'
  | 'wrapper'
  | 'hybrid'
  | 'third_party'
  | 'unknown';
export type TechFindingType =
  | 'red_flag'
  | 'risk'
  | 'opportunity'
  | 'strength'
  | 'recommendation';
export type TechFindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// ----------------------------------------------------------------------------
// Database Types (matching migration schema)
// ----------------------------------------------------------------------------

export interface TechStackAnalysis {
  id: string;
  data_room_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: TechAnalysisStatus;
  technologies_identified: number;
  risk_level: TechRiskLevel | null;
  modernization_score: number | null;
  ai_authenticity_score: number | null;
  technical_debt_score: number | null;
  frontend_count: number;
  backend_count: number;
  database_count: number;
  infrastructure_count: number;
  ai_ml_count: number;
  ai_model: string | null;
  analysis_time_ms: number | null;
  documents_analyzed: number;
  error_message: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_analyzed_at: string | null;
  deleted_at: string | null;
}

export interface TechStackTechnology {
  id: string;
  analysis_id: string;
  name: string;
  category: TechCategory;
  version: string | null;
  authenticity: TechAuthenticity | null;
  confidence_score: number;
  risk_score: number | null;
  is_outdated: boolean;
  is_deprecated: boolean;
  source_document_id: string | null;
  source_page_number: number | null;
  excerpt_text: string | null;
  chunk_id: string | null;
  ai_reasoning: string | null;
  ai_confidence: number | null;
  license_type: string | null;
  has_security_issues: boolean;
  security_details: string | null;
  manual_note: string | null;
  manually_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechStackFinding {
  id: string;
  analysis_id: string;
  finding_type: TechFindingType;
  severity: TechFindingSeverity;
  title: string;
  description: string;
  technology_ids: string[];
  impact_score: number | null;
  recommendation: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  source_document_id: string | null;
  source_page_number: number | null;
  excerpt_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TechStackComparison {
  id: string;
  analysis_id: string;
  compared_with_analysis_id: string;
  comparison_summary: string;
  shared_technologies: number;
  unique_technologies: number;
  risk_delta: number | null;
  modernization_delta: number | null;
  key_differences: string[];
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// API Request/Response Types
// ----------------------------------------------------------------------------

export interface CreateTechStackAnalysisRequest {
  data_room_id: string;
  title: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTechStackAnalysisRequest {
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TriggerTechStackAnalysisRequest {
  document_ids?: string[]; // If omitted, analyze all documents
  force_reanalysis?: boolean; // Re-analyze even if already analyzed
}

export interface TechStackAnalysisFilter {
  data_room_id: string;
  status?: TechAnalysisStatus;
  risk_level?: TechRiskLevel;
  modernization_score_min?: number;
  modernization_score_max?: number;
  ai_authenticity_score_min?: number;
  ai_authenticity_score_max?: number;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TechStackTechnologyFilter {
  analysis_id: string;
  category?: TechCategory;
  authenticity?: TechAuthenticity;
  risk_score_min?: number;
  risk_score_max?: number;
  is_outdated?: boolean;
  is_deprecated?: boolean;
  has_security_issues?: boolean;
  manually_verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TechStackFindingFilter {
  analysis_id: string;
  finding_type?: TechFindingType;
  severity?: TechFindingSeverity;
  is_resolved?: boolean;
  limit?: number;
  offset?: number;
}

export interface AddTechnologyManuallyRequest {
  analysis_id: string;
  name: string;
  category: TechCategory;
  version?: string;
  authenticity?: TechAuthenticity;
  confidence_score: number;
  risk_score?: number;
  license_type?: string;
  manual_note?: string;
}

export interface UpdateTechnologyRequest {
  version?: string;
  authenticity?: TechAuthenticity;
  risk_score?: number;
  license_type?: string;
  has_security_issues?: boolean;
  security_details?: string;
  manual_note?: string;
  manually_verified?: boolean;
}

export interface VerifyTechnologyRequest {
  verified: boolean;
  notes?: string;
}

export interface CreateFindingRequest {
  analysis_id: string;
  finding_type: TechFindingType;
  severity: TechFindingSeverity;
  title: string;
  description: string;
  technology_ids?: string[];
  impact_score?: number;
  recommendation?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolveFindingRequest {
  resolution_notes: string;
}

// ----------------------------------------------------------------------------
// Enriched Response Types
// ----------------------------------------------------------------------------

export interface TechStackAnalysisWithDetails extends TechStackAnalysis {
  // Creator info
  creator_name: string;
  creator_email: string;

  // Technology breakdown
  technologies: TechStackTechnology[];

  // Findings summary
  critical_findings_count: number;
  high_findings_count: number;
  medium_findings_count: number;
  low_findings_count: number;
  resolved_findings_count: number;
  total_findings_count: number;

  // Category breakdown
  technologies_by_category: {
    category: TechCategory;
    count: number;
    avg_risk_score: number;
  }[];

  // Authenticity breakdown (for AI/ML)
  ai_breakdown?: {
    proprietary: number;
    wrapper: number;
    hybrid: number;
    third_party: number;
    unknown: number;
  };
}

export interface TechStackAnalysisListItem {
  id: string;
  title: string;
  status: TechAnalysisStatus;
  risk_level: TechRiskLevel | null;
  technologies_identified: number;
  modernization_score: number | null;
  ai_authenticity_score: number | null;
  technical_debt_score: number | null;
  critical_findings_count: number;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  last_analyzed_at: string | null;
}

export interface TechStackTechnologyWithSource extends TechStackTechnology {
  // Document source info
  document_filename: string | null;
  document_type: DocumentType | null;
  document_storage_path: string | null;
}

export interface TechStackFindingWithTechnologies extends TechStackFinding {
  // Related technologies
  technologies: {
    id: string;
    name: string;
    category: TechCategory;
    version: string | null;
  }[];
}

export interface TechStackSummary {
  total_analyses: number;
  completed_analyses: number;
  analyzing_count: number;
  failed_count: number;
  avg_modernization_score: number;
  avg_ai_authenticity_score: number;
  avg_technical_debt_score: number;
  total_technologies: number;
  total_critical_findings: number;
  total_high_findings: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recent_analyses: TechStackAnalysisListItem[];
}

export interface TechStackAnalysisProgress {
  analysis_id: string;
  status: TechAnalysisStatus;
  documents_total: number;
  documents_analyzed: number;
  technologies_found: number;
  current_document: string | null;
  started_at: string;
  estimated_completion: string | null;
  error_message: string | null;
}

// ============================================================================
// INTEGRATION PLAYBOOK GENERATOR
// ============================================================================

// Core Enums
export type PlaybookStatus = 'draft' | 'active' | 'completed' | 'archived';
export type PlaybookGenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type DealType = 'acquisition' | 'merger' | 'investment' | 'partnership' | 'joint_venture';
export type PhaseType = 'day_1_30' | 'day_31_60' | 'day_61_100' | 'post_100';
export type ActivityStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'at_risk';
export type ActivityPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActivityCategory = 'planning' | 'execution' | 'monitoring' | 'communication' | 'approval';
export type ResponsibleParty = 'buyer' | 'seller' | 'joint';
export type SynergyType = 'cost' | 'revenue';
export type SynergyCategory =
  | 'headcount'
  | 'facilities'
  | 'procurement'
  | 'IT'
  | 'cross_sell'
  | 'upsell'
  | 'pricing'
  | 'market_expansion'
  | 'other';
export type SynergyStatus = 'planned' | 'in_progress' | 'realized' | 'at_risk' | 'failed';
export type RiskImpact = 'low' | 'medium' | 'high' | 'critical';
export type RiskProbability = 'low' | 'medium' | 'high';
export type RiskStatus = 'open' | 'mitigating' | 'closed' | 'realized';
export type KPICategory = 'financial' | 'customer' | 'employee' | 'operational' | 'synergy';
export type KPIStatus = 'on_track' | 'at_risk' | 'off_track';

// Integration Playbook (Main Entity)
export interface IntegrationPlaybook {
  id: string;
  data_room_id: string;
  created_by: string;

  // Metadata
  playbook_name: string;
  deal_type: DealType;
  deal_rationale?: string;
  integration_objectives?: string[];
  success_metrics?: Record<string, unknown>;

  // Status
  status: PlaybookStatus;
  generation_status: PlaybookGenerationStatus;

  // Aggregate metrics (auto-calculated)
  total_phases: number;
  total_workstreams: number;
  total_activities: number;
  completed_activities: number;
  total_synergies: number;
  realized_synergies: number;
  total_risks: number;
  high_risk_count: number;

  // AI metadata
  ai_model?: string;
  generation_time_ms?: number;
  confidence_score?: number;
  error_message?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  target_close_date?: string;
  actual_close_date?: string;
  deleted_at?: string;
}

// Integration Phase
export interface IntegrationPhase {
  id: string;
  playbook_id: string;

  phase_name: string;
  phase_type: PhaseType;
  phase_order: number;
  phase_description?: string;

  // Objectives
  objectives?: string[];
  success_criteria?: string[];
  key_milestones?: string[];

  // Dates
  start_date?: string;
  end_date?: string;
  duration_days?: number;

  // Progress (auto-calculated)
  total_activities: number;
  completed_activities: number;
  status: ActivityStatus;

  created_at: string;
}

// Integration Workstream
export interface IntegrationWorkstream {
  id: string;
  playbook_id: string;

  workstream_name: string;
  workstream_description?: string;
  workstream_lead?: string;

  // Objectives
  objectives?: string[];
  key_deliverables?: string[];

  // Progress (auto-calculated)
  total_activities: number;
  completed_activities: number;
  status: ActivityStatus;

  // Budget
  budget_allocated?: number;
  budget_spent?: number;

  created_at: string;
}

// Integration Activity
export interface IntegrationActivity {
  id: string;
  playbook_id: string;
  phase_id?: string;
  workstream_id?: string;

  // Activity details
  activity_name: string;
  description?: string;
  category: ActivityCategory;

  // Ownership
  owner_id?: string;
  responsible_party: ResponsibleParty;

  // Scheduling
  target_start_date?: string;
  target_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  duration_days?: number;

  // Dependencies
  depends_on?: string[];
  blocks_activity_ids?: string[];
  critical_path: boolean;

  // Priority and status
  priority: ActivityPriority;
  status: ActivityStatus;
  completion_percentage: number;

  // Deliverables
  deliverables?: string[];
  deliverable_document_ids?: string[];

  // Risks
  risk_level?: RiskImpact;
  risk_description?: string;
  mitigation_plan?: string;

  // Notes
  notes?: string;
  blockers?: string;

  created_at: string;
  updated_at: string;
}

// Day 1 Checklist Item
export interface IntegrationDay1ChecklistItem {
  id: string;
  playbook_id: string;

  checklist_item: string;
  category: string;
  item_order?: number;
  item_description?: string;

  // Ownership
  responsible_party: ResponsibleParty;
  owner_id?: string;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
  completed_at?: string;
  completed_by?: string;

  // Evidence
  evidence_document_id?: string;
  notes?: string;

  // Importance
  is_critical: boolean;

  created_at: string;
}

// Integration Synergy
export interface IntegrationSynergy {
  id: string;
  playbook_id: string;

  synergy_type: SynergyType;
  category: SynergyCategory;

  // Description
  synergy_name: string;
  description?: string;

  // Financial projections
  year_1_target?: number;
  year_2_target?: number;
  year_3_target?: number;
  total_target?: number;

  // Realization
  year_1_actual: number;
  year_2_actual: number;
  year_3_actual: number;
  total_actual: number;

  // Implementation
  implementation_cost?: number;
  implementation_timeline_days?: number;
  probability_of_realization?: number;
  risk_adjusted_value?: number;

  // Ownership
  owner_id?: string;
  workstream_id?: string;

  // Status
  status: SynergyStatus;

  // Tracking
  last_measured_date?: string;
  measurement_frequency?: string;

  // Source
  source_hypothesis_id?: string;

  created_at: string;
  updated_at: string;
}

// Integration Risk
export interface IntegrationRisk {
  id: string;
  playbook_id: string;

  risk_name: string;
  risk_description: string;
  risk_category: string;

  // Impact and probability
  impact: RiskImpact;
  probability: RiskProbability;
  risk_score?: number;

  // Mitigation
  mitigation_plan?: string;
  mitigation_owner?: string;
  contingency_plan?: string;

  // Status
  status: RiskStatus;
  realized_at?: string;
  realized_impact?: string;

  // Monitoring
  review_frequency?: string;
  last_reviewed_date?: string;
  next_review_date?: string;

  created_at: string;
  updated_at: string;
}

// Integration KPI
export interface IntegrationKPI {
  id: string;
  playbook_id: string;

  kpi_name: string;
  kpi_category: KPICategory;
  kpi_description?: string;

  // Measurement
  unit?: string;
  target_value?: number;
  current_value?: number;
  baseline_value?: number;

  // Trend
  trend?: string;
  variance_percentage?: number;

  // Ownership
  owner_id?: string;

  // Status
  status?: KPIStatus;

  // Measurement
  measurement_frequency?: string;
  last_measured_date?: string;

  created_at: string;
  updated_at: string;
}

// Extended Playbook with Details
export interface IntegrationPlaybookWithDetails extends IntegrationPlaybook {
  phases: IntegrationPhase[];
  workstreams: IntegrationWorkstream[];
  activities: IntegrationActivity[];
  day1_checklist: IntegrationDay1ChecklistItem[];
  synergies: IntegrationSynergy[];
  risks: IntegrationRisk[];
  kpis: IntegrationKPI[];
  creator_name?: string;
  creator_email?: string;
  data_room_name?: string;
}

// Request/Response Types

export interface CreatePlaybookRequest {
  data_room_id: string;
  playbook_name: string;
  deal_type: DealType;
  deal_rationale?: string;
  integration_objectives?: string[];
  target_close_date?: string;
}

export interface GeneratePlaybookRequest {
  use_tech_stack_analysis?: boolean;
  use_deal_hypotheses?: boolean;
  template_id?: string;
  custom_objectives?: string[];
}

export interface UpdateActivityRequest {
  activity_name?: string;
  description?: string;
  owner_id?: string;
  status?: ActivityStatus;
  completion_percentage?: number;
  actual_start_date?: string;
  actual_end_date?: string;
  notes?: string;
  blockers?: string;
}

export interface UpdateSynergyRequest {
  year_1_actual?: number;
  year_2_actual?: number;
  year_3_actual?: number;
  status?: SynergyStatus;
  last_measured_date?: string;
  notes?: string;
}

export interface UpdateRiskRequest {
  status?: RiskStatus;
  mitigation_plan?: string;
  realized_at?: string;
  realized_impact?: string;
  last_reviewed_date?: string;
  next_review_date?: string;
}

export interface PlaybookGenerationContext {
  data_room_id: string;
  deal_info: {
    deal_type: DealType;
    target_company_name?: string;
    industry?: string;
    deal_size?: number;
  };
  tech_stack_findings?: {
    technologies: TechStackTechnology[];
    integration_complexity?: string;
    risks: TechStackFindingWithTechnologies[];
  };
  deal_hypotheses?: {
    cost_synergies: unknown[];
    revenue_synergies: unknown[];
    risks: unknown[];
  };
  user_inputs?: {
    objectives?: string[];
    priorities?: string[];
  };
}

export interface PlaybookGenerationResult {
  playbook: IntegrationPlaybook;
  phases: IntegrationPhase[];
  workstreams: IntegrationWorkstream[];
  activities: IntegrationActivity[];
  day1_checklist: IntegrationDay1ChecklistItem[];
  synergies: IntegrationSynergy[];
  risks: IntegrationRisk[];
  kpis: IntegrationKPI[];
  generation_time_ms: number;
  confidence_score: number;
}

export interface PlaybookTemplate {
  id: string;
  template_name: string;
  deal_type: DealType;
  industry?: string;
  phases: Partial<IntegrationPhase>[];
  workstreams: Partial<IntegrationWorkstream>[];
  activities: Partial<IntegrationActivity>[];
  day1_checklist: Partial<IntegrationDay1ChecklistItem>[];
  typical_synergies: Partial<IntegrationSynergy>[];
  typical_risks: Partial<IntegrationRisk>[];
  typical_kpis: Partial<IntegrationKPI>[];
}
