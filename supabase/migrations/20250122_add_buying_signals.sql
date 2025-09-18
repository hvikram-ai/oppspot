-- Buying Signals Detection System Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============= Signal Types and Categories =============

-- Master buying signals table
CREATE TABLE IF NOT EXISTS buying_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES lead_scores(id),
    org_id UUID,

    -- Signal classification
    signal_type TEXT NOT NULL CHECK (signal_type IN (
        'funding_round', 'executive_change', 'job_posting', 'technology_adoption',
        'expansion', 'merger_acquisition', 'partnership', 'product_launch',
        'regulatory_change', 'competitive_move', 'market_entry', 'restructuring'
    )),
    signal_category TEXT CHECK (signal_category IN (
        'financial', 'organizational', 'growth', 'technology', 'strategic', 'operational'
    )),
    signal_strength TEXT CHECK (signal_strength IN (
        'very_strong', 'strong', 'moderate', 'weak'
    )),

    -- Core signal data
    signal_data JSONB NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    buying_probability INTEGER CHECK (buying_probability >= 0 AND buying_probability <= 100),

    -- Timing
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    signal_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,

    -- Source tracking
    source TEXT,
    source_url TEXT,
    source_reliability TEXT CHECK (source_reliability IN ('verified', 'high', 'medium', 'low')),

    -- Processing status
    status TEXT DEFAULT 'detected' CHECK (status IN (
        'detected', 'verified', 'processing', 'actioned', 'expired', 'false_positive'
    )),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),

    -- Impact and recommendations
    impact_assessment JSONB,
    recommended_actions JSONB,
    engagement_window JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    notes TEXT
);

-- Funding signals specific table
CREATE TABLE IF NOT EXISTS funding_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

    -- Funding details
    round_type TEXT CHECK (round_type IN (
        'seed', 'series_a', 'series_b', 'series_c', 'series_d_plus',
        'ipo', 'debt', 'grant', 'crowdfunding', 'other'
    )),
    amount DECIMAL(15, 2),
    currency TEXT DEFAULT 'USD',
    valuation DECIMAL(15, 2),

    -- Investors
    investors JSONB, -- Array of investor objects
    lead_investor JSONB,
    investor_count INTEGER,

    -- Dates
    announcement_date DATE,
    close_date DATE,

    -- Context
    previous_rounds JSONB,
    total_raised DECIMAL(15, 2),
    burn_rate_estimate DECIMAL(12, 2),
    runway_months INTEGER,
    growth_stage TEXT CHECK (growth_stage IN ('early', 'growth', 'expansion', 'mature')),

    -- Insights
    budget_availability JSONB,
    expansion_plans TEXT[],
    investment_focus TEXT[],
    hiring_intentions BOOLEAN,
    technology_upgrade_likely BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executive change signals
CREATE TABLE IF NOT EXISTS executive_change_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

    -- Position details
    position_title TEXT NOT NULL,
    position_level TEXT CHECK (position_level IN ('c_suite', 'vp', 'director', 'manager')),
    department TEXT,

    -- Executive information
    incoming_executive JSONB,
    outgoing_executive JSONB,

    -- Change details
    change_type TEXT CHECK (change_type IN (
        'new_hire', 'promotion', 'departure', 'reorganization', 'lateral_move'
    )),
    effective_date DATE,
    announcement_date DATE,

    -- Impact assessment
    decision_making_impact TEXT CHECK (decision_making_impact IN ('high', 'medium', 'low')),
    budget_authority BOOLEAN,
    likely_initiatives JSONB,
    vendor_preferences JSONB,
    technology_bias JSONB,

    -- Background intelligence
    previous_companies JSONB,
    previous_vendors_used JSONB,
    known_methodologies TEXT[],

    -- Opportunity scoring
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
    timing_score INTEGER CHECK (timing_score >= 0 AND timing_score <= 100),
    influence_score INTEGER CHECK (influence_score >= 0 AND influence_score <= 100),
    accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job posting signals
CREATE TABLE IF NOT EXISTS job_posting_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

    -- Job details
    job_title TEXT NOT NULL,
    department TEXT,
    level TEXT,
    location TEXT,
    remote_options TEXT CHECK (remote_options IN ('remote', 'hybrid', 'onsite')),

    -- Posting metadata
    posted_date DATE,
    closing_date DATE,
    job_url TEXT,
    salary_range JSONB,

    -- Requirements analysis
    required_skills TEXT[],
    preferred_skills TEXT[],
    technologies_mentioned TEXT[],
    certifications TEXT[],
    experience_years INTEGER,

    -- Volume metrics
    total_open_positions INTEGER,
    department_distribution JSONB,
    posting_velocity DECIMAL(5, 2), -- posts per month
    growth_rate DECIMAL(5, 2), -- percentage

    -- Technology signals
    new_technologies TEXT[],
    deprecated_technologies TEXT[],
    technology_stack JSONB,
    integration_needs TEXT[],

    -- Buying indicators
    budget_allocation_likely BOOLEAN,
    procurement_timeline JSONB,
    solution_categories TEXT[],
    pain_points TEXT[],
    decision_makers_hiring BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technology adoption signals
CREATE TABLE IF NOT EXISTS technology_adoption_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

    -- Technology details
    technology_name TEXT NOT NULL,
    technology_category TEXT,
    vendor TEXT,

    -- Adoption type
    adoption_type TEXT CHECK (adoption_type IN (
        'new_implementation', 'replacement', 'upgrade', 'expansion', 'pilot', 'deprecation'
    )),
    adoption_stage TEXT CHECK (adoption_stage IN (
        'evaluation', 'pilot', 'implementation', 'rollout', 'production', 'sunsetting'
    )),

    -- Detection method
    detection_method TEXT CHECK (detection_method IN (
        'dns_record', 'job_posting', 'press_release', 'case_study', 'website_scan',
        'social_media', 'conference', 'partner_announcement'
    )),
    detection_confidence INTEGER CHECK (detection_confidence >= 0 AND detection_confidence <= 100),

    -- Impact analysis
    estimated_users INTEGER,
    deployment_scope TEXT CHECK (deployment_scope IN ('company_wide', 'department', 'team', 'pilot')),
    integration_complexity TEXT CHECK (integration_complexity IN ('high', 'medium', 'low')),

    -- Related technologies
    replaced_technology TEXT,
    complementary_technologies TEXT[],
    integration_requirements TEXT[],

    -- Opportunity analysis
    cross_sell_opportunities TEXT[],
    competitive_displacement BOOLEAN,
    expansion_potential TEXT CHECK (expansion_potential IN ('high', 'medium', 'low')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal aggregation and scoring
CREATE TABLE IF NOT EXISTS signal_aggregations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES lead_scores(id),

    -- Aggregate scores
    total_signals INTEGER DEFAULT 0,
    composite_score INTEGER CHECK (composite_score >= 0 AND composite_score <= 100),
    intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
    timing_score INTEGER CHECK (timing_score >= 0 AND timing_score <= 100),
    fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),

    -- Signal counts by type
    funding_signals_count INTEGER DEFAULT 0,
    executive_signals_count INTEGER DEFAULT 0,
    job_signals_count INTEGER DEFAULT 0,
    technology_signals_count INTEGER DEFAULT 0,
    other_signals_count INTEGER DEFAULT 0,

    -- Signal strength distribution
    very_strong_signals INTEGER DEFAULT 0,
    strong_signals INTEGER DEFAULT 0,
    moderate_signals INTEGER DEFAULT 0,
    weak_signals INTEGER DEFAULT 0,

    -- Time-based metrics
    most_recent_signal TIMESTAMPTZ,
    signal_velocity DECIMAL(5, 2), -- signals per month
    signal_acceleration DECIMAL(5, 2), -- change in velocity

    -- Recommendations
    engagement_priority TEXT CHECK (engagement_priority IN ('immediate', 'high', 'medium', 'low', 'monitor')),
    recommended_approach TEXT,
    key_talking_points TEXT[],
    optimal_contact_date DATE,

    -- Analysis timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal actions and responses
CREATE TABLE IF NOT EXISTS signal_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
    company_id UUID REFERENCES businesses(id),

    -- Action details
    action_type TEXT CHECK (action_type IN (
        'email_sent', 'call_made', 'meeting_scheduled', 'proposal_sent',
        'alert_sent', 'task_created', 'opportunity_created', 'campaign_enrolled'
    )),
    action_status TEXT CHECK (action_status IN (
        'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    )),

    -- Execution details
    executed_at TIMESTAMPTZ,
    executed_by UUID REFERENCES auth.users(id),
    automation_id UUID,

    -- Response tracking
    response_received BOOLEAN DEFAULT FALSE,
    response_type TEXT,
    response_data JSONB,

    -- Outcome
    outcome TEXT CHECK (outcome IN (
        'positive', 'neutral', 'negative', 'no_response', 'pending'
    )),
    outcome_details TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal alert configurations
CREATE TABLE IF NOT EXISTS signal_alert_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID,
    user_id UUID REFERENCES auth.users(id),

    -- Alert configuration
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Signal filters
    signal_types TEXT[],
    signal_categories TEXT[],
    minimum_strength TEXT,
    minimum_confidence INTEGER,
    minimum_buying_probability INTEGER,

    -- Company filters
    company_filters JSONB,
    industry_filters TEXT[],
    size_filters JSONB,
    location_filters JSONB,

    -- Alert delivery
    alert_channels TEXT[] DEFAULT ARRAY['in_app'],
    email_enabled BOOLEAN DEFAULT false,
    slack_enabled BOOLEAN DEFAULT false,
    webhook_url TEXT,

    -- Timing
    real_time BOOLEAN DEFAULT false,
    batch_frequency TEXT CHECK (batch_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    quiet_hours JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_buying_signals_company ON buying_signals(company_id);
CREATE INDEX idx_buying_signals_type ON buying_signals(signal_type);
CREATE INDEX idx_buying_signals_detected ON buying_signals(detected_at);
CREATE INDEX idx_buying_signals_status ON buying_signals(status);
CREATE INDEX idx_buying_signals_strength ON buying_signals(signal_strength);

CREATE INDEX idx_funding_signals_company ON funding_signals(company_id);
CREATE INDEX idx_funding_signals_amount ON funding_signals(amount);
CREATE INDEX idx_funding_signals_round ON funding_signals(round_type);

CREATE INDEX idx_executive_signals_company ON executive_change_signals(company_id);
CREATE INDEX idx_executive_signals_level ON executive_change_signals(position_level);
CREATE INDEX idx_executive_signals_department ON executive_change_signals(department);

CREATE INDEX idx_job_signals_company ON job_posting_signals(company_id);
CREATE INDEX idx_job_signals_department ON job_posting_signals(department);
CREATE INDEX idx_job_signals_posted ON job_posting_signals(posted_date);

CREATE INDEX idx_tech_signals_company ON technology_adoption_signals(company_id);
CREATE INDEX idx_tech_signals_category ON technology_adoption_signals(technology_category);
CREATE INDEX idx_tech_signals_vendor ON technology_adoption_signals(vendor);

CREATE INDEX idx_signal_aggregations_company ON signal_aggregations(company_id);
CREATE INDEX idx_signal_aggregations_score ON signal_aggregations(composite_score);
CREATE INDEX idx_signal_aggregations_priority ON signal_aggregations(engagement_priority);

-- Row-level security policies
ALTER TABLE buying_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_change_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posting_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE technology_adoption_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_alert_configs ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_buying_signals_updated_at BEFORE UPDATE ON buying_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funding_signals_updated_at BEFORE UPDATE ON funding_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_executive_signals_updated_at BEFORE UPDATE ON executive_change_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_signals_updated_at BEFORE UPDATE ON job_posting_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tech_signals_updated_at BEFORE UPDATE ON technology_adoption_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signal_aggregations_updated_at BEFORE UPDATE ON signal_aggregations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();