/**
 * Database Type Definitions for oppSpot
 * Generated from Supabase schema analysis
 *
 * This file provides comprehensive TypeScript types for all database tables,
 * enums, and relationships in the oppSpot application.
 */

// ============================================
// ENUM TYPES
// ============================================

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'partial' | 'failed';
export type SectionType = 'snapshot' | 'buying_signals' | 'decision_makers' | 'revenue_signals' | 'recommended_approach' | 'sources';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type SourceType = 'companies_house' | 'press_release' | 'news_article' | 'company_website' | 'job_posting' | 'linkedin' | 'financial_filing' | 'industry_report' | 'social_media';
export type DealType = 'acquisition' | 'investment' | 'partnership' | 'merger' | 'sale' | 'due_diligence' | 'other';
export type DataRoomStatus = 'active' | 'archived' | 'deleted';
export type DocumentType = 'financial' | 'contract' | 'due_diligence' | 'legal' | 'hr' | 'other';
export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type PermissionLevel = 'owner' | 'editor' | 'viewer' | 'commenter';
export type ActivityAction = 'upload' | 'view' | 'download' | 'edit' | 'delete' | 'share' | 'revoke' | 'generate_report' | 'create_room' | 'archive_room' | 'delete_room';
export type AnnotationType = 'highlight' | 'comment' | 'sticky_note';
export type AnalysisType = 'classification' | 'financial' | 'contract' | 'risk';
export type HypothesisType = 'revenue_growth' | 'cost_synergy' | 'market_expansion' | 'tech_advantage' | 'team_quality' | 'competitive_position' | 'operational_efficiency' | 'customer_acquisition' | 'custom';
export type HypothesisStatus = 'draft' | 'active' | 'validated' | 'invalidated' | 'needs_revision';
export type EvidenceType = 'supporting' | 'contradicting' | 'neutral';
export type MetricStatus = 'not_tested' | 'testing' | 'met' | 'not_met' | 'partially_met';
export type ValidationStatus = 'pass' | 'fail' | 'inconclusive';
export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'data_quality' | 'integration' | 'performance' | 'documentation' | 'other';
export type FeedbackStatus = 'pending' | 'in_review' | 'in_progress' | 'resolved' | 'declined' | 'duplicate';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type AnswerType = 'grounded' | 'insufficient_evidence' | 'error';
export type FeedbackRating = 'helpful' | 'not_helpful';
export type CitationFormat = 'inline' | 'footnote';

// Tech Stack Analysis Types
export type TechRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TechAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type TechCategory = 'frontend' | 'backend' | 'database' | 'infrastructure' | 'devops' | 'ml_ai' | 'security' | 'testing' | 'monitoring' | 'other';
export type TechAuthenticity = 'proprietary' | 'wrapper' | 'hybrid' | 'third_party' | 'unknown';
export type TechFindingType = 'red_flag' | 'risk' | 'opportunity' | 'strength' | 'recommendation';
export type TechFindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// ============================================
// CORE TABLES
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  preferences: Record<string, unknown>;
  streak_count: number;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  org_id: string | null;
  name: string;
  registration_number: string | null;
  sector: string | null;
  website: string | null;
  description: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  founded_date: string | null;
  address: {
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
  } | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// RESEARCH GPT TABLES
// ============================================

export interface ResearchReport {
  id: string;
  user_id: string;
  company_id: string;
  company_name: string;
  company_number: string | null;
  status: ReportStatus;
  confidence_score: number | null;
  sections_complete: number;
  total_sources: number;
  generated_at: string | null;
  cached_until: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ResearchSection {
  id: string;
  report_id: string;
  section_type: SectionType;
  content: Record<string, unknown>;
  confidence: ConfidenceLevel;
  sources_count: number;
  cached_at: string;
  expires_at: string;
  generation_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchSource {
  id: string;
  report_id: string;
  section_type: SectionType | null;
  url: string;
  title: string;
  published_date: string | null;
  accessed_date: string;
  source_type: SourceType;
  reliability_score: number | null;
  domain: string | null;
  content_snippet: string | null;
  created_at: string;
}

export interface UserResearchQuota {
  user_id: string;
  period_start: string;
  period_end: string;
  researches_used: number;
  researches_limit: number;
  tier: string;
  notification_90_percent_sent: boolean;
  notification_100_percent_sent: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// DATA ROOM TABLES
// ============================================

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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  metadata: Record<string, unknown>;
  error_message: string | null;
  ocr_attempted: boolean;
  chunk_count: number;
  avg_chunk_size: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentAnalysis {
  id: string;
  document_id: string;
  analysis_type: AnalysisType;
  findings: Record<string, unknown>;
  confidence: ConfidenceLevel;
  risks_identified: number;
  processing_time_ms: number | null;
  ai_model: string | null;
  ai_tokens_used: number | null;
  created_at: string;
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
  details: Record<string, unknown>;
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
  position: {
    x: number;
    y: number;
  } | null;
  text: string;
  color: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// DATA ROOM Q&A TABLES
// ============================================

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  text_content: string | null;
  ocr_confidence: number | null;
  layout_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  page_id: string;
  chunk_index: number;
  text_content: string;
  token_count: number;
  start_char: number;
  end_char: number;
  embedding: number[] | null;
  embedding_model: string;
  created_at: string;
}

export interface QAQuery {
  id: string;
  user_id: string;
  data_room_id: string;
  question: string;
  answer: string | null;
  answer_type: AnswerType | null;
  model_used: string | null;
  retrieval_time_ms: number | null;
  llm_time_ms: number | null;
  total_time_ms: number | null;
  chunks_retrieved: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  error_type: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface QACitation {
  id: string;
  query_id: string;
  chunk_id: string;
  document_id: string;
  page_number: number;
  relevance_score: number;
  rank: number;
  text_preview: string;
  citation_format: CitationFormat;
  created_at: string;
}

export interface QAFeedback {
  id: string;
  query_id: string;
  user_id: string;
  rating: FeedbackRating;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface QARateLimit {
  id: string;
  user_id: string;
  data_room_id: string;
  window_start: string;
  query_count: number;
  last_query_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// DEAL HYPOTHESIS TRACKER TABLES
// ============================================

export interface Hypothesis {
  id: string;
  data_room_id: string;
  created_by: string;
  title: string;
  description: string;
  hypothesis_type: HypothesisType;
  status: HypothesisStatus;
  confidence_score: number | null;
  evidence_count: number;
  supporting_evidence_count: number;
  contradicting_evidence_count: number;
  metrics_count: number;
  metrics_met_count: number;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_analyzed_at: string | null;
  deleted_at: string | null;
}

export interface HypothesisEvidence {
  id: string;
  hypothesis_id: string;
  document_id: string;
  evidence_type: EvidenceType;
  relevance_score: number | null;
  excerpt_text: string | null;
  page_number: number | null;
  chunk_id: string | null;
  ai_reasoning: string | null;
  ai_model: string | null;
  ai_confidence: number | null;
  manual_note: string | null;
  manually_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HypothesisMetric {
  id: string;
  hypothesis_id: string;
  metric_name: string;
  description: string | null;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  status: MetricStatus;
  source_document_id: string | null;
  source_excerpt: string | null;
  source_page_number: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HypothesisValidation {
  id: string;
  hypothesis_id: string;
  validated_by: string;
  validation_status: ValidationStatus;
  notes: string | null;
  confidence_adjustment: number | null;
  evidence_summary: string | null;
  key_findings: string[] | null;
  created_at: string;
}

// ============================================
// COMPETITIVE INTELLIGENCE TABLES
// ============================================

export interface CompetitorCompany {
  id: string;
  name: string;
  website: string | null;
  business_id: string | null;
  industry: string | null;
  company_size_band: string | null;
  headquarters_location: string | null;
  founded_year: number | null;
  employee_count_estimate: number | null;
  revenue_estimate: number | null;
  funding_total: number | null;
  primary_product: string | null;
  product_description: string | null;
  target_customer_segment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitiveAnalysis {
  id: string;
  created_by: string;
  organization_id: string | null;
  target_company_id: string | null;
  target_company_name: string;
  target_company_website: string | null;
  title: string;
  description: string | null;
  market_segment: string | null;
  geography: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  deal_status: 'active' | 'closed_acquired' | 'closed_passed' | 'abandoned';
  created_at: string;
  updated_at: string;
  last_viewed_at: string | null;
  last_refreshed_at: string | null;
  archived_at: string | null;
  auto_archive_at: string | null;
  competitor_count: number;
  avg_feature_parity_score: number | null;
  overall_moat_score: number | null;
  deleted_at: string | null;
}

export interface FeatureMatrixEntry {
  id: string;
  analysis_id: string;
  feature_name: string;
  feature_description: string | null;
  feature_category: 'core' | 'integrations' | 'enterprise' | 'mobile' | 'analytics' | 'security' | 'other';
  category_weight: number;
  possessed_by: Record<string, boolean>;
  source_type: string | null;
  source_citation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureParityScore {
  id: string;
  analysis_id: string;
  competitor_id: string;
  parity_score: number;
  overlap_score: number | null;
  differentiation_score: number | null;
  calculation_method: string;
  confidence_level: ConfidenceLevel | null;
  last_calculated_at: string;
  feature_counts: Record<string, unknown> | null;
}

// ============================================
// FEEDBACK SYSTEM TABLES
// ============================================

export interface Feedback {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  votes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  admin_response: string | null;
  admin_response_by: string | null;
  admin_response_at: string | null;
  is_public: boolean;
  is_pinned: boolean;
  tags: string[] | null;
  affected_feature: string | null;
  page_url: string | null;
  browser_info: {
    user_agent?: string;
    browser?: string;
    os?: string;
    viewport?: {
      width: number;
      height: number;
    };
  } | null;
  attachment_urls: string[] | null;
  screenshot_url: string | null;
  view_count: number;
}

export interface FeedbackVote {
  id: string;
  feedback_id: string;
  user_id: string;
  created_at: string;
}

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  user_id: string;
  parent_comment_id: string | null;
  comment: string;
  is_admin: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  likes_count: number;
}

// ============================================
// NOTIFICATION TABLES
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  action_url: string | null;
  image_url: string | null;
  is_read: boolean;
  is_archived: boolean;
  read_at: string | null;
  delivered_channels: string[];
  email_sent: boolean;
  email_sent_at: string | null;
  sms_sent: boolean;
  sms_sent_at: string | null;
  push_sent: boolean;
  push_sent_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  digest_frequency: 'realtime' | 'daily' | 'weekly' | 'never';
  type_preferences: Record<string, {
    email: boolean;
    push: boolean;
    sms: boolean;
    in_app: boolean;
  }>;
  email_address: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// SAVED BUSINESSES TABLES
// ============================================

export interface SavedBusiness {
  id: string;
  user_id: string;
  business_id: string;
  list_id: string | null;
  notes: string | null;
  tags: string[] | null;
  saved_at: string;
  created_at: string;
}

export interface BusinessList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TECH STACK ANALYSIS TABLES
// ============================================

export interface TechStackAnalysis {
  id: string;
  data_room_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: TechAnalysisStatus;

  // Aggregate scores
  technologies_identified: number;
  risk_level: TechRiskLevel | null;
  modernization_score: number | null;
  ai_authenticity_score: number | null;
  technical_debt_score: number | null;

  // Category counts
  frontend_count: number;
  backend_count: number;
  database_count: number;
  infrastructure_count: number;
  ai_ml_count: number;

  // AI metadata
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

  related_technology_ids: string[];
  evidence_text: string | null;
  source_documents: string[];

  impact_description: string | null;
  mitigation_steps: string[] | null;
  estimated_cost_to_fix: string | null;

  is_addressed: boolean;
  addressed_by: string | null;
  addressed_at: string | null;
  resolution_notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface TechStackComparison {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  analysis_ids: string[];
  comparison_matrix: Record<string, unknown> | null;
  strengths_weaknesses: Record<string, unknown> | null;
  recommendations: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// DATABASE TYPE
// ============================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      businesses: {
        Row: Business;
        Insert: Omit<Business, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Business, 'id' | 'created_at'>>;
      };
      research_reports: {
        Row: ResearchReport;
        Insert: Omit<ResearchReport, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ResearchReport, 'id' | 'created_at'>>;
      };
      research_sections: {
        Row: ResearchSection;
        Insert: Omit<ResearchSection, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ResearchSection, 'id' | 'created_at'>>;
      };
      research_sources: {
        Row: ResearchSource;
        Insert: Omit<ResearchSource, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ResearchSource, 'id' | 'created_at'>>;
      };
      user_research_quotas: {
        Row: UserResearchQuota;
        Insert: Omit<UserResearchQuota, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserResearchQuota, 'user_id' | 'created_at'>>;
      };
      data_rooms: {
        Row: DataRoom;
        Insert: Omit<DataRoom, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DataRoom, 'id' | 'created_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Document, 'id' | 'created_at'>>;
      };
      document_analysis: {
        Row: DocumentAnalysis;
        Insert: Omit<DocumentAnalysis, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentAnalysis, 'id' | 'created_at'>>;
      };
      data_room_access: {
        Row: DataRoomAccess;
        Insert: Omit<DataRoomAccess, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DataRoomAccess, 'id' | 'created_at'>>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never; // Immutable
      };
      document_annotations: {
        Row: DocumentAnnotation;
        Insert: Omit<DocumentAnnotation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DocumentAnnotation, 'id' | 'created_at'>>;
      };
      document_pages: {
        Row: DocumentPage;
        Insert: Omit<DocumentPage, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentPage, 'id' | 'created_at'>>;
      };
      document_chunks: {
        Row: DocumentChunk;
        Insert: Omit<DocumentChunk, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentChunk, 'id' | 'created_at'>>;
      };
      qa_queries: {
        Row: QAQuery;
        Insert: Omit<QAQuery, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<QAQuery, 'id' | 'created_at'>>;
      };
      qa_citations: {
        Row: QACitation;
        Insert: Omit<QACitation, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<QACitation, 'id' | 'created_at'>>;
      };
      qa_feedback: {
        Row: QAFeedback;
        Insert: Omit<QAFeedback, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<QAFeedback, 'id' | 'created_at'>>;
      };
      qa_rate_limits: {
        Row: QARateLimit;
        Insert: Omit<QARateLimit, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<QARateLimit, 'id' | 'created_at'>>;
      };
      hypotheses: {
        Row: Hypothesis;
        Insert: Omit<Hypothesis, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Hypothesis, 'id' | 'created_at'>>;
      };
      hypothesis_evidence: {
        Row: HypothesisEvidence;
        Insert: Omit<HypothesisEvidence, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<HypothesisEvidence, 'id' | 'created_at'>>;
      };
      hypothesis_metrics: {
        Row: HypothesisMetric;
        Insert: Omit<HypothesisMetric, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<HypothesisMetric, 'id' | 'created_at'>>;
      };
      hypothesis_validations: {
        Row: HypothesisValidation;
        Insert: Omit<HypothesisValidation, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<HypothesisValidation, 'id' | 'created_at'>>;
      };
      competitor_companies: {
        Row: CompetitorCompany;
        Insert: Omit<CompetitorCompany, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CompetitorCompany, 'id' | 'created_at'>>;
      };
      competitive_analyses: {
        Row: CompetitiveAnalysis;
        Insert: Omit<CompetitiveAnalysis, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CompetitiveAnalysis, 'id' | 'created_at'>>;
      };
      feature_matrix_entries: {
        Row: FeatureMatrixEntry;
        Insert: Omit<FeatureMatrixEntry, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<FeatureMatrixEntry, 'id' | 'created_at'>>;
      };
      feature_parity_scores: {
        Row: FeatureParityScore;
        Insert: Omit<FeatureParityScore, 'id'> & {
          id?: string;
        };
        Update: Partial<Omit<FeatureParityScore, 'id'>>;
      };
      feedback: {
        Row: Feedback;
        Insert: Omit<Feedback, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Feedback, 'id' | 'created_at'>>;
      };
      feedback_votes: {
        Row: FeedbackVote;
        Insert: Omit<FeedbackVote, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      feedback_comments: {
        Row: FeedbackComment;
        Insert: Omit<FeedbackComment, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<FeedbackComment, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      notification_preferences: {
        Row: NotificationPreferences;
        Insert: Omit<NotificationPreferences, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<NotificationPreferences, 'id' | 'created_at'>>;
      };
      saved_businesses: {
        Row: SavedBusiness;
        Insert: Omit<SavedBusiness, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SavedBusiness, 'id' | 'created_at'>>;
      };
      business_lists: {
        Row: BusinessList;
        Insert: Omit<BusinessList, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BusinessList, 'id' | 'created_at'>>;
      };
      tech_stack_analyses: {
        Row: TechStackAnalysis;
        Insert: Omit<TechStackAnalysis, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TechStackAnalysis, 'id' | 'created_at'>>;
      };
      tech_stack_technologies: {
        Row: TechStackTechnology;
        Insert: Omit<TechStackTechnology, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TechStackTechnology, 'id' | 'created_at'>>;
      };
      tech_stack_findings: {
        Row: TechStackFinding;
        Insert: Omit<TechStackFinding, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TechStackFinding, 'id' | 'created_at'>>;
      };
      tech_stack_comparisons: {
        Row: TechStackComparison;
        Insert: Omit<TechStackComparison, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TechStackComparison, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      report_status: ReportStatus;
      section_type: SectionType;
      confidence_level: ConfidenceLevel;
      source_type: SourceType;
      deal_type: DealType;
      data_room_status: DataRoomStatus;
      document_type: DocumentType;
      processing_status: ProcessingStatus;
      permission_level: PermissionLevel;
      activity_action: ActivityAction;
      annotation_type: AnnotationType;
      analysis_type: AnalysisType;
      hypothesis_type: HypothesisType;
      hypothesis_status: HypothesisStatus;
      evidence_type: EvidenceType;
      metric_status: MetricStatus;
      validation_status: ValidationStatus;
      feedback_category: FeedbackCategory;
      feedback_status: FeedbackStatus;
      feedback_priority: FeedbackPriority;
      tech_risk_level: TechRiskLevel;
      tech_analysis_status: TechAnalysisStatus;
      tech_category: TechCategory;
      tech_authenticity: TechAuthenticity;
      tech_finding_type: TechFindingType;
      tech_finding_severity: TechFindingSeverity;
    };
  };
}

// ============================================
// HELPER TYPES
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
