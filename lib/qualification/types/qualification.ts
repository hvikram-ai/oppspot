// Qualification Workflows Types and Interfaces

// ============= BANT Framework Types =============

export interface BANTQualification {
  id?: string;
  lead_id: string;
  company_id: string;
  org_id?: string;

  // Budget Assessment
  budget: {
    score: number; // 0-100
    estimated_budget?: number;
    budget_confirmed: boolean;
    budget_range: 'under_10k' | '10k_50k' | '50k_100k' | '100k_500k' | 'over_500k';
    budget_source: 'confirmed' | 'estimated' | 'inferred';
    financial_indicators?: {
      revenue?: number;
      growth_rate?: number;
      funding_status?: string;
      credit_score?: number;
    };
  };

  // Authority Mapping
  authority: {
    score: number; // 0-100
    decision_makers: DecisionMaker[];
    buying_committee_size: number;
    stakeholder_map?: StakeholderMap;
    engagement_level: {
      executive: number;
      manager: number;
      user: number;
    };
  };

  // Need Analysis
  need: {
    score: number; // 0-100
    pain_points: PainPoint[];
    use_cases: UseCase[];
    urgency_level: 'critical' | 'high' | 'medium' | 'low';
    problem_acknowledgment: boolean;
    solution_fit_score: number;
  };

  // Timeline Assessment
  timeline: {
    score: number; // 0-100
    decision_date?: Date | string;
    implementation_date?: Date | string;
    urgency_indicators: string[];
    buying_stage: 'awareness' | 'consideration' | 'decision' | 'purchase';
    timeline_confidence: number;
  };

  // Overall BANT Score
  overall_score: number;
  qualification_status: 'qualified' | 'nurture' | 'disqualified';
  next_actions?: QualificationAction[];

  // Metadata
  calculated_at?: string;
  calculated_by?: string;
  next_review_date?: string;
  notes?: string;
}

// ============= MEDDIC Framework Types =============

export interface MEDDICQualification {
  id?: string;
  lead_id: string;
  company_id: string;
  org_id?: string;

  // Metrics
  metrics: {
    score: number;
    kpis_identified: KPI[];
    success_criteria: SuccessCriteria[];
    roi_calculation?: ROIModel;
    value_quantification?: number;
  };

  // Economic Buyer
  economic_buyer: {
    score: number;
    identified: boolean;
    contact_info?: Contact;
    engagement_level: number;
    buying_power_confirmed: boolean;
    budget_authority?: string;
  };

  // Decision Criteria
  decision_criteria: {
    score: number;
    technical_requirements: Requirement[];
    business_requirements: Requirement[];
    vendor_preferences?: VendorPreference[];
    evaluation_matrix?: EvaluationMatrix;
  };

  // Decision Process
  decision_process: {
    score: number;
    stages: DecisionStage[];
    current_stage: string;
    stakeholders: Stakeholder[];
    approval_process?: ApprovalProcess;
    timeline?: Timeline;
  };

  // Identify Pain
  identify_pain: {
    score: number;
    pain_points: DetailedPainPoint[];
    business_impact?: BusinessImpact;
    cost_of_inaction?: number;
    urgency_level: number;
  };

  // Champion
  champion: {
    score: number;
    identified: boolean;
    champion_profile?: ChampionProfile;
    influence_level: number;
    internal_selling_ability: number;
    relationship_strength: number;
  };

  // Overall MEDDIC Score
  overall_score: number;
  qualification_confidence: number;
  forecast_category: 'commit' | 'best_case' | 'pipeline' | 'omitted';

  // Metadata
  calculated_at?: string;
  calculated_by?: string;
  next_review_date?: string;
  notes?: string;
}

// ============= Lead Routing Types =============

export interface LeadRoutingRule {
  id: string;
  org_id?: string;
  name: string;
  description?: string;
  priority: number;
  is_active: boolean;

  // Conditions
  conditions: {
    score_range?: { min: number; max: number };
    company_size?: string[];
    industry?: string[];
    geography?: string[];
    product_interest?: string[];
    engagement_level?: string;
    qualification_framework?: 'BANT' | 'MEDDIC' | 'CUSTOM';
  };

  // Actions
  routing_algorithm: 'round_robin' | 'weighted' | 'skill_based' | 'territory' | 'account_based' | 'ai_optimized';
  assignment_type: 'team' | 'individual' | 'queue';
  assignment_target?: any;
  sla_hours?: number;
  escalation_hours?: number;
  escalation_target?: any;

  // Advanced settings
  settings?: {
    working_hours_only?: boolean;
    timezone_aware?: boolean;
    holiday_handling?: 'queue' | 'next_available' | 'escalate';
    capacity_planning?: boolean;
    skill_matching?: any;
  };
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  company_id?: string;
  org_id?: string;

  assigned_to?: string;
  assigned_by?: string;
  routing_rule_id?: string;

  assignment_reason?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  sla_deadline?: string;

  status: 'assigned' | 'accepted' | 'working' | 'completed' | 'reassigned' | 'expired';
  accepted_at?: string;
  completed_at?: string;
  reassigned_at?: string;

  response_time_minutes?: number;
  resolution_time_hours?: number;
  routing_metadata?: any;
}

export interface RoutingDecision {
  assigned_to: string;
  routing_reason: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  sla: number;
  escalation_path?: string[];
}

// ============= Alert System Types =============

export interface ThresholdAlertConfig {
  id: string;
  org_id?: string;
  name: string;
  description?: string;
  is_active: boolean;

  alert_type: 'score_threshold' | 'score_velocity' | 'engagement_spike' |
              'buying_signal' | 'risk_indicator' | 'qualification_milestone';

  trigger_conditions: {
    condition: 'crosses_above' | 'crosses_below' | 'equals' | 'changes_by';
    threshold: number;
    time_window?: string;
    sustained_duration?: number;
    aggregation?: 'any' | 'all' | 'average';
  };

  compound_conditions?: {
    operator: 'AND' | 'OR';
    conditions: any[];
  };

  actions: {
    notify?: string[];
    assign_task?: any;
    update_stage?: string;
    add_to_campaign?: string;
    trigger_workflow?: string;
    webhook?: any;
  };

  use_ml_prediction?: boolean;
  use_anomaly_detection?: boolean;
  use_peer_comparison?: boolean;
}

// ============= Checklist Types =============

export interface QualificationChecklist {
  id: string;
  lead_id: string;
  company_id?: string;
  org_id?: string;
  framework: 'BANT' | 'MEDDIC' | 'CUSTOM';
  template_id?: string;

  // Progress tracking
  total_items: number;
  completed_items: number;
  completion_percentage: number;

  // Status
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  started_at?: string;
  completed_at?: string;

  // Items
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  category: string;
  question: string;
  description?: string;
  order_index?: number;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'na';
  completed_at?: string;
  completed_by?: string;

  // Answer/Evidence
  answer?: string;
  evidence?: any[];

  // Validation
  is_required: boolean;
  validation_type?: 'manual' | 'automatic' | 'hybrid';
  validation_data?: any;

  // Scoring impact
  weight?: number;
  score_impact?: number;

  // Dependencies
  dependencies?: {
    prerequisite_items?: string[];
    unlocks_items?: string[];
    conditional_display?: any;
  };

  // Intelligence
  auto_populate?: boolean;
  data_source?: string;
  ml_suggestion?: string;
  confidence_score?: number;
}

// ============= Lead Recycling Types =============

export interface LeadRecyclingRule {
  id: string;
  org_id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  priority: number;

  trigger_conditions: {
    disqualification_reason?: string[];
    time_since_disqualification?: number;
    score_improvement?: number;
    engagement_signals?: string[];
    external_triggers?: string[];
  };

  recycling_action: 're_engage' | 'nurture' | 're_qualify' | 'archive';
  assignment_strategy: 'original_rep' | 'new_rep' | 'nurture_team' | 'marketing' | 'round_robin';
  nurture_campaign_id?: string;
  recycling_delay_days?: number;

  use_ai_optimization?: boolean;
  personalization_level?: 'high' | 'medium' | 'low';
  settings?: any;
}

export interface LeadRecyclingHistory {
  id: string;
  lead_id: string;
  company_id?: string;
  rule_id?: string;

  previous_status?: string;
  new_status?: string;
  recycling_reason?: string;
  recycled_from?: string;
  recycled_to?: string;

  outcome?: 're_qualified' | 'still_nurturing' | 'archived' | 'converted' | 'lost';
  outcome_date?: string;
  outcome_details?: any;

  created_at?: string;
}

export interface NurtureCampaign {
  id: string;
  org_id?: string;
  name: string;
  description?: string;
  is_active: boolean;

  campaign_type: 'not_ready' | 'no_budget' | 'lost_to_competitor' |
                 'bad_timing' | 'price_objection' | 'general';

  trigger_reason?: string;

  sequence_steps?: CampaignStep[];
  branching_logic?: any;
  exit_criteria?: any;

  use_dynamic_content?: boolean;
  use_ai_copywriting?: boolean;
  personalization_rules?: any;

  // Performance metrics
  total_leads?: number;
  re_engagement_rate?: number;
  conversion_rate?: number;
  avg_nurture_days?: number;
}

// ============= Supporting Types =============

export interface DecisionMaker {
  id?: string;
  name: string;
  title: string;
  department?: string;
  authority_level: 'executive' | 'director' | 'manager' | 'influencer';
  engagement_status: 'engaged' | 'aware' | 'unaware';
  contact_info?: Contact;
}

export interface StakeholderMap {
  [key: string]: {
    role: string;
    influence: number;
    engagement: number;
  };
}

export interface PainPoint {
  id?: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact_area: string;
  quantified_cost?: number;
}

export interface UseCase {
  id?: string;
  name: string;
  description: string;
  priority: number;
  expected_value?: number;
}

export interface QualificationAction {
  id?: string;
  action: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date?: string;
  assigned_to?: string;
}

export interface KPI {
  name: string;
  current_value?: number;
  target_value?: number;
  unit?: string;
}

export interface SuccessCriteria {
  criterion: string;
  measurable: boolean;
  timeline?: string;
}

export interface ROIModel {
  investment: number;
  expected_return: number;
  payback_period_months: number;
  confidence_level: number;
}

export interface Contact {
  email?: string;
  phone?: string;
  linkedin?: string;
}

export interface Requirement {
  id?: string;
  description: string;
  priority: 'must_have' | 'nice_to_have' | 'optional';
  satisfied: boolean;
}

export interface VendorPreference {
  vendor: string;
  preference_level: number;
  reasons?: string[];
}

export interface EvaluationMatrix {
  criteria: string[];
  weights: number[];
  scores: { [vendor: string]: number[] };
}

export interface DecisionStage {
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  owner?: string;
  due_date?: string;
}

export interface Stakeholder {
  id?: string;
  name: string;
  role: string;
  influence_level: number;
  engagement_level: number;
}

export interface ApprovalProcess {
  steps: string[];
  current_step: number;
  approvers: string[];
}

export interface Timeline {
  start_date?: string;
  key_milestones?: { date: string; milestone: string }[];
  target_completion?: string;
}

export interface DetailedPainPoint extends PainPoint {
  root_cause?: string;
  attempted_solutions?: string[];
  constraints?: string[];
}

export interface BusinessImpact {
  revenue_impact?: number;
  cost_impact?: number;
  efficiency_impact?: number;
  risk_impact?: string;
}

export interface ChampionProfile {
  name: string;
  title: string;
  department: string;
  influence_score: number;
  motivation?: string;
  concerns?: string[];
}

export interface CampaignStep {
  id: string;
  type: 'email' | 'call' | 'content' | 'event' | 'task';
  timing: string;
  content?: string;
  conditions?: any;
}

// ============= API Request/Response Types =============

export interface CalculateBANTRequest {
  lead_id: string;
  company_id: string;
  data?: Partial<BANTQualification>;
  auto_populate?: boolean;
}

export interface CalculateMEDDICRequest {
  lead_id: string;
  company_id: string;
  data?: Partial<MEDDICQualification>;
  auto_populate?: boolean;
}

export interface RouteLeadRequest {
  lead_id: string;
  company_id: string;
  override_rules?: boolean;
  preferred_assignee?: string;
}

export interface CreateChecklistRequest {
  lead_id: string;
  company_id: string;
  framework: 'BANT' | 'MEDDIC' | 'CUSTOM';
  template_id?: string;
}

export interface RecycleLeadRequest {
  lead_id: string;
  company_id: string;
  reason: string;
  force?: boolean;
}

export interface QualificationDashboardData {
  total_leads: number;
  qualified_leads: number;
  qualification_rate: number;

  bant_scores: {
    average_overall: number;
    average_budget: number;
    average_authority: number;
    average_need: number;
    average_timeline: number;
  };

  meddic_scores: {
    average_overall: number;
    forecast_distribution: {
      commit: number;
      best_case: number;
      pipeline: number;
      omitted: number;
    };
  };

  routing_metrics: {
    total_assignments: number;
    avg_response_time: number;
    sla_compliance: number;
    reassignment_rate: number;
  };

  checklist_metrics: {
    completion_rate: number;
    avg_items_completed: number;
    abandoned_rate: number;
  };

  recycling_metrics: {
    total_recycled: number;
    re_qualification_rate: number;
    nurture_conversion_rate: number;
  };

  recent_activities: any[];
  upcoming_reviews: any[];
  alerts: any[];
}