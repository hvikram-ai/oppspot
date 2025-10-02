-- ICP Learning Engine
-- Created: 2025-10-02
-- Purpose: Auto-refining Ideal Customer Profile based on closed deals

-- ============================================================================
-- ICP Profiles Table (Versioned)
-- ============================================================================
CREATE TABLE IF NOT EXISTS icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false, -- Only one active per org

  -- Core ICP Criteria (Learned)
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example structure:
  -- {
  --   "industries": ["62012", "62020"],
  --   "employee_range": { "min": 50, "max": 500 },
  --   "revenue_range": { "min": 1000000, "max": 50000000 },
  --   "locations": ["London", "Manchester"],
  --   "tech_stack": ["React", "AWS"],
  --   "growth_indicators": ["hiring", "funding"],
  --   "company_age": { "min": 2, "max": 10 }
  -- }

  -- Confidence Scores (0-100)
  confidence_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: { "industries": 95, "employee_range": 80, "revenue_range": 70 }

  -- Performance Metrics
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {
  --   "total_matches": 1000,
  --   "won_deals": 15,
  --   "lost_deals": 5,
  --   "open_deals": 30,
  --   "win_rate": 0.75,
  --   "avg_deal_size": 50000,
  --   "avg_sales_cycle_days": 45
  -- }

  -- Learning Source
  learned_from JSONB DEFAULT '[]'::jsonb, -- Array of deal IDs
  training_data_count INTEGER DEFAULT 0,
  last_trained_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Deal Outcomes Table (For Learning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Deal Information
  deal_name TEXT NOT NULL,
  deal_value DECIMAL(15, 2),
  deal_stage TEXT NOT NULL CHECK (deal_stage IN (
    'prospecting',
    'qualification',
    'proposal',
    'negotiation',
    'closed_won',
    'closed_lost'
  )),

  -- Outcome (For Learning)
  outcome TEXT CHECK (outcome IN ('won', 'lost', 'open')),
  outcome_reason TEXT, -- Why won/lost
  outcome_date TIMESTAMPTZ,

  -- Sales Cycle Metrics
  first_contact_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  sales_cycle_days INTEGER,

  -- Company Snapshot at Deal Time (For Pattern Recognition)
  company_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {
  --   "industry": "62012",
  --   "employee_count": 150,
  --   "revenue": 5000000,
  --   "location": "London",
  --   "tech_stack": ["React", "AWS"],
  --   "funding_stage": "Series A",
  --   "growth_rate": 0.25,
  --   "buying_signals": ["hiring", "job_posting"]
  -- }

  -- Attribution
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ICP Evolution History
-- ============================================================================
CREATE TABLE IF NOT EXISTS icp_evolution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  icp_profile_id UUID REFERENCES icp_profiles(id) ON DELETE CASCADE,

  -- What Changed
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created',
    'criteria_updated',
    'confidence_adjusted',
    'metrics_refreshed',
    'activated',
    'deactivated'
  )),

  -- Before/After
  before_data JSONB,
  after_data JSONB,

  -- Why Changed (Trigger)
  trigger_type TEXT, -- 'manual', 'auto_learning', 'deal_outcome', 'performance_threshold'
  trigger_data JSONB,

  -- Insights
  insights TEXT[], -- Human-readable insights from this change

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ICP Match Scores (Cached)
-- ============================================================================
CREATE TABLE IF NOT EXISTS icp_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  icp_profile_id UUID REFERENCES icp_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Match Score
  overall_score FLOAT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Component Scores
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "industry": 95, "size": 80, "location": 70, "tech": 60 }

  -- Match Reasoning
  match_reasons TEXT[],
  mismatch_reasons TEXT[],

  -- Calculated
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Cache expiry (e.g., 24 hours)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one score per company per ICP
  UNIQUE(icp_profile_id, company_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- ICP Profiles
CREATE INDEX IF NOT EXISTS idx_icp_profiles_org_id ON icp_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_icp_profiles_is_active ON icp_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_icp_profiles_version ON icp_profiles(org_id, version DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_icp_profiles_active_per_org
  ON icp_profiles(org_id) WHERE is_active = true;

-- Deal Outcomes
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_org_id ON deal_outcomes(org_id);
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_company_id ON deal_outcomes(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_outcome ON deal_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_stage ON deal_outcomes(deal_stage);
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_outcome_date ON deal_outcomes(outcome_date DESC);

-- ICP Evolution Log
CREATE INDEX IF NOT EXISTS idx_icp_evolution_org_id ON icp_evolution_log(org_id);
CREATE INDEX IF NOT EXISTS idx_icp_evolution_icp_id ON icp_evolution_log(icp_profile_id);
CREATE INDEX IF NOT EXISTS idx_icp_evolution_created_at ON icp_evolution_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_icp_evolution_change_type ON icp_evolution_log(change_type);

-- ICP Match Scores
CREATE INDEX IF NOT EXISTS idx_icp_match_scores_icp_id ON icp_match_scores(icp_profile_id);
CREATE INDEX IF NOT EXISTS idx_icp_match_scores_company_id ON icp_match_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_icp_match_scores_score ON icp_match_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_icp_match_scores_expires ON icp_match_scores(expires_at);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_evolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_match_scores ENABLE ROW LEVEL SECURITY;

-- ICP Profiles policies
CREATE POLICY "Users can view their org's ICP profiles"
  ON icp_profiles FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create ICP profiles for their org"
  ON icp_profiles FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's ICP profiles"
  ON icp_profiles FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's ICP profiles"
  ON icp_profiles FOR DELETE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Deal Outcomes policies
CREATE POLICY "Users can view their org's deal outcomes"
  ON deal_outcomes FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create deal outcomes for their org"
  ON deal_outcomes FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's deal outcomes"
  ON deal_outcomes FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ICP Evolution Log policies
CREATE POLICY "Users can view their org's ICP evolution"
  ON icp_evolution_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ICP Match Scores policies
CREATE POLICY "Users can view their org's match scores"
  ON icp_match_scores FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_icp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_icp_profiles
  BEFORE UPDATE ON icp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_icp_updated_at();

CREATE TRIGGER set_updated_at_deal_outcomes
  BEFORE UPDATE ON deal_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_icp_updated_at();

-- Function to ensure only one active ICP per org
CREATE OR REPLACE FUNCTION ensure_single_active_icp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other ICPs for this org
    UPDATE icp_profiles
    SET is_active = false
    WHERE org_id = NEW.org_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_icp_trigger
  BEFORE INSERT OR UPDATE ON icp_profiles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_icp();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE icp_profiles IS 'Versioned Ideal Customer Profiles that learn from deal outcomes';
COMMENT ON TABLE deal_outcomes IS 'Historical deal outcomes used to train ICP learning engine';
COMMENT ON TABLE icp_evolution_log IS 'Audit log of ICP changes over time';
COMMENT ON TABLE icp_match_scores IS 'Cached ICP match scores for companies';

COMMENT ON COLUMN icp_profiles.criteria IS 'JSON object containing learned ICP criteria';
COMMENT ON COLUMN icp_profiles.confidence_scores IS 'Confidence level (0-100) for each criteria';
COMMENT ON COLUMN deal_outcomes.company_snapshot IS 'Company attributes at time of deal for pattern recognition';
COMMENT ON COLUMN icp_match_scores.overall_score IS 'Overall ICP match score (0-100)';
