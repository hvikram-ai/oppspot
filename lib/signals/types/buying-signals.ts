// Buying Signals Detection System Types

// ============= Core Signal Types =============

export type SignalType =
  | 'funding_round'
  | 'executive_change'
  | 'job_posting'
  | 'technology_adoption'
  | 'expansion'
  | 'merger_acquisition'
  | 'partnership'
  | 'product_launch'
  | 'regulatory_change'
  | 'competitive_move'
  | 'market_entry'
  | 'restructuring';

export type SignalCategory =
  | 'financial'
  | 'organizational'
  | 'growth'
  | 'technology'
  | 'strategic'
  | 'operational';

export type SignalStrength =
  | 'very_strong'
  | 'strong'
  | 'moderate'
  | 'weak';

export type SignalStatus =
  | 'detected'
  | 'verified'
  | 'processing'
  | 'actioned'
  | 'expired'
  | 'false_positive';

export type SourceReliability =
  | 'verified'
  | 'high'
  | 'medium'
  | 'low';

// ============= Base Signal Interface =============

export interface BuyingSignal {
  id: string;
  company_id: string;
  lead_id?: string;
  org_id?: string;

  // Signal classification
  signal_type: SignalType;
  signal_category?: SignalCategory;
  signal_strength?: SignalStrength;

  // Core signal data
  signal_data: Record<string, unknown>; // Will be specific to each signal type
  confidence_score: number; // 0-100
  buying_probability: number; // 0-100

  // Timing
  detected_at: Date | string;
  signal_date?: Date | string;
  expiry_date?: Date | string;

  // Source tracking
  source?: string;
  source_url?: string;
  source_reliability?: SourceReliability;

  // Processing status
  status: SignalStatus;
  verified_at?: Date | string;
  verified_by?: string;

  // Impact and recommendations
  impact_assessment?: ImpactAssessment;
  recommended_actions?: RecommendedAction[];
  engagement_window?: EngagementWindow;

  // Metadata
  created_at?: Date | string;
  updated_at?: Date | string;
  processed_at?: Date | string;
  notes?: string;
}

// ============= Funding Signal Types =============

export type RoundType =
  | 'seed'
  | 'series_a'
  | 'series_b'
  | 'series_c'
  | 'series_d_plus'
  | 'ipo'
  | 'debt'
  | 'grant'
  | 'crowdfunding'
  | 'other';

export type GrowthStage =
  | 'early'
  | 'growth'
  | 'expansion'
  | 'mature';

export interface Investor {
  name: string;
  type?: 'vc' | 'angel' | 'corporate' | 'pe' | 'government' | 'other';
  lead_investor?: boolean;
  amount?: number;
  previous_investments?: string[];
  portfolio_focus?: string[];
}

export interface FundingSignal extends BuyingSignal {
  signal_type: 'funding_round';

  // Funding details
  funding_data: {
    round_type: RoundType;
    amount: number;
    currency: string;
    valuation?: number;
    investors: Investor[];
    lead_investor?: Investor;
    announcement_date: Date | string;
    close_date?: Date | string;
  };

  // Context
  context: {
    previous_rounds?: FundingRound[];
    total_raised?: number;
    burn_rate_estimate?: number;
    runway_months?: number;
    growth_stage?: GrowthStage;
  };

  // Insights
  insights: {
    budget_availability?: BudgetEstimate;
    expansion_plans?: string[];
    investment_focus?: string[];
    hiring_intentions?: boolean;
    technology_upgrade_likely?: boolean;
  };

  // Recommendations
  talking_points?: string[];
  optimal_engagement_window?: DateRange;
}

export interface FundingRound {
  round_type: RoundType;
  amount: number;
  date: Date | string;
  investors?: string[];
}

export interface BudgetEstimate {
  estimated_amount: number;
  confidence: number;
  allocation_areas: string[];
  timeline: DateRange;
}

// ============= Executive Change Signal Types =============

export type ExecutiveLevel =
  | 'c_suite'
  | 'vp'
  | 'director'
  | 'manager';

export type ChangeType =
  | 'new_hire'
  | 'promotion'
  | 'departure'
  | 'reorganization'
  | 'lateral_move';

export type DecisionImpact =
  | 'high'
  | 'medium'
  | 'low';

export interface Executive {
  name: string;
  title: string;
  email?: string;
  linkedin?: string;
  previous_company?: string;
  previous_title?: string;
  tenure_months?: number;
  background?: ExecutiveBackground;
}

export interface ExecutiveBackground {
  education?: string[];
  certifications?: string[];
  specializations?: string[];
  published_articles?: number;
  speaking_engagements?: number;
  industry_recognition?: string[];
}

export interface ExecutiveChangeSignal extends BuyingSignal {
  signal_type: 'executive_change';

  // Executive details
  change_data: {
    position: string;
    level: ExecutiveLevel;
    department?: string;
    incoming_executive?: Executive;
    outgoing_executive?: Executive;
    change_type: ChangeType;
    effective_date: Date | string;
    announcement_date: Date | string;
    source: string;
  };

  // Impact assessment
  impact: {
    decision_making_impact: DecisionImpact;
    budget_authority?: boolean;
    likely_initiatives?: Initiative[];
    vendor_preferences?: VendorPreference[];
    technology_bias?: TechnologyPreference[];
  };

  // Background intelligence
  intelligence?: {
    previous_companies?: Company[];
    previous_vendors_used?: Vendor[];
    known_methodologies?: string[];
    published_articles?: Article[];
    speaking_engagements?: Event[];
    social_media_presence?: SocialProfile[];
  };

  // Opportunity scoring
  opportunity: {
    relevance_score: number; // 0-100
    timing_score: number; // 0-100
    influence_score: number; // 0-100
    accessibility_score: number; // 0-100
  };

  // Engagement strategy
  engagement_strategy?: {
    approach: 'immediate' | 'warming' | 'educational' | 'referral';
    key_messages?: string[];
    value_propositions?: string[];
    introduction_paths?: IntroductionPath[];
    common_connections?: Connection[];
  };
}

export interface Initiative {
  name: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  timeline?: string;
  budget_impact?: string;
}

export interface VendorPreference {
  vendor: string;
  preference_level: number;
  reasons?: string[];
}

export interface TechnologyPreference {
  technology: string;
  preference: 'positive' | 'neutral' | 'negative';
  experience_level?: string;
}

// ============= Job Posting Signal Types =============

export type RemoteOption =
  | 'remote'
  | 'hybrid'
  | 'onsite';

export type GrowthIndicator =
  | 'rapid'
  | 'steady'
  | 'moderate'
  | 'minimal';

export interface JobPostingSignal extends BuyingSignal {
  signal_type: 'job_posting';

  // Job posting data
  posting_data: {
    job_id?: string;
    title: string;
    department?: string;
    level?: string;
    location?: string;
    remote_options?: RemoteOption;
    posted_date: Date | string;
    source: string;
    url?: string;
    salary_range?: SalaryRange;
    required_skills?: Skill[];
    preferred_skills?: Skill[];
    technologies_mentioned?: Technology[];
    certifications?: Certification[];
    experience_years?: number;
  };

  // Signal analysis
  analysis: {
    growth_indicator: GrowthIndicator;
    department_expansion?: boolean;
    new_initiative_likelihood?: number; // 0-100
    technology_adoption?: Technology[];
    strategic_direction?: string[];
  };

  // Volume metrics
  volume_metrics?: {
    total_open_positions?: number;
    department_distribution?: DepartmentCount[];
    posting_velocity?: number; // posts per month
    growth_rate?: number; // % change
    comparative_analysis?: {
      industry_average: number;
      percentile: number;
    };
  };

  // Technology signals
  technology_signals?: {
    new_technologies?: Technology[];
    deprecated_technologies?: Technology[];
    technology_stack?: TechStack;
    integration_needs?: Integration[];
    infrastructure_changes?: Infrastructure[];
  };

  // Buying indicators
  buying_indicators: {
    budget_allocation_likely?: boolean;
    procurement_timeline?: DateRange;
    solution_categories?: SolutionCategory[];
    pain_points?: PainPoint[];
    decision_makers_hiring?: boolean;
  };
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

export interface Skill {
  name: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_required?: number;
}

export interface Technology {
  name: string;
  category?: string;
  version?: string;
  vendor?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  required?: boolean;
}

export interface DepartmentCount {
  department: string;
  count: number;
  percentage?: number;
}

// ============= Technology Adoption Signal Types =============

export type AdoptionType =
  | 'new_implementation'
  | 'replacement'
  | 'upgrade'
  | 'expansion'
  | 'pilot'
  | 'deprecation';

export type AdoptionStage =
  | 'evaluation'
  | 'pilot'
  | 'implementation'
  | 'rollout'
  | 'production'
  | 'sunsetting';

export type DetectionMethod =
  | 'dns_record'
  | 'job_posting'
  | 'press_release'
  | 'case_study'
  | 'website_scan'
  | 'social_media'
  | 'conference'
  | 'partner_announcement';

export type DeploymentScope =
  | 'company_wide'
  | 'department'
  | 'team'
  | 'pilot';

export type ComplexityLevel =
  | 'high'
  | 'medium'
  | 'low';

export interface TechnologyAdoptionSignal extends BuyingSignal {
  signal_type: 'technology_adoption';

  // Technology details
  technology_data: {
    technology_name: string;
    technology_category?: string;
    vendor?: string;
    adoption_type: AdoptionType;
    adoption_stage: AdoptionStage;
    detection_method: DetectionMethod;
    detection_confidence: number; // 0-100
  };

  // Impact analysis
  impact: {
    estimated_users?: number;
    deployment_scope?: DeploymentScope;
    integration_complexity?: ComplexityLevel;
    replaced_technology?: string;
    complementary_technologies?: string[];
    integration_requirements?: string[];
  };

  // Opportunity analysis
  opportunity: {
    cross_sell_opportunities?: string[];
    competitive_displacement?: boolean;
    expansion_potential?: ComplexityLevel;
  };
}

// ============= Signal Aggregation Types =============

export type EngagementPriority =
  | 'immediate'
  | 'high'
  | 'medium'
  | 'low'
  | 'monitor';

export interface SignalAggregation {
  id: string;
  company_id: string;
  lead_id?: string;

  // Aggregate scores
  total_signals: number;
  composite_score: number; // 0-100
  intent_score: number; // 0-100
  timing_score: number; // 0-100
  fit_score: number; // 0-100

  // Signal counts by type
  signal_counts: {
    funding_signals: number;
    executive_signals: number;
    job_signals: number;
    technology_signals: number;
    other_signals: number;
  };

  // Signal strength distribution
  strength_distribution: {
    very_strong: number;
    strong: number;
    moderate: number;
    weak: number;
  };

  // Time-based metrics
  most_recent_signal?: Date | string;
  signal_velocity?: number; // signals per month
  signal_acceleration?: number; // change in velocity

  // Recommendations
  engagement_priority: EngagementPriority;
  recommended_approach?: string;
  key_talking_points?: string[];
  optimal_contact_date?: Date | string;

  // Analysis timestamps
  calculated_at?: Date | string;
  next_review_date?: Date | string;
}

// ============= Signal Actions Types =============

export type ActionType =
  | 'email_sent'
  | 'call_made'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'alert_sent'
  | 'task_created'
  | 'opportunity_created'
  | 'campaign_enrolled';

export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ActionOutcome =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'no_response'
  | 'pending';

export interface SignalAction {
  id: string;
  signal_id: string;
  company_id?: string;

  // Action details
  action_type: ActionType;
  action_status: ActionStatus;

  // Execution details
  executed_at?: Date | string;
  executed_by?: string;
  automation_id?: string;

  // Response tracking
  response_received?: boolean;
  response_type?: string;
  response_data?: Record<string, unknown>;

  // Outcome
  outcome?: ActionOutcome;
  outcome_details?: string;

  created_at?: Date | string;
  updated_at?: Date | string;
}

// ============= Alert Configuration Types =============

export type BatchFrequency =
  | 'immediate'
  | 'hourly'
  | 'daily'
  | 'weekly';

export interface SignalAlertConfig {
  id: string;
  org_id?: string;
  user_id?: string;

  // Alert configuration
  name: string;
  description?: string;
  is_active: boolean;

  // Signal filters
  signal_types?: SignalType[];
  signal_categories?: SignalCategory[];
  minimum_strength?: SignalStrength;
  minimum_confidence?: number;
  minimum_buying_probability?: number;

  // Company filters
  company_filters?: Record<string, string | number | boolean>;
  industry_filters?: string[];
  size_filters?: {
    min?: number;
    max?: number;
    ranges?: string[];
  };
  location_filters?: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
  };

  // Alert delivery
  alert_channels: string[];
  email_enabled?: boolean;
  slack_enabled?: boolean;
  webhook_url?: string;

  // Timing
  real_time?: boolean;
  batch_frequency?: BatchFrequency;
  quiet_hours?: {
    start: string;
    end: string;
    timezone?: string;
  };

  created_at?: Date | string;
  updated_at?: Date | string;
}

// ============= Supporting Types =============

export interface DateRange {
  start: Date | string;
  end: Date | string;
}

export interface ImpactAssessment {
  revenue_impact?: number;
  urgency_level?: number;
  decision_timeline?: string;
  budget_implications?: string;
  strategic_alignment?: number;
}

export interface RecommendedAction {
  action: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timeline?: string;
  owner?: string;
  resources_needed?: string[];
}

export interface EngagementWindow {
  optimal_start: Date | string;
  optimal_end: Date | string;
  reason?: string;
}

export interface Company {
  id?: string;
  name: string;
  industry?: string;
  size?: string;
  location?: string;
}

export interface Vendor {
  name: string;
  category?: string;
  relationship?: string;
}

export interface Article {
  title: string;
  publication?: string;
  date?: Date | string;
  url?: string;
}

export interface Event {
  name: string;
  type?: string;
  date?: Date | string;
  topic?: string;
}

export interface SocialProfile {
  platform: string;
  handle?: string;
  followers?: number;
  activity_level?: string;
}

export interface IntroductionPath {
  path_type: string;
  intermediary?: string;
  strength?: number;
}

export interface Connection {
  name: string;
  relationship?: string;
  strength?: number;
}

export interface TechStack {
  frontend?: Technology[];
  backend?: Technology[];
  database?: Technology[];
  infrastructure?: Technology[];
  tools?: Technology[];
}

export interface Integration {
  name: string;
  type?: string;
  complexity?: string;
}

export interface Infrastructure {
  type: string;
  change?: string;
  impact?: string;
}

export interface SolutionCategory {
  name: string;
  priority?: string;
  budget_range?: SalaryRange;
}

export interface PainPoint {
  description: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  impact_area?: string;
}