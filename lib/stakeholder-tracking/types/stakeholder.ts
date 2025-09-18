// Stakeholder Tracking Types and Interfaces

// Core stakeholder type
export type RoleType =
  | 'champion'
  | 'influencer'
  | 'decision_maker'
  | 'gatekeeper'
  | 'end_user'
  | 'detractor'
  | 'neutral';

export type RelationshipStatus =
  | 'not_contacted'
  | 'initial_contact'
  | 'developing'
  | 'established'
  | 'strong'
  | 'at_risk'
  | 'lost';

export type ChampionStatus =
  | 'potential'
  | 'developing'
  | 'active'
  | 'super'
  | 'at_risk'
  | 'lost';

export interface Stakeholder {
  id: string;
  company_id: string;
  org_id?: string;

  // Basic information
  name: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;

  // Role and influence
  role_type?: RoleType;
  influence_level?: number; // 1-10
  decision_authority?: boolean;
  budget_authority?: boolean;

  // Relationship status
  relationship_status?: RelationshipStatus;
  engagement_score?: number; // 0-100

  // Champion potential
  champion_score?: number; // 0-100
  champion_status?: ChampionStatus;

  // Tracking
  last_contact_date?: string;
  next_action_date?: string;
  assigned_to?: string;
  tags?: string[];
  notes?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Champion tracking types
export type EngagementFrequency =
  | 'daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'quarterly'
  | 'rare';

export type DevelopmentStage =
  | 'identified'
  | 'qualifying'
  | 'developing'
  | 'activated'
  | 'scaling'
  | 'maintaining';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ChampionGoal {
  id: string;
  goal: string;
  target_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress?: number;
}

export interface DevelopmentAction {
  id: string;
  action: string;
  category: string;
  completed: boolean;
  completed_date?: string;
  impact?: number;
}

export interface ChampionTracking {
  id: string;
  stakeholder_id: string;
  org_id?: string;

  // Champion metrics
  advocacy_level?: number; // 1-10
  internal_influence?: number; // 1-10
  engagement_frequency?: EngagementFrequency;

  // Activities
  referrals_made?: number;
  meetings_facilitated?: number;
  internal_advocates?: number;
  success_stories_shared?: number;

  // Development stage
  development_stage?: DevelopmentStage;
  development_actions?: DevelopmentAction[];

  // Risk indicators
  risk_level?: RiskLevel;
  risk_factors?: string[];
  last_positive_interaction?: string;

  // Goals and progress
  champion_goals?: ChampionGoal[];
  cultivation_plan?: string;
  next_milestone?: string;
  milestone_date?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

// Detractor management types
export type InfluenceRadius =
  | 'individual'
  | 'team'
  | 'department'
  | 'division'
  | 'company_wide';

export type BusinessImpact =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type MitigationStatus =
  | 'not_started'
  | 'in_progress'
  | 'partial_success'
  | 'converted'
  | 'neutralized'
  | 'escalated'
  | 'abandoned';

export type SentimentTrend =
  | 'improving'
  | 'stable'
  | 'declining'
  | 'volatile';

export interface MitigationAction {
  id: string;
  action: string;
  date: string;
  outcome?: string;
  success?: boolean;
}

export interface DetractorManagement {
  id: string;
  stakeholder_id: string;
  org_id?: string;

  // Detractor assessment
  detractor_level?: number; // 1-10
  opposition_reasons?: string[];
  influence_radius?: InfluenceRadius;

  // Impact analysis
  business_impact?: BusinessImpact;
  deal_risk_score?: number; // 0-100
  blocking_potential?: boolean;

  // Mitigation strategy
  mitigation_status?: MitigationStatus;
  mitigation_strategy?: string;
  mitigation_actions?: MitigationAction[];

  // Conversion tracking
  conversion_potential?: number; // 0-100
  conversion_barriers?: string[];
  conversion_approach?: string;

  // Monitoring
  sentiment_trend?: SentimentTrend;
  last_assessment_date?: string;
  next_review_date?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

// Influence scoring types
export interface InfluenceScores {
  id: string;
  stakeholder_id: string;
  org_id?: string;

  // Influence dimensions
  hierarchical_influence?: number; // 0-100
  social_influence?: number; // 0-100
  technical_influence?: number; // 0-100
  political_influence?: number; // 0-100

  // Composite scores
  overall_influence?: number; // 0-100
  decision_weight?: number; // 0-1

  // Network metrics
  network_centrality?: number;
  connection_count?: number;
  influence_reach?: string;

  // Behavioral indicators
  opinion_leader?: boolean;
  early_adopter?: boolean;
  change_agent?: boolean;

  // Calculation metadata
  calculation_method?: string;
  confidence_score?: number;
  last_calculated?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

// Role change types
export type ChangeType =
  | 'promotion'
  | 'lateral_move'
  | 'demotion'
  | 'departure'
  | 'return'
  | 'new_hire'
  | 'title_change';

export type ImpactOnRelationship =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'unknown';

export type ContinuityRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ActionItem {
  id: string;
  action: string;
  assigned_to?: string;
  due_date?: string;
  completed?: boolean;
  completed_date?: string;
}

export interface RoleChange {
  id: string;
  stakeholder_id: string;
  org_id?: string;

  // Change details
  change_type?: ChangeType;
  previous_role?: string;
  new_role?: string;
  previous_department?: string;
  new_department?: string;

  // Impact assessment
  impact_on_relationship?: ImpactOnRelationship;
  continuity_risk?: ContinuityRisk;

  // Successor information
  successor_id?: string;
  handover_status?: string;
  knowledge_transfer_notes?: string;

  // Response actions
  action_required?: boolean;
  action_items?: ActionItem[];
  action_deadline?: string;

  // Tracking
  change_date: string;
  detected_date?: string;
  acknowledged_date?: string;
  acknowledged_by?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

// Engagement types
export type EngagementType =
  | 'email'
  | 'call'
  | 'meeting'
  | 'demo'
  | 'presentation'
  | 'workshop'
  | 'social'
  | 'event'
  | 'webinar'
  | 'other';

export type EngagementOutcome =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'no_response'
  | 'follow_up_needed';

export interface Participant {
  id: string;
  name: string;
  role?: string;
  company?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface StakeholderEngagement {
  id: string;
  stakeholder_id: string;
  org_id?: string;

  // Engagement details
  engagement_type?: EngagementType;
  engagement_date: string;
  duration_minutes?: number;

  // Content and outcome
  subject?: string;
  description?: string;
  outcome?: EngagementOutcome;
  sentiment_score?: number; // -100 to 100

  // Follow-up
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;

  // Participants
  initiated_by?: string;
  participants?: Participant[];

  // Links and attachments
  meeting_link?: string;
  recording_url?: string;
  attachments?: Attachment[];

  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Relationship types
export type RelationshipType =
  | 'reports_to'
  | 'peer'
  | 'dotted_line'
  | 'informal_influence'
  | 'mentor'
  | 'sponsor'
  | 'blocker'
  | 'ally';

export type InfluenceDirection = 'mutual' | 'one_way' | 'none';

export interface StakeholderRelationship {
  id: string;
  stakeholder_id: string;
  related_stakeholder_id: string;
  org_id?: string;

  // Relationship details
  relationship_type?: RelationshipType;
  strength?: number; // 1-10
  influence_direction?: InfluenceDirection;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

// Alert types
export type AlertType =
  | 'role_change'
  | 'risk_increase'
  | 'engagement_drop'
  | 'milestone_due'
  | 'no_contact'
  | 'sentiment_decline'
  | 'champion_at_risk'
  | 'detractor_active';

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface StakeholderAlert {
  id: string;
  stakeholder_id: string;
  org_id?: string;

  // Alert details
  alert_type?: AlertType;
  severity?: AlertSeverity;

  // Alert content
  title: string;
  message?: string;
  action_required?: string;

  // Status
  status?: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;

  // Metadata
  created_at?: string;
  expires_at?: string;
}

// API Request/Response types
export interface CreateStakeholderRequest {
  stakeholder: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>;
}

export interface UpdateStakeholderRequest {
  stakeholder_id: string;
  updates: Partial<Stakeholder>;
}

export interface IdentifyChampionsRequest {
  company_id?: string;
  org_id?: string;
  min_score?: number;
  include_potential?: boolean;
}

export interface IdentifyChampionsResponse {
  success: boolean;
  champions: Array<{
    stakeholder: Stakeholder;
    tracking?: ChampionTracking;
    score: number;
    recommendation: string;
  }>;
  total_count: number;
}

export interface IdentifyDetractorsRequest {
  company_id?: string;
  org_id?: string;
  min_risk_score?: number;
}

export interface IdentifyDetractorsResponse {
  success: boolean;
  detractors: Array<{
    stakeholder: Stakeholder;
    management?: DetractorManagement;
    risk_score: number;
    mitigation_priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  total_count: number;
}

export interface CalculateInfluenceRequest {
  stakeholder_id: string;
  include_network?: boolean;
  recalculate?: boolean;
}

export interface CalculateInfluenceResponse {
  success: boolean;
  influence_scores: InfluenceScores;
  network_analysis?: {
    connections: StakeholderRelationship[];
    centrality_score: number;
    influence_map: Record<string, number>;
  };
}

export interface TrackEngagementRequest {
  engagement: Omit<StakeholderEngagement, 'id' | 'created_at' | 'updated_at'>;
}

export interface TrackEngagementResponse {
  success: boolean;
  engagement: StakeholderEngagement;
  sentiment_trend?: SentimentTrend;
  next_actions?: ActionItem[];
}

export interface DetectRoleChangeRequest {
  stakeholder_id?: string;
  company_id?: string;
  check_all?: boolean;
}

export interface DetectRoleChangeResponse {
  success: boolean;
  changes_detected: RoleChange[];
  alerts_created: StakeholderAlert[];
}

export interface StakeholderDashboardData {
  total_stakeholders: number;
  champions: {
    active: number;
    developing: number;
    at_risk: number;
  };
  detractors: {
    active: number;
    being_mitigated: number;
    converted: number;
  };
  engagement_metrics: {
    avg_engagement_score: number;
    recent_engagements: number;
    overdue_follow_ups: number;
  };
  alerts: StakeholderAlert[];
  upcoming_actions: Array<{
    stakeholder: Stakeholder;
    action: string;
    due_date: string;
  }>;
  relationship_map: {
    nodes: Array<{
      id: string;
      name: string;
      role: RoleType;
      influence: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: RelationshipType;
      strength: number;
    }>;
  };
}