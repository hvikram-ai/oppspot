# State-of-the-Art Stakeholder Tracking Implementation Plan

## Executive Summary
This document outlines a comprehensive implementation plan for an advanced Stakeholder Tracking system in oppSpot. The system will automatically identify, track, and analyze key stakeholders including champions, detractors, and influencers across customer organizations. Through AI-powered relationship mapping, behavioral analysis, and predictive modeling, the platform will provide sales teams with actionable insights to navigate complex B2B buying committees and maximize deal success rates.

## Vision Statement
Build the most sophisticated B2B stakeholder intelligence platform that combines relationship science, behavioral analytics, and AI to provide unprecedented visibility into buying committee dynamics, enabling precision engagement strategies that dramatically improve win rates and accelerate sales cycles.

## Current State Analysis
oppSpot currently has:
- **Basic Engagement Tracking**: Email and web engagement monitoring
- **Lead Scoring**: Company-level scoring without individual stakeholder analysis
- **Notification System**: Infrastructure for real-time alerts
- **AI Framework**: Foundation for intelligent analysis

## System Architecture Overview

### Core Components
1. **Stakeholder Discovery Engine**: Multi-channel contact identification
2. **Relationship Mapping System**: Organizational hierarchy and influence networks
3. **Behavioral Analytics Platform**: Engagement pattern analysis and scoring
4. **Champion Intelligence System**: Champion identification and cultivation
5. **Risk Management Module**: Detractor detection and mitigation

## Detailed Implementation Plan

### 1. Champion Identification System

#### 1.1 Champion Detection Architecture

```typescript
// lib/stakeholder/champion/champion-identification-engine.ts
interface ChampionIdentificationEngine {
  // Champion profile
  champion_profile: {
    stakeholder_id: string
    company_id: string

    // Personal information
    personal: {
      name: string
      title: string
      department: string
      tenure_months: number
      previous_roles: Role[]
      education: Education[]
      professional_network_size: number
    }

    // Champion indicators
    champion_score: {
      overall_score: number // 0-100
      enthusiasm_level: number
      influence_level: number
      advocacy_strength: number
      reliability_score: number
      conversion_probability: number
    }

    // Behavioral signals
    behaviors: {
      engagement_frequency: number
      response_time: number // hours
      content_sharing_rate: number
      internal_advocacy_signals: string[]
      meeting_participation: number
      initiative_taking: number
    }

    // Communication patterns
    communication: {
      preferred_channels: Channel[]
      communication_style: 'formal' | 'casual' | 'technical' | 'strategic'
      response_patterns: ResponsePattern[]
      language_sentiment: number
      emoji_usage: boolean
      message_length_avg: number
    }

    // Influence metrics
    influence: {
      organizational_level: number // 1-10
      decision_authority: 'final' | 'strong' | 'moderate' | 'advisory' | 'none'
      budget_control: boolean
      team_size: number
      cross_functional_reach: string[]
      internal_network_centrality: number
    }
  }

  // Champion development
  development: {
    current_stage: 'potential' | 'emerging' | 'developing' | 'established' | 'advocate'

    cultivation_actions: {
      recommended_content: Content[]
      engagement_tactics: Tactic[]
      relationship_building: Activity[]
      empowerment_tools: Tool[]
      recognition_opportunities: Recognition[]
    }

    // Progress tracking
    development_timeline: {
      identified_date: Date
      stage_transitions: StageTransition[]
      key_milestones: Milestone[]
      projected_advocate_date: Date
    }

    // Risk factors
    risks: {
      departure_risk: number
      influence_erosion_risk: number
      competitor_poaching_risk: number
      burnout_risk: number
      mitigation_strategies: Strategy[]
    }
  }

  // AI-powered insights
  ai_insights: {
    personality_profile: PersonalityType
    motivation_drivers: Motivation[]
    communication_preferences: Preference[]
    decision_making_style: DecisionStyle
    career_aspirations: CareerGoal[]
    value_alignment: ValueMatch
  }
}

interface ChampionCultivationSystem {
  // Nurturing programs
  programs: {
    executive_engagement: ExecutiveProgram
    peer_networking: NetworkingProgram
    thought_leadership: ThoughtProgram
    certification_training: TrainingProgram
    customer_advisory: AdvisoryProgram
  }

  // Content personalization
  personalization: {
    content_recommendations: ContentEngine
    messaging_optimization: MessageOptimizer
    timing_optimization: TimingEngine
    channel_selection: ChannelSelector
  }

  // Champion empowerment
  empowerment: {
    internal_selling_tools: SellingKit
    roi_calculators: ROITools
    presentation_materials: Presentations
    competitive_battlecards: Battlecards
    success_stories: CaseStudies
  }

  // Recognition system
  recognition: {
    achievement_tracking: Achievement[]
    reward_programs: RewardProgram[]
    public_recognition: Recognition[]
    exclusive_access: ExclusiveContent[]
    community_building: Community
  }
}
```

#### 1.2 Champion Scoring Algorithm

```typescript
interface ChampionScoringAlgorithm {
  // Multi-factor scoring
  scoring_factors: {
    // Engagement metrics (30%)
    engagement: {
      email_open_rate: number
      click_through_rate: number
      meeting_attendance: number
      content_downloads: number
      demo_requests: number
      weight: 0.30
    }

    // Advocacy signals (25%)
    advocacy: {
      internal_referrals: number
      peer_introductions: number
      positive_mentions: number
      case_study_participation: boolean
      reference_willingness: boolean
      weight: 0.25
    }

    // Influence indicators (20%)
    influence: {
      seniority_level: number
      budget_authority: boolean
      team_size: number
      cross_dept_connections: number
      executive_access: boolean
      weight: 0.20
    }

    // Relationship strength (15%)
    relationship: {
      interaction_frequency: number
      relationship_duration: number
      trust_indicators: number
      personal_connection: boolean
      mutual_value_exchange: number
      weight: 0.15
    }

    // Business alignment (10%)
    alignment: {
      use_case_fit: number
      value_understanding: number
      success_criteria_alignment: number
      timeline_alignment: number
      vision_alignment: number
      weight: 0.10
    }
  }

  // ML-based prediction
  ml_models: {
    champion_predictor: ChampionPredictorModel
    influence_estimator: InfluenceEstimatorModel
    churn_predictor: ChurnPredictorModel
    advocacy_forecaster: AdvocacyForecasterModel
  }
}
```

### 2. Detractor Management System

#### 2.1 Detractor Detection and Mitigation

```typescript
// lib/stakeholder/detractor/detractor-management-system.ts
interface DetractorManagementSystem {
  // Detractor identification
  identification: {
    detractor_id: string
    stakeholder_id: string

    // Detractor profile
    profile: {
      opposition_level: 'active' | 'passive' | 'potential'
      influence_radius: number
      credibility_score: number
      historical_behavior: Behavior[]
    }

    // Opposition reasons
    opposition_drivers: {
      technical_concerns: Concern[]
      political_motivations: Political[]
      personal_preferences: Preference[]
      competitive_alignment: Competitor[]
      change_resistance: ChangeResistance
      past_negative_experience: Experience[]
    }

    // Impact assessment
    impact: {
      deal_risk_level: 'critical' | 'high' | 'medium' | 'low'
      influence_on_others: StakeholderImpact[]
      veto_power: boolean
      public_opposition: boolean
      sabotage_risk: number
    }
  }

  // Mitigation strategies
  mitigation: {
    // Engagement tactics
    engagement: {
      direct_engagement: EngagementPlan
      indirect_influence: InfluencePath[]
      coalition_building: Coalition[]
      neutralization_tactics: Tactic[]
    }

    // Conversion strategies
    conversion: {
      concern_addressing: ConcernResponse[]
      value_demonstration: ValueProof[]
      risk_mitigation: RiskMitigation[]
      win_win_scenarios: Scenario[]
      compromise_options: Compromise[]
    }

    // Containment strategies
    containment: {
      influence_limitation: LimitStrategy[]
      coalition_isolation: IsolationTactic[]
      counter_messaging: MessageStrategy[]
      fact_based_response: FactBase[]
    }

    // Escalation protocols
    escalation: {
      executive_involvement: ExecutiveAction[]
      champion_mobilization: ChampionAction[]
      third_party_validation: Validation[]
      legal_considerations: Legal[]
    }
  }

  // Monitoring and tracking
  monitoring: {
    behavior_tracking: BehaviorMonitor
    sentiment_analysis: SentimentTracker
    influence_mapping: InfluenceMapper
    risk_assessment: RiskMonitor
    early_warning_system: WarningSystem
  }
}

interface DetractorConversionFramework {
  // Objection handling
  objection_management: {
    objection_catalog: Objection[]
    response_library: Response[]
    proof_points: ProofPoint[]
    success_stories: SuccessStory[]
    third_party_validation: Validation[]
  }

  // Trust building
  trust_building: {
    gradual_engagement: EngagementPath
    transparency_initiatives: Transparency[]
    risk_acknowledgment: RiskAck[]
    commitment_demonstration: Commitment[]
    quick_wins: QuickWin[]
  }

  // Stakeholder dynamics
  dynamics: {
    peer_influence: PeerInfluence[]
    champion_advocacy: ChampionSupport[]
    executive_alignment: ExecutiveSupport[]
    neutral_party_mediation: Mediation[]
  }
}
```

### 3. Stakeholder Influence Scoring

#### 3.1 Influence Measurement Framework

```typescript
// lib/stakeholder/influence/influence-scoring-engine.ts
interface InfluenceScoringEngine {
  // Influence dimensions
  dimensions: {
    // Formal influence
    formal: {
      hierarchical_position: number // 1-10
      budget_authority: number // 0-100M+
      decision_rights: DecisionRight[]
      veto_power: boolean
      sign_off_authority: string[]
      reporting_lines: number
      weight: 0.35
    }

    // Informal influence
    informal: {
      network_centrality: number // 0-1
      opinion_leadership: number
      expertise_recognition: number
      trust_level: number
      relationship_broker: boolean
      information_gatekeeper: boolean
      weight: 0.30
    }

    // Political influence
    political: {
      coalition_building: number
      negotiation_skills: number
      persuasion_ability: number
      conflict_resolution: number
      agenda_setting: boolean
      weight: 0.20
    }

    // Expert influence
    expert: {
      domain_expertise: string[]
      industry_recognition: number
      thought_leadership: number
      technical_credibility: number
      external_reputation: number
      weight: 0.15
    }
  }

  // Network analysis
  network: {
    // Centrality metrics
    centrality: {
      degree_centrality: number // Direct connections
      betweenness_centrality: number // Bridge position
      closeness_centrality: number // Access to others
      eigenvector_centrality: number // Connected to influential people
      page_rank: number // Importance score
    }

    // Relationship mapping
    relationships: {
      internal_connections: Connection[]
      external_connections: Connection[]
      upward_relationships: Relationship[]
      lateral_relationships: Relationship[]
      downward_relationships: Relationship[]
    }

    // Communication patterns
    communication: {
      communication_frequency: Map<string, number>
      information_flow_direction: 'source' | 'sink' | 'broker'
      meeting_participation: MeetingRole[]
      email_cc_frequency: number
      decision_involvement: number
    }
  }

  // Influence dynamics
  dynamics: {
    influence_growth_rate: number
    influence_volatility: number
    seasonal_patterns: Pattern[]
    project_based_influence: ProjectInfluence[]
    situational_influence: Situation[]
  }

  // Predictive modeling
  predictions: {
    future_influence: InfluenceForecast
    promotion_probability: number
    departure_risk: number
    influence_trajectory: Trajectory
    network_evolution: NetworkForecast
  }
}

interface InfluenceMappingVisualization {
  // Visual representations
  visualizations: {
    org_chart_overlay: OrgChartView
    network_graph: NetworkGraph
    influence_heatmap: HeatMap
    power_matrix: PowerMatrix
    stakeholder_grid: StakeholderGrid
  }

  // Interactive features
  interactive: {
    drill_down_capability: DrillDown
    time_series_animation: TimeAnimation
    scenario_modeling: ScenarioTool
    influence_simulator: Simulator
    relationship_explorer: Explorer
  }
}
```

### 4. Role Change Alert System

#### 4.1 Role Monitoring and Intelligence

```typescript
// lib/stakeholder/roles/role-change-monitor.ts
interface RoleChangeMonitor {
  // Detection mechanisms
  detection: {
    // Data sources
    sources: {
      linkedin_monitoring: LinkedInMonitor
      email_signature_tracking: SignatureTracker
      company_website_scanning: WebsiteScanner
      press_release_monitoring: PressMonitor
      org_chart_services: OrgChartAPI[]
      crm_updates: CRMSync
    }

    // Change types
    change_types: {
      promotion: PromotionDetection
      lateral_move: LateralMoveDetection
      departure: DepartureDetection
      new_hire: NewHireDetection
      reorganization: ReorgDetection
      acquisition: AcquisitionDetection
    }

    // Detection confidence
    confidence: {
      confirmation_sources: number
      confidence_score: number
      verification_status: 'confirmed' | 'probable' | 'possible'
      manual_verification_needed: boolean
    }
  }

  // Impact analysis
  impact: {
    // Deal impact
    deal_impact: {
      impact_level: 'critical' | 'high' | 'medium' | 'low'
      deal_stage_affected: DealStage[]
      probability_change: number
      timeline_impact: number // days
      action_required: Action[]
    }

    // Relationship impact
    relationship_impact: {
      champion_status_change: boolean
      influence_network_disruption: number
      knowledge_transfer_risk: boolean
      relationship_continuity_plan: Plan[]
    }

    // Stakeholder dynamics
    dynamics_impact: {
      power_balance_shift: PowerShift
      new_stakeholders_introduced: Stakeholder[]
      coalition_changes: CoalitionChange[]
      decision_process_changes: ProcessChange[]
    }
  }

  // Response orchestration
  response: {
    // Immediate actions
    immediate: {
      notification_dispatch: Notification[]
      task_creation: Task[]
      calendar_updates: CalendarAction[]
      briefing_preparation: Briefing
    }

    // Strategic adjustments
    strategic: {
      relationship_mapping_update: MappingUpdate
      engagement_plan_revision: PlanRevision
      champion_development_adjustment: ChampionAdjustment
      risk_mitigation_activation: RiskMitigation
    }

    // Opportunity identification
    opportunities: {
      new_champion_potential: ChampionOpportunity[]
      expanded_influence: InfluenceOpportunity[]
      accelerated_decision: AccelerationPath[]
      competitive_advantage: CompetitiveEdge[]
    }
  }
}

interface RoleTransitionManagement {
  // Transition tracking
  tracking: {
    transition_timeline: Timeline
    handover_status: HandoverStatus
    knowledge_transfer: KnowledgeTransfer
    relationship_transfer: RelationshipTransfer
  }

  // Continuity planning
  continuity: {
    interim_contacts: Contact[]
    relationship_bridge_strategy: BridgeStrategy
    decision_continuity: DecisionPath
    project_protection: Protection[]
  }

  // New stakeholder onboarding
  onboarding: {
    introduction_strategy: Introduction
    value_prop_customization: ValueProp
    relationship_building_plan: BuildingPlan
    quick_wins_identification: QuickWin[]
  }
}
```

### 5. Engagement Tracking System

#### 5.1 Multi-Channel Engagement Analytics

```typescript
// lib/stakeholder/engagement/engagement-tracking-system.ts
interface EngagementTrackingSystem {
  // Engagement channels
  channels: {
    // Email engagement
    email: {
      opens: EmailOpen[]
      clicks: EmailClick[]
      replies: EmailReply[]
      forwards: EmailForward[]
      unsubscribes: Unsubscribe[]

      metrics: {
        open_rate: number
        click_rate: number
        reply_rate: number
        engagement_score: number
        sentiment_trend: Trend
      }
    }

    // Meeting engagement
    meetings: {
      scheduled: Meeting[]
      attended: Attendance[]
      no_shows: NoShow[]

      participation: {
        speaking_time: number
        questions_asked: number
        engagement_level: number
        follow_up_actions: Action[]
        sentiment: Sentiment
      }
    }

    // Content engagement
    content: {
      downloads: Download[]
      views: PageView[]
      shares: Share[]
      time_spent: TimeMetric[]

      preferences: {
        content_types: ContentType[]
        topics: Topic[]
        formats: Format[]
        consumption_time: TimePattern[]
      }
    }

    // Social engagement
    social: {
      linkedin_interactions: LinkedInMetric[]
      twitter_mentions: TwitterMetric[]
      company_page_visits: Visit[]
      social_shares: SocialShare[]

      influence: {
        reach: number
        engagement_rate: number
        sentiment: number
        amplification: number
      }
    }

    // Platform engagement
    platform: {
      login_frequency: number
      feature_usage: FeatureUsage[]
      session_duration: number
      actions_per_session: number

      behavior: {
        navigation_paths: Path[]
        feature_adoption: Adoption[]
        support_interactions: Support[]
        feedback_provided: Feedback[]
      }
    }
  }

  // Engagement scoring
  scoring: {
    // Composite score
    overall_score: number

    // Dimension scores
    recency_score: number // How recent
    frequency_score: number // How often
    depth_score: number // How deep
    breadth_score: number // How broad
    velocity_score: number // Rate of change

    // Trend analysis
    trend: {
      direction: 'increasing' | 'stable' | 'decreasing'
      momentum: number
      inflection_points: Inflection[]
      seasonality: Season[]
    }
  }

  // Behavioral analytics
  behavioral_analytics: {
    // Patterns
    patterns: {
      engagement_rhythm: Rhythm
      preferred_times: TimeSlot[]
      response_patterns: ResponsePattern[]
      interaction_sequences: Sequence[]
    }

    // Preferences
    preferences: {
      communication_style: Style
      content_preferences: ContentPref[]
      channel_preferences: ChannelPref[]
      interaction_preferences: InteractionPref[]
    }

    // Predictive insights
    predictions: {
      next_best_action: Action
      optimal_contact_time: TimeWindow
      content_recommendations: Content[]
      engagement_forecast: Forecast
      churn_probability: number
    }
  }

  // Engagement optimization
  optimization: {
    // A/B testing
    experiments: {
      message_testing: MessageTest[]
      timing_testing: TimingTest[]
      channel_testing: ChannelTest[]
      content_testing: ContentTest[]
    }

    // Personalization
    personalization: {
      dynamic_content: DynamicContent
      adaptive_messaging: AdaptiveMessage
      behavioral_triggers: Trigger[]
      contextual_relevance: Context[]
    }

    // Automation
    automation: {
      engagement_workflows: Workflow[]
      trigger_campaigns: Campaign[]
      response_automation: AutoResponse[]
      escalation_rules: Escalation[]
    }
  }
}

interface EngagementJourneyMapping {
  // Journey stages
  stages: {
    awareness: AwarenessMetrics
    interest: InterestMetrics
    consideration: ConsiderationMetrics
    intent: IntentMetrics
    evaluation: EvaluationMetrics
    purchase: PurchaseMetrics
    advocacy: AdvocacyMetrics
  }

  // Touchpoint analysis
  touchpoints: {
    touchpoint_map: TouchpointMap
    effectiveness_scoring: EffectivenessScore[]
    attribution_modeling: Attribution
    journey_optimization: Optimization[]
  }

  // Journey analytics
  analytics: {
    conversion_paths: Path[]
    drop_off_points: DropOff[]
    acceleration_opportunities: Acceleration[]
    friction_points: Friction[]
  }
}
```

## Unified Stakeholder Intelligence Platform

### Data Architecture

```typescript
// lib/stakeholder/core/stakeholder-intelligence-platform.ts
interface StakeholderIntelligencePlatform {
  // Data aggregation
  data_layer: {
    // Internal sources
    internal: {
      crm_data: CRMIntegration
      email_system: EmailIntegration
      calendar_system: CalendarIntegration
      communication_tools: CommToolIntegration[]
      collaboration_platforms: CollabIntegration[]
    }

    // External sources
    external: {
      social_media: SocialMediaAPI[]
      professional_networks: ProfessionalAPI[]
      news_sources: NewsAPI[]
      company_databases: CompanyAPI[]
      public_records: PublicRecordAPI[]
    }

    // Behavioral data
    behavioral: {
      digital_footprint: DigitalTracker
      engagement_tracking: EngagementTracker
      interaction_history: InteractionDB
      communication_analysis: CommAnalyzer
    }
  }

  // Intelligence engine
  intelligence: {
    // Relationship mapping
    relationship_mapper: RelationshipMapper
    influence_calculator: InfluenceCalculator
    network_analyzer: NetworkAnalyzer
    org_chart_builder: OrgChartBuilder

    // Behavioral analysis
    behavior_analyzer: BehaviorAnalyzer
    pattern_recognizer: PatternRecognizer
    sentiment_analyzer: SentimentAnalyzer
    personality_profiler: PersonalityProfiler

    // Predictive models
    champion_predictor: ChampionPredictor
    risk_assessor: RiskAssessor
    engagement_forecaster: EngagementForecaster
    role_change_predictor: RoleChangePredictor
  }

  // Action orchestration
  orchestration: {
    alert_system: AlertSystem
    workflow_engine: WorkflowEngine
    task_manager: TaskManager
    campaign_orchestrator: CampaignOrchestrator
    playbook_executor: PlaybookExecutor
  }
}
```

## Database Schema

### Core Stakeholder Tables

```sql
-- Stakeholders master table
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id),

  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  linkedin_url TEXT,

  -- Professional information
  title TEXT,
  department TEXT,
  seniority_level TEXT CHECK (seniority_level IN (
    'c_level', 'vp', 'director', 'manager', 'senior', 'junior', 'entry'
  )),

  -- Role information
  role_type TEXT CHECK (role_type IN (
    'decision_maker', 'influencer', 'evaluator',
    'champion', 'detractor', 'neutral', 'unknown'
  )),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted TIMESTAMPTZ,

  INDEX idx_stakeholders_company (company_id),
  INDEX idx_stakeholders_email (email),
  INDEX idx_stakeholders_role (role_type)
);

-- Champion tracking table
CREATE TABLE champion_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id),

  -- Champion scores
  champion_score INTEGER CHECK (champion_score >= 0 AND champion_score <= 100),
  enthusiasm_level INTEGER,
  influence_level INTEGER,
  advocacy_strength INTEGER,
  reliability_score INTEGER,

  -- Development stage
  development_stage TEXT CHECK (development_stage IN (
    'potential', 'emerging', 'developing', 'established', 'advocate'
  )),

  -- Behavioral metrics
  engagement_frequency DECIMAL(5, 2),
  response_time_hours DECIMAL(5, 2),
  content_sharing_rate DECIMAL(5, 2),
  meeting_participation_rate DECIMAL(5, 2),

  -- Risk factors
  departure_risk DECIMAL(3, 2),
  influence_erosion_risk DECIMAL(3, 2),
  competitor_poaching_risk DECIMAL(3, 2),

  -- Tracking
  identified_date DATE,
  last_evaluated TIMESTAMPTZ,
  next_review_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(stakeholder_id)
);

-- Detractor management table
CREATE TABLE detractor_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id),

  -- Opposition metrics
  opposition_level TEXT CHECK (opposition_level IN (
    'active', 'passive', 'potential'
  )),
  influence_radius INTEGER,
  credibility_score INTEGER,

  -- Opposition reasons
  opposition_reasons JSONB,
  technical_concerns JSONB,
  political_motivations JSONB,

  -- Impact assessment
  deal_risk_level TEXT CHECK (deal_risk_level IN (
    'critical', 'high', 'medium', 'low'
  )),
  veto_power BOOLEAN DEFAULT false,

  -- Mitigation
  mitigation_strategy JSONB,
  mitigation_status TEXT,
  assigned_to UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(stakeholder_id)
);

-- Influence scoring table
CREATE TABLE influence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id),

  -- Influence dimensions
  formal_influence INTEGER,
  informal_influence INTEGER,
  political_influence INTEGER,
  expert_influence INTEGER,
  overall_influence INTEGER,

  -- Network metrics
  network_centrality DECIMAL(3, 2),
  betweenness_centrality DECIMAL(3, 2),
  closeness_centrality DECIMAL(3, 2),
  eigenvector_centrality DECIMAL(3, 2),

  -- Influence factors
  budget_authority BOOLEAN,
  veto_power BOOLEAN,
  team_size INTEGER,
  reporting_lines INTEGER,

  -- Dynamics
  influence_trend TEXT CHECK (influence_trend IN (
    'increasing', 'stable', 'decreasing'
  )),
  influence_volatility DECIMAL(3, 2),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(stakeholder_id),
  INDEX idx_influence_overall (overall_influence DESC)
);

-- Role changes table
CREATE TABLE role_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id),

  -- Change details
  change_type TEXT CHECK (change_type IN (
    'promotion', 'lateral_move', 'departure',
    'new_hire', 'reorganization', 'acquisition'
  )),

  -- Role transition
  previous_title TEXT,
  new_title TEXT,
  previous_department TEXT,
  new_department TEXT,
  previous_company_id UUID,
  new_company_id UUID,

  -- Detection
  detection_source TEXT,
  detection_confidence DECIMAL(3, 2),
  verification_status TEXT CHECK (verification_status IN (
    'confirmed', 'probable', 'possible', 'unverified'
  )),

  -- Impact
  deal_impact_level TEXT,
  required_actions JSONB,

  -- Dates
  change_date DATE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,

  INDEX idx_role_changes_stakeholder (stakeholder_id),
  INDEX idx_role_changes_date (change_date DESC)
);

-- Engagement events table
CREATE TABLE stakeholder_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id),

  -- Engagement type
  channel TEXT CHECK (channel IN (
    'email', 'meeting', 'call', 'social',
    'content', 'event', 'platform'
  )),
  engagement_type TEXT,

  -- Engagement details
  engagement_data JSONB,
  duration_minutes INTEGER,

  -- Outcomes
  sentiment TEXT CHECK (sentiment IN (
    'very_positive', 'positive', 'neutral', 'negative', 'very_negative'
  )),
  engagement_quality INTEGER CHECK (engagement_quality >= 1 AND engagement_quality <= 10),
  follow_up_required BOOLEAN,

  -- Metadata
  engaged_by UUID REFERENCES auth.users(id),
  engagement_date TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_engagement_stakeholder (stakeholder_id),
  INDEX idx_engagement_date (engagement_date DESC),
  INDEX idx_engagement_channel (channel)
);

-- Stakeholder relationships table
CREATE TABLE stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_a_id UUID REFERENCES stakeholders(id),
  stakeholder_b_id UUID REFERENCES stakeholders(id),

  -- Relationship details
  relationship_type TEXT CHECK (relationship_type IN (
    'reports_to', 'peer', 'collaborates_with',
    'influences', 'mentors', 'competes_with'
  )),
  relationship_strength INTEGER CHECK (relationship_strength >= 1 AND relationship_strength <= 10),

  -- Interaction patterns
  interaction_frequency TEXT,
  communication_channels TEXT[],

  -- Influence dynamics
  influence_direction TEXT CHECK (influence_direction IN (
    'a_to_b', 'b_to_a', 'bidirectional', 'none'
  )),
  influence_strength INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(stakeholder_a_id, stakeholder_b_id),
  INDEX idx_relationships_stakeholder_a (stakeholder_a_id),
  INDEX idx_relationships_stakeholder_b (stakeholder_b_id)
);

-- Engagement campaigns table
CREATE TABLE engagement_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT,

  -- Target criteria
  target_segments JSONB,
  target_stakeholders UUID[],

  -- Campaign configuration
  channels TEXT[],
  content_sequence JSONB,
  timing_rules JSONB,
  personalization_rules JSONB,

  -- Status
  status TEXT CHECK (status IN (
    'draft', 'scheduled', 'active', 'paused', 'completed'
  )),

  -- Performance
  engagement_rate DECIMAL(5, 2),
  conversion_rate DECIMAL(5, 2),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
);

-- Stakeholder insights table
CREATE TABLE stakeholder_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id),

  -- AI-generated insights
  personality_profile JSONB,
  communication_preferences JSONB,
  motivation_drivers JSONB,
  decision_making_style JSONB,

  -- Behavioral patterns
  engagement_patterns JSONB,
  response_patterns JSONB,
  content_preferences JSONB,

  -- Predictions
  champion_probability DECIMAL(3, 2),
  engagement_forecast JSONB,
  role_change_probability DECIMAL(3, 2),

  -- Recommendations
  engagement_recommendations JSONB,
  content_recommendations JSONB,
  timing_recommendations JSONB,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  confidence_score DECIMAL(3, 2),

  UNIQUE(stakeholder_id)
);
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- [ ] Design core database schema
- [ ] Build stakeholder data model
- [ ] Create API endpoints for CRUD operations
- [ ] Implement basic contact management
- [ ] Set up data integration framework

### Phase 2: Champion System (Weeks 4-6)
- [ ] Build champion identification algorithm
- [ ] Implement champion scoring model
- [ ] Create cultivation program framework
- [ ] Develop champion dashboard
- [ ] Build empowerment tools

### Phase 3: Detractor Management (Weeks 7-9)
- [ ] Implement detractor detection
- [ ] Build opposition analysis engine
- [ ] Create mitigation strategy system
- [ ] Develop conversion framework
- [ ] Build monitoring dashboard

### Phase 4: Influence Scoring (Weeks 10-12)
- [ ] Implement influence calculation engine
- [ ] Build network analysis algorithms
- [ ] Create organizational mapping
- [ ] Develop influence visualization
- [ ] Implement predictive models

### Phase 5: Role Monitoring (Weeks 13-15)
- [ ] Build role change detection system
- [ ] Integrate LinkedIn monitoring
- [ ] Create impact analysis engine
- [ ] Develop response orchestration
- [ ] Build transition management

### Phase 6: Engagement Tracking (Weeks 16-18)
- [ ] Implement multi-channel tracking
- [ ] Build engagement scoring system
- [ ] Create behavioral analytics
- [ ] Develop journey mapping
- [ ] Build optimization engine

### Phase 7: Intelligence Platform (Weeks 19-21)
- [ ] Integrate all data sources
- [ ] Build unified analytics engine
- [ ] Create ML model training pipeline
- [ ] Develop insight generation
- [ ] Implement recommendation system

### Phase 8: Automation & Orchestration (Weeks 22-24)
- [ ] Build workflow automation
- [ ] Create campaign orchestration
- [ ] Implement alert system
- [ ] Develop playbook execution
- [ ] Build reporting system

## Data Sources and Integrations

### Primary Data Sources

#### Professional Networks
- **LinkedIn Sales Navigator**: Contact info, role changes, connections
- **LinkedIn API**: Profile data, activity monitoring
- **ZoomInfo**: Contact enrichment, org charts
- **Clearbit**: Company and person data
- **Apollo.io**: Contact discovery and enrichment

#### Communication Platforms
- **Email Systems**: Gmail, Outlook, Exchange
- **Calendar Systems**: Google Calendar, Outlook Calendar
- **Meeting Tools**: Zoom, Teams, WebEx
- **Collaboration**: Slack, Teams, Discord

#### CRM and Sales Tools
- **Salesforce**: Contact and opportunity data
- **HubSpot**: Engagement and contact data
- **Pipedrive**: Deal and contact information
- **Microsoft Dynamics**: Customer data
- **Custom CRM**: API integrations

#### External Intelligence
- **News APIs**: Google News, NewsAPI
- **Company Websites**: Web scraping
- **Social Media**: Twitter, Facebook APIs
- **Patent Databases**: USPTO, EPO
- **Court Records**: Public filing systems

## Machine Learning Models

### 1. Champion Identification Model

```python
# ml/models/champion_identifier.py
class ChampionIdentificationModel:
    """
    Identifies and scores potential champions using deep learning
    """

    def __init__(self):
        self.model = self._build_neural_network()
        self.feature_extractor = self._build_feature_extractor()

    def predict_champion_score(self, stakeholder_data):
        features = self.feature_extractor.extract(stakeholder_data)
        score = self.model.predict(features)
        return {
            'champion_probability': score,
            'key_indicators': self._identify_indicators(features),
            'development_stage': self._classify_stage(score),
            'recommended_actions': self._generate_actions(score, features)
        }

    def _build_neural_network(self):
        """Build deep neural network for champion identification"""
        pass
```

### 2. Influence Network Model

```python
# ml/models/influence_network.py
class InfluenceNetworkModel:
    """
    Maps and scores influence networks using graph neural networks
    """

    def __init__(self):
        self.gnn = self._build_graph_network()
        self.embedder = self._build_node_embedder()

    def analyze_influence_network(self, organization_graph):
        embeddings = self.embedder.embed_nodes(organization_graph)
        influence_scores = self.gnn.predict_influence(embeddings)
        return {
            'influence_map': influence_scores,
            'key_influencers': self._identify_key_nodes(influence_scores),
            'influence_paths': self._trace_influence_paths(organization_graph),
            'network_health': self._assess_network_health(influence_scores)
        }
```

### 3. Engagement Prediction Model

```python
# ml/models/engagement_predictor.py
class EngagementPredictionModel:
    """
    Predicts future engagement patterns and optimal strategies
    """

    def __init__(self):
        self.lstm_model = self._build_lstm()
        self.optimizer = self._build_strategy_optimizer()

    def predict_engagement(self, historical_data, stakeholder_profile):
        time_series_features = self._extract_time_series(historical_data)
        static_features = self._extract_static_features(stakeholder_profile)

        engagement_forecast = self.lstm_model.predict(time_series_features)
        optimal_strategy = self.optimizer.optimize(engagement_forecast, static_features)

        return {
            'engagement_trajectory': engagement_forecast,
            'optimal_actions': optimal_strategy,
            'best_contact_times': self._identify_contact_windows(engagement_forecast),
            'content_recommendations': self._recommend_content(stakeholder_profile)
        }
```

## Visualization and Reporting

### Interactive Dashboards

```typescript
// lib/stakeholder/visualization/dashboards.ts
interface StakeholderDashboards {
  // Overview dashboard
  overview: {
    stakeholder_summary: SummaryWidget
    champion_pipeline: PipelineWidget
    influence_map: NetworkWidget
    engagement_trends: TrendWidget
    risk_alerts: AlertWidget
  }

  // Champion dashboard
  champion_view: {
    champion_scorecard: ScorecardWidget
    development_tracker: DevelopmentWidget
    cultivation_programs: ProgramWidget
    success_metrics: MetricsWidget
  }

  // Relationship dashboard
  relationship_view: {
    org_chart: OrgChartWidget
    influence_network: NetworkGraph
    relationship_strength: HeatmapWidget
    communication_flow: FlowWidget
  }

  // Engagement dashboard
  engagement_view: {
    engagement_timeline: TimelineWidget
    channel_performance: ChannelWidget
    content_effectiveness: ContentWidget
    journey_map: JourneyWidget
  }
}
```

## Performance Optimization

### System Requirements

#### Infrastructure
- **Real-time Processing**: Apache Kafka for event streaming
- **Graph Database**: Neo4j for relationship mapping
- **Cache Layer**: Redis for frequently accessed data
- **Search Engine**: Elasticsearch for stakeholder search

#### Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time | < 150ms | < 400ms |
| Dashboard Load | < 1.5s | < 3s |
| Search Results | < 200ms | < 500ms |
| ML Inference | < 100ms | < 300ms |
| Data Sync | < 5 min | < 15 min |

## Success Metrics

### Business KPIs
- **Champion Conversion Rate**: % of identified champions converting
- **Deal Velocity Impact**: Reduction in sales cycle with champion
- **Win Rate Improvement**: % increase in deals with champions
- **Stakeholder Coverage**: % of buying committee identified
- **Engagement Effectiveness**: Response rates and quality scores

### Technical KPIs
- **Data Completeness**: % of stakeholder profiles complete
- **Model Accuracy**: Champion prediction accuracy
- **System Adoption**: % of users actively using features
- **Integration Success**: Data sync success rates
- **Alert Relevance**: % of alerts acted upon

## Cost Analysis

### Development Costs
- **Engineering**: 3 senior engineers × 24 weeks
- **Data Science**: 2 data scientists × 16 weeks
- **Product Management**: 1 PM × 24 weeks
- **UX Design**: 1 designer × 12 weeks

### Operational Costs (Monthly)
- **Data Enrichment APIs**: $3,000/month
- **LinkedIn Sales Navigator**: $800/month
- **Infrastructure**: $2,500/month
- **ML Computing**: $1,200/month
- **Total**: ~$7,500/month

## Conclusion

This comprehensive Stakeholder Tracking system will revolutionize B2B relationship management by providing:

1. **Deep Stakeholder Intelligence**: Complete visibility into buying committees
2. **Champion Development**: Systematic cultivation of internal advocates
3. **Risk Mitigation**: Early detection and management of detractors
4. **Influence Mapping**: Understanding of organizational dynamics
5. **Predictive Engagement**: AI-powered relationship optimization

The system's combination of behavioral analytics, machine learning, and relationship science will dramatically improve win rates and accelerate sales cycles through precision stakeholder engagement.