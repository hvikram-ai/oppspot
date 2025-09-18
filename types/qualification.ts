// Qualification Framework Types

// BANT Framework Types
export interface BANTQualification {
  id?: string
  lead_id: string
  company_id: string

  // BANT Scores
  budget_score: number // 0-100
  authority_score: number // 0-100
  need_score: number // 0-100
  timeline_score: number // 0-100

  // Overall qualification
  overall_score: number
  qualification_status: 'qualified' | 'nurture' | 'disqualified'

  // Budget Assessment Details
  budget_details: {
    estimated_budget?: number
    budget_confirmed?: boolean
    budget_range?: 'under_10k' | '10k_50k' | '50k_100k' | '100k_500k' | 'over_500k'
    budget_source?: 'confirmed' | 'estimated' | 'inferred'
    financial_indicators?: {
      revenue?: number
      growth_rate?: number
      funding_status?: string
      credit_score?: number
    }
  }

  // Authority Mapping Details
  authority_details: {
    decision_makers?: Array<{
      name: string
      role: string
      influence_level: number
      engaged: boolean
    }>
    buying_committee_size?: number
    stakeholder_map?: Record<string, any>
    engagement_level?: {
      executive: number
      manager: number
      user: number
    }
  }

  // Need Analysis Details
  need_details: {
    pain_points?: Array<{
      description: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      impact: string
    }>
    use_cases?: Array<{
      name: string
      priority: number
      fit_score: number
    }>
    urgency_level?: 'critical' | 'high' | 'medium' | 'low'
    problem_acknowledgment?: boolean
    solution_fit_score?: number
  }

  // Timeline Assessment Details
  timeline_details: {
    decision_date?: string
    implementation_date?: string
    urgency_indicators?: string[]
    buying_stage?: 'awareness' | 'consideration' | 'decision' | 'purchase'
    timeline_confidence?: number
  }

  // Metadata
  calculated_at?: string
  calculated_by?: string
  next_review_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

// MEDDIC Framework Types
export interface MEDDICQualification {
  id?: string
  lead_id: string
  company_id: string

  // MEDDIC Scores
  metrics_score: number // 0-100
  economic_buyer_score: number // 0-100
  decision_criteria_score: number // 0-100
  decision_process_score: number // 0-100
  identify_pain_score: number // 0-100
  champion_score: number // 0-100

  // Overall qualification
  overall_score: number
  qualification_confidence: number // 0-1
  forecast_category: 'commit' | 'best_case' | 'pipeline' | 'omitted'

  // Metrics Details
  metrics_details: {
    kpis_identified?: Array<{
      name: string
      current_value: number
      target_value: number
      measurement_method: string
    }>
    success_criteria?: Array<{
      criteria: string
      measurable: boolean
      agreed: boolean
    }>
    roi_calculation?: {
      investment: number
      expected_return: number
      payback_period: number
      roi_percentage: number
    }
    value_quantification?: number
  }

  // Economic Buyer Details
  economic_buyer_details: {
    identified?: boolean
    contact_info?: {
      name: string
      title: string
      email?: string
      phone?: string
    }
    engagement_level?: number
    buying_power_confirmed?: boolean
    budget_authority?: string
  }

  // Decision Criteria Details
  decision_criteria_details: {
    technical_requirements?: Array<{
      requirement: string
      priority: 'must_have' | 'nice_to_have' | 'future'
      met: boolean
    }>
    business_requirements?: Array<{
      requirement: string
      impact: string
      priority: number
    }>
    vendor_preferences?: Array<{
      vendor: string
      preference_level: number
      reason: string
    }>
    evaluation_matrix?: Record<string, any>
  }

  // Decision Process Details
  decision_process_details: {
    stages?: Array<{
      name: string
      status: 'completed' | 'current' | 'upcoming'
      owner: string
      expected_date: string
    }>
    current_stage?: string
    stakeholders?: Array<{
      name: string
      role: string
      influence: 'high' | 'medium' | 'low'
      stance: 'champion' | 'supporter' | 'neutral' | 'detractor'
    }>
    approval_process?: {
      steps: string[]
      current_step: number
      blockers: string[]
    }
    timeline?: {
      start_date: string
      decision_date: string
      implementation_date: string
    }
  }

  // Identify Pain Details
  identify_pain_details: {
    pain_points?: Array<{
      description: string
      business_impact: string
      cost_of_inaction: number
      urgency: number
    }>
    business_impact?: {
      revenue_impact: number
      cost_impact: number
      efficiency_impact: number
      risk_impact: string
    }
    cost_of_inaction?: number
    urgency_level?: number
  }

  // Champion Details
  champion_details: {
    identified?: boolean
    champion_profile?: {
      name: string
      title: string
      department: string
      tenure: number
    }
    influence_level?: number
    internal_selling_ability?: number
    relationship_strength?: number
  }

  // Metadata
  calculated_at?: string
  calculated_by?: string
  next_review_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

// Lead Routing Types
export interface LeadRoutingRule {
  id?: string
  org_id?: string
  name: string
  description?: string
  priority: number
  is_active: boolean

  // Conditions
  conditions: {
    score_range?: { min: number; max: number }
    company_size?: string[]
    industry?: string[]
    geography?: string[]
    product_interest?: string[]
    engagement_level?: string
    qualification_framework?: 'BANT' | 'MEDDIC' | 'CUSTOM'
  }

  // Routing configuration
  routing_algorithm: 'round_robin' | 'weighted' | 'skill_based' | 'territory' | 'account_based' | 'ai_optimized'
  assignment_target: {
    type: 'team' | 'individual' | 'queue'
    target_id?: string
    target_name?: string
  }
  sla_hours: number

  // Settings
  settings: {
    working_hours_only?: boolean
    timezone_aware?: boolean
    holiday_handling?: 'queue' | 'next_available' | 'escalate'
    capacity_planning?: boolean
    skill_matching?: Record<string, any>
  }

  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface LeadAssignment {
  id?: string
  lead_id: string
  assigned_to: string
  assigned_by?: string
  routing_rule_id?: string

  // Assignment details
  assignment_reason?: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  sla_deadline?: string

  // Status
  status: 'assigned' | 'accepted' | 'working' | 'completed' | 'reassigned'
  accepted_at?: string
  completed_at?: string

  // Metadata
  routing_metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

// Qualification Checklist Types
export interface QualificationChecklist {
  id?: string
  lead_id: string
  template_id?: string
  framework: 'BANT' | 'MEDDIC' | 'CUSTOM'

  // Progress
  total_items: number
  completed_items: number
  completion_percentage: number

  // Status
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'

  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface ChecklistItem {
  id?: string
  checklist_id: string
  category: string
  question: string
  description?: string
  sort_order: number

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'na'
  completed_at?: string
  completed_by?: string

  // Validation
  is_required: boolean
  validation_type: 'manual' | 'automatic' | 'hybrid'
  validation_data?: Record<string, any>

  // Scoring
  weight: number
  score_impact: number

  // Dependencies
  dependencies?: {
    prerequisite_items?: string[]
    unlocks_items?: string[]
    conditional_display?: Record<string, any>
  }

  created_at?: string
  updated_at?: string
}

// Lead Recycling Types
export interface LeadRecyclingRule {
  id?: string
  org_id?: string
  name: string
  description?: string
  is_active: boolean

  // Triggers
  trigger_conditions: {
    disqualification_reason?: string[]
    time_since_disqualification?: number // days
    score_improvement?: number
    engagement_signals?: string[]
    external_triggers?: string[] // funding, acquisition, expansion
  }

  // Actions
  recycling_action: 're_engage' | 'nurture' | 're_qualify' | 'archive'
  assignment_strategy?: string
  nurture_campaign_id?: string

  // Settings
  settings: {
    success_prediction?: number
    recommended_approach?: string
    personalization_level?: 'high' | 'medium' | 'low'
  }

  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface LeadRecyclingHistory {
  id?: string
  lead_id: string
  rule_id?: string

  // Details
  previous_status?: string
  new_status?: string
  recycling_reason?: string
  recycled_from?: string
  recycled_to?: string

  // Outcome
  outcome?: 're_qualified' | 'still_nurturing' | 'archived' | 'converted' | 'pending'
  outcome_date?: string

  created_at?: string
}

// Alert Configuration Types
export interface AdvancedAlertConfig {
  id?: string
  org_id?: string
  name: string
  description?: string
  alert_type: 'score_threshold' | 'score_velocity' | 'engagement_spike' | 'buying_signal' | 'risk_indicator' | 'qualification_milestone'
  is_active: boolean

  // Triggers
  trigger_conditions: {
    condition?: 'crosses_above' | 'crosses_below' | 'equals' | 'changes_by'
    threshold?: number
    time_window?: string // '1h', '24h', '7d'
    sustained_duration?: number // minutes
    aggregation?: 'any' | 'all' | 'average'
  }

  // Compound conditions
  compound_conditions?: {
    operator: 'AND' | 'OR'
    conditions: Array<Record<string, any>>
  }

  // Actions
  actions: {
    notify?: Array<{
      channel: 'email' | 'sms' | 'push' | 'in_app' | 'webhook'
      recipients: string[]
      template?: string
    }>
    assign_task?: Record<string, any>
    update_stage?: string
    add_to_campaign?: string
    trigger_workflow?: string
    webhook?: {
      url: string
      method: 'GET' | 'POST' | 'PUT'
      headers?: Record<string, string>
    }
  }

  // Intelligence features
  intelligence_config?: {
    ml_prediction?: boolean
    anomaly_detection?: boolean
    peer_comparison?: boolean
    trend_analysis?: boolean
    seasonality_adjustment?: boolean
  }

  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface AlertHistory {
  id?: string
  alert_config_id: string
  lead_id: string

  // Trigger info
  trigger_type: string
  trigger_value: Record<string, any>

  // Actions
  actions_taken: Record<string, any>

  // Status
  status: 'triggered' | 'acknowledged' | 'resolved' | 'escalated'
  acknowledged_by?: string
  acknowledged_at?: string
  resolved_at?: string

  created_at?: string
}

// Routing Decision Type
export interface RoutingDecision {
  assigned_to: string
  routing_reason: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  sla: number
  escalation_path?: string[]
}

// Checklist Templates
export interface ChecklistTemplate {
  id?: string
  name: string
  framework: 'BANT' | 'MEDDIC' | 'CUSTOM'
  items: Array<{
    category: string
    questions: string[]
  }>
  created_by?: string
  created_at?: string
}