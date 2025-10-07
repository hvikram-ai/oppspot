/**
 * ResearchGPT™ Type Definitions
 * AI-powered company intelligence in <30 seconds
 *
 * These types match the database schema and API contracts exactly.
 * Do not use 'any' types - all interfaces are fully typed.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'partial' | 'failed';

export type SectionType =
  | 'snapshot'
  | 'buying_signals'
  | 'decision_makers'
  | 'revenue_signals'
  | 'recommended_approach'
  | 'sources';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type SourceType =
  | 'companies_house'
  | 'press_release'
  | 'news_article'
  | 'company_website'
  | 'job_posting'
  | 'linkedin'
  | 'financial_filing'
  | 'industry_report'
  | 'social_media';

export type SignalType =
  | 'hiring'
  | 'expansion'
  | 'leadership'
  | 'tech_change'
  | 'social_sentiment'
  | 'funding'
  | 'product_launch';

export type SignalPriority = 'high' | 'medium' | 'low';

export type SeniorityLevel = 'C-level' | 'VP' | 'Director' | 'Manager' | 'IC';

export type DecisionInfluence = 'champion' | 'influencer' | 'blocker' | 'neutral' | 'unknown';

export type TimingUrgency = 'immediate' | 'within_week' | 'within_month' | 'monitor';

export type EmployeeGrowthTrend = 'growing' | 'stable' | 'declining';

export type ExpansionType = 'new_office' | 'market_entry' | 'acquisition';

export type LeadershipChangeType = 'new_hire' | 'promotion' | 'departure';

export type TechChangeType = 'adoption' | 'migration' | 'expansion';

export type MetricType =
  | 'customer_growth'
  | 'revenue'
  | 'profitability'
  | 'market_share'
  | 'competitive_position';

export type UserTier = 'free' | 'standard' | 'premium';

// ============================================================================
// DATABASE ENTITIES
// ============================================================================

/**
 * Main research report entity
 * Maps to: research_reports table
 */
export interface ResearchReport {
  id: string;
  user_id: string;
  company_id: string;
  company_name: string;
  company_number: string | null;

  // Status
  status: ReportStatus;
  confidence_score: number | null; // 0-1

  // Progress
  sections_complete: number; // 0-6
  total_sources: number;

  // Caching
  generated_at: string | null; // ISO timestamp
  cached_until: string | null; // ISO timestamp

  // Metadata (flexible JSONB)
  metadata: {
    generation_time_ms?: number;
    api_calls_made?: number;
    cache_hit?: boolean;
    force_refresh?: boolean;
    error_details?: string;
    [key: string]: unknown;
  };

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Individual section of research report
 * Maps to: research_sections table
 */
export interface ResearchSection {
  id: string;
  report_id: string;
  section_type: SectionType;

  // Content (type varies by section_type)
  content: SectionContent;

  // Quality
  confidence: ConfidenceLevel;
  sources_count: number;

  // Caching
  cached_at: string;
  expires_at: string;

  // Performance
  generation_time_ms: number | null;

  // Error handling
  error_message: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Union type for section content (JSONB field)
 */
export type SectionContent =
  | CompanySnapshot
  | BuyingSignal[]
  | DecisionMaker[]
  | RevenueSignal[]
  | RecommendedApproach
  | SourcesList;

/**
 * Source attribution entity
 * Maps to: research_sources table
 */
export interface Source {
  id: string;
  report_id: string;
  section_type: SectionType | null; // null if used in multiple sections

  // Source details
  url: string;
  title: string;
  published_date: string | null;
  accessed_date: string;

  // Classification
  source_type: SourceType;
  reliability_score: number; // 0-1

  // Metadata
  domain: string | null;
  content_snippet: string | null;

  // Timestamp
  created_at: string;
}

/**
 * User quota tracking entity
 * Maps to: user_research_quotas table
 */
export interface UserResearchQuota {
  user_id: string;

  // Period
  period_start: string;
  period_end: string;

  // Usage
  researches_used: number;
  researches_limit: number;

  // Tier
  tier: UserTier;

  // Notifications
  notification_90_percent_sent: boolean;
  notification_100_percent_sent: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SECTION-SPECIFIC CONTENT TYPES
// ============================================================================

/**
 * Company Snapshot (FR-006 to FR-010)
 * Static data: 7-day cache
 */
export interface CompanySnapshot {
  // FR-006: Basic information
  founded_year: number | null;
  company_type: string | null;
  company_status: string | null;

  // FR-007: Employee metrics
  employee_count: number | null;
  employee_growth_yoy: number | null; // Percentage
  employee_growth_trend: EmployeeGrowthTrend | null;

  // FR-008: Financial estimates
  revenue_estimate: {
    amount: number | null;
    currency: string;
    confidence: ConfidenceLevel;
    last_filed_accounts?: {
      date: string;
      revenue: number;
    };
  } | null;

  // FR-009: Technology stack
  tech_stack: TechStackItem[];

  // FR-010: Funding history
  funding_rounds: FundingRound[];

  // Additional context
  industry: string | null;
  sic_codes: string[];
  headquarters: {
    city: string | null;
    country: string | null;
    address: string | null;
  } | null;
}

export interface TechStackItem {
  category: string;
  technology: string;
  detected_at: string;
}

export interface FundingRound {
  round_type: string;
  amount: number;
  currency: string;
  announced_date: string;
  investors: string[];
}

/**
 * Buying Signal (FR-011 to FR-016)
 * Dynamic data: 6-hour cache
 */
export interface BuyingSignal {
  signal_type: SignalType;
  priority: SignalPriority; // FR-016
  detected_date: string;
  confidence: ConfidenceLevel;
  description: string;
  source_url: string;
  source_type: string;
  category?: string;

  // Type-specific details
  details: HiringSignal | ExpansionSignal | LeadershipSignal | TechSignal | SocialSentimentSignal;
}

export interface HiringSignal {
  job_postings_count: number;
  departments: string[];
  seniority_levels: string[];
  job_titles: string[];
  posted_within_days: number;
}

export interface ExpansionSignal {
  expansion_type: ExpansionType;
  location: string;
  announced_date: string;
  press_release_url: string | null;
}

export interface LeadershipSignal {
  change_type: LeadershipChangeType;
  person_name: string;
  role: string;
  department: string;
  announced_date: string;
}

export interface TechSignal {
  technology: string;
  change_type: TechChangeType;
  detected_from: string;
}

export interface SocialSentimentSignal {
  platform: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  mention_count: number;
  key_topics: string[];
}

/**
 * Decision Maker (FR-017 to FR-021)
 * GDPR-compliant: only business contact info from official sources
 */
export interface DecisionMaker {
  // FR-018: Core information
  name: string;
  job_title: string;
  department: string;
  seniority_level: SeniorityLevel;
  linkedin_url: string | null;

  // FR-018: Background
  background_summary: string;
  years_in_role: number | null;
  previous_companies: string[];

  // FR-019: Reporting structure
  reports_to: string | null;
  team_size: number | null;

  // FR-020: Champion identification
  decision_influence: DecisionInfluence;
  influence_rationale: string;

  // FR-021: GDPR-compliant contact info
  business_email: string | null; // Only if from official source
  business_phone: string | null; // Only if from official source
  contact_source: string;
  contact_verified_date: string | null;

  // FR-021c: Removal tracking
  removal_requested: boolean;
  removal_date: string | null;
}

/**
 * Revenue Signal (FR-022 to FR-025)
 */
export interface RevenueSignal {
  metric_type: MetricType;
  value: number | string;
  unit: string;
  time_period: string;
  source: string;
  source_url: string;
  confidence_level: ConfidenceLevel;
  published_date: string | null;
  signal_type?: string;
  positive?: boolean;
  description?: string;
}

/**
 * Recommended Approach (FR-026 to FR-029)
 * AI-generated outreach strategy
 */
export interface RecommendedApproach {
  // FR-027: Best contact person
  recommended_contact_id: string | null; // References DecisionMaker
  recommended_contact_name: string;
  contact_rationale: string;

  // FR-026: Strategy
  approach_summary: string; // 2-3 paragraphs
  key_talking_points: string[];

  // FR-028: Timing
  timing_suggestion: {
    urgency: TimingUrgency;
    rationale: string;
    optimal_time: string;
  };

  // FR-029: Conversation starters
  conversation_starters: ConversationStarter[];

  // AI reasoning transparency
  reasoning: {
    signals_considered: string[];
    decision_maker_factors: string[];
    risk_factors: string[];
  };
}

export interface ConversationStarter {
  opener: string;
  signal_reference: string;
  value_proposition: string;
}

/**
 * Sources Section (FR-030 to FR-033)
 */
export interface SourcesList {
  total_sources: number; // Must be >= 10 (FR-030)
  sources: Source[];
  sources_by_type: {
    [key in SourceType]?: number;
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * POST /api/research/[companyId] response
 */
export interface ResearchInitiatedResponse {
  report_id: string;
  status: 'pending' | 'generating';
  estimated_completion_seconds: number;
  poll_url: string;
}

/**
 * GET /api/research/[companyId]/status response
 */
export interface ResearchStatusResponse {
  report_id: string;
  status: ReportStatus;
  progress: {
    current_step: string;
    percent_complete: number; // 0-100
    sections_complete: number; // 0-6
  };
  elapsed_time_ms: number;
}

/**
 * GET /api/research/[companyId] response
 */
export interface ResearchReportResponse {
  report_id: string;
  company: {
    id: string;
    name: string;
    company_number: string | null;
  };
  status: ReportStatus;
  confidence_score: number | null;

  // 6 sections
  sections: {
    snapshot: CompanySnapshot | null;
    buying_signals: BuyingSignal[] | null;
    decision_makers: DecisionMaker[] | null;
    revenue_signals: RevenueSignal[] | null;
    recommended_approach: RecommendedApproach | null;
    sources: SourcesList | null;
  };

  // Metadata
  metadata: {
    generated_at: string;
    cached_until: string;
    generation_time_ms: number;
    cache_age: string; // Human-readable: "2 hours ago"
    can_refresh: boolean;
  };
}

/**
 * GET /api/research/quota response
 */
export interface QuotaResponse {
  user_id: string;
  period_start: string;
  period_end: string;
  researches_used: number;
  researches_limit: number;
  researches_remaining: number;
  tier: UserTier;
}

/**
 * Quota exceeded error response
 */
export interface QuotaExceededResponse {
  error: string;
  quota: QuotaResponse;
  upgrade_url: string;
}

/**
 * GET /api/research/history response
 */
export interface ResearchHistoryResponse {
  reports: ResearchReportSummary[];
  pagination: Pagination;
}

export interface ResearchReportSummary {
  report_id: string;
  company_name: string;
  company_id: string;
  status: ReportStatus;
  confidence_score: number | null;
  generated_at: string;
  sections_complete: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total_pages: number;
  total_items: number;
}

/**
 * Generic error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Cache metadata for smart caching
 */
export interface CacheMetadata {
  cached_at: string;
  expires_at: string;
  is_valid: boolean;
  age_ms: number;
  ttl_ms: number;
}

/**
 * Progress callback for real-time updates
 */
export type ProgressCallback = (progress: {
  step: string;
  percent: number;
  sections_complete: number;
}) => void;

/**
 * Data source result
 */
export interface DataSourceResult<T> {
  data: T | null;
  success: boolean;
  error: string | null;
  source: string;
  duration_ms: number;
}

/**
 * Analyzer result
 */
export interface AnalyzerResult<T> {
  result: T;
  confidence: ConfidenceLevel;
  sources_used: Source[];
  generation_time_ms: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isCompanySnapshot(content: SectionContent): content is CompanySnapshot {
  return typeof content === 'object' && !Array.isArray(content) && 'founded_year' in content;
}

export function isBuyingSignals(content: SectionContent): content is BuyingSignal[] {
  return Array.isArray(content) && (content.length === 0 || 'signal_type' in content[0]);
}

export function isDecisionMakers(content: SectionContent): content is DecisionMaker[] {
  return Array.isArray(content) && (content.length === 0 || 'job_title' in content[0]);
}

export function isRevenueSignals(content: SectionContent): content is RevenueSignal[] {
  return Array.isArray(content) && (content.length === 0 || 'metric_type' in content[0]);
}

export function isRecommendedApproach(content: SectionContent): content is RecommendedApproach {
  return typeof content === 'object' && !Array.isArray(content) && 'approach_summary' in content;
}

export function isSourcesList(content: SectionContent): content is SourcesList {
  return typeof content === 'object' && !Array.isArray(content) && 'total_sources' in content;
}
