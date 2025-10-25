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
