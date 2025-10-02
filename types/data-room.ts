/**
 * TypeScript types for Data Room feature
 * Generated from database schema
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
// DATABASE ENTITIES
// ============================================================================

export interface DataRoom {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  deal_type: DealType;
  status: DataRoomStatus;
  storage_used_bytes: number;
  document_count: number;
  metadata: DataRoomMetadata;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DataRoomMetadata {
  deal_value?: number;
  currency?: string;
  target_close_date?: string;
  retention_days?: number;
  tags?: string[];
}

export interface Document {
  id: string;
  data_room_id: string;
  filename: string;
  folder_path: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  upload_completed: boolean;
  document_type: DocumentType;
  confidence_score: number | null;
  processing_status: ProcessingStatus;
  metadata: DocumentMetadata;
  error_message: string | null;
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
  findings: AnalysisFindings;
  confidence: ConfidenceLevel;
  risks_identified: number;
  processing_time_ms: number | null;
  ai_model: string | null;
  ai_tokens_used: number | null;
  created_at: string;
}

// Analysis findings types
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
  permission_level: PermissionLevel;
  invited_by: string;
  invite_token: string | null;
  invite_email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  data_room_id: string;
  document_id: string | null;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: ActivityAction;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DocumentAnnotation {
  id: string;
  document_id: string;
  user_id: string;
  annotation_type: AnnotationType;
  page_number: number | null;
  position: AnnotationPosition | null;
  text: string;
  color: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AnnotationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface CreateDataRoomInput {
  name: string;
  company_id?: string;
  deal_type?: DealType;
  description?: string;
  metadata?: Partial<DataRoomMetadata>;
}

export interface UpdateDataRoomInput {
  name?: string;
  description?: string;
  deal_type?: DealType;
  status?: DataRoomStatus;
  metadata?: Partial<DataRoomMetadata>;
}

export interface CreateDocumentInput {
  data_room_id: string;
  filename: string;
  folder_path?: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path?: string;
}

export interface UpdateDocumentInput {
  filename?: string;
  folder_path?: string;
  document_type?: DocumentType;
  confidence_score?: number;
  processing_status?: ProcessingStatus;
  metadata?: Partial<DocumentMetadata>;
  storage_path?: string;
  upload_completed?: boolean;
  error_message?: string;
}

export interface CreateAccessInput {
  data_room_id: string;
  user_id?: string;
  invite_email: string;
  permission_level: PermissionLevel;
}

export interface CreateAnnotationInput {
  document_id: string;
  annotation_type: AnnotationType;
  text: string;
  page_number?: number;
  position?: AnnotationPosition;
  color?: string;
}

export interface LogActivityInput {
  data_room_id: string;
  document_id?: string;
  action: ActivityAction;
  details?: Record<string, any>;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface DataRoomWithStats extends DataRoom {
  recent_activity_count?: number;
  unread_documents_count?: number;
  ai_analysis_complete?: boolean;
}

export interface DocumentWithAnalysis extends Document {
  analysis?: DocumentAnalysis[];
  annotation_count?: number;
}

export interface DataRoomMember {
  id: string;
  name: string;
  email: string;
  permission_level: PermissionLevel;
  accepted_at: string | null;
  invited_at: string;
  invited_by_name: string;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface DataRoomFilter {
  status?: DataRoomStatus | 'all';
  deal_type?: DealType | 'all';
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_order?: 'asc' | 'desc';
}

export interface DocumentFilter {
  document_type?: DocumentType | 'all';
  processing_status?: ProcessingStatus | 'all';
  folder_path?: string;
  search?: string;
  sort_by?: 'created_at' | 'filename' | 'file_size_bytes';
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_STORAGE_PER_ROOM_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/csv',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/markdown',
] as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  financial: 'Financial',
  contract: 'Contract',
  due_diligence: 'Due Diligence',
  legal: 'Legal',
  hr: 'HR',
  other: 'Other',
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
  commenter: 'Commenter',
};

export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  owner: 'Full access, can delete data room and manage permissions',
  editor: 'Can upload, annotate, and generate reports',
  viewer: 'Read-only access, can download with watermark',
  commenter: 'Can add comments and questions, cannot download',
};
