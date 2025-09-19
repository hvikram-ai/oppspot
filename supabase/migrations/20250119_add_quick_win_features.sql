-- Migration: Add Quick Win Features (BANT, Funding Detection, Stakeholders, Benchmarks)
-- Description: Implements foundation for BANT scoring, funding signals, stakeholder management, and benchmarking
-- Author: Claude Code AI Assistant
-- Date: 2025-01-19

-- ============================================
-- 1. BANT SCORING ENHANCEMENT
-- ============================================

-- Add BANT fields to existing lead_scores table
ALTER TABLE lead_scores
ADD COLUMN IF NOT EXISTS bant_budget_score INTEGER DEFAULT 0 CHECK (bant_budget_score >= 0 AND bant_budget_score <= 100),
ADD COLUMN IF NOT EXISTS bant_authority_score INTEGER DEFAULT 0 CHECK (bant_authority_score >= 0 AND bant_authority_score <= 100),
ADD COLUMN IF NOT EXISTS bant_need_score INTEGER DEFAULT 0 CHECK (bant_need_score >= 0 AND bant_need_score <= 100),
ADD COLUMN IF NOT EXISTS bant_timeline_score INTEGER DEFAULT 0 CHECK (bant_timeline_score >= 0 AND bant_timeline_score <= 100),
ADD COLUMN IF NOT EXISTS bant_overall_score INTEGER DEFAULT 0 CHECK (bant_overall_score >= 0 AND bant_overall_score <= 100),
ADD COLUMN IF NOT EXISTS bant_qualification_status TEXT CHECK (bant_qualification_status IN ('highly_qualified', 'qualified', 'nurture', 'disqualified')),
ADD COLUMN IF NOT EXISTS bant_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bant_last_calculated TIMESTAMPTZ;

-- Create index for BANT qualification status
CREATE INDEX IF NOT EXISTS idx_lead_scores_bant_status ON lead_scores(bant_qualification_status) WHERE bant_qualification_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_scores_bant_overall ON lead_scores(bant_overall_score DESC) WHERE bant_overall_score > 0;

-- ============================================
-- 2. STAKEHOLDER MANAGEMENT
-- ============================================

-- Create stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Personal information
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    CASE
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
      WHEN first_name IS NOT NULL THEN first_name
      WHEN last_name IS NOT NULL THEN last_name
      ELSE NULL
    END
  ) STORED,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,

  -- Professional information
  title TEXT,
  department TEXT,
  seniority_level TEXT CHECK (seniority_level IN (
    'c_level', 'vp', 'director', 'manager', 'senior', 'junior', 'entry', 'unknown'
  )),

  -- BANT role information
  is_decision_maker BOOLEAN DEFAULT false,
  has_budget_authority BOOLEAN DEFAULT false,
  is_end_user BOOLEAN DEFAULT false,
  is_influencer BOOLEAN DEFAULT false,
  is_champion BOOLEAN DEFAULT false,

  -- Engagement tracking
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  last_contacted TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(company_id, email),
  INDEX idx_stakeholders_company (company_id),
  INDEX idx_stakeholders_email (email),
  INDEX idx_stakeholders_decision_maker (is_decision_maker) WHERE is_decision_maker = true,
  INDEX idx_stakeholders_champion (is_champion) WHERE is_champion = true
);

-- Create stakeholder engagement events table
CREATE TABLE IF NOT EXISTS stakeholder_engagement_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'email_sent', 'email_opened', 'email_clicked', 'email_replied',
    'meeting_scheduled', 'meeting_attended', 'meeting_no_show',
    'call_completed', 'call_attempted',
    'demo_scheduled', 'demo_attended',
    'document_shared', 'document_viewed'
  )),

  -- Event data
  event_data JSONB DEFAULT '{}',
  engagement_quality TEXT CHECK (engagement_quality IN ('positive', 'neutral', 'negative')),
  notes TEXT,

  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_stakeholder_engagement_stakeholder (stakeholder_id),
  INDEX idx_stakeholder_engagement_type (event_type),
  INDEX idx_stakeholder_engagement_created (created_at DESC)
);

-- ============================================
-- 3. FUNDING SIGNALS DETECTION
-- ============================================

-- Create funding signals table
CREATE TABLE IF NOT EXISTS funding_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  company_number TEXT,
  company_name TEXT NOT NULL,

  -- Funding details
  round_type TEXT CHECK (round_type IN (
    'pre_seed', 'seed', 'series_a', 'series_b', 'series_c',
    'series_d_plus', 'ipo', 'debt', 'grant', 'crowdfunding', 'other'
  )),
  amount DECIMAL(15, 2),
  currency TEXT DEFAULT 'GBP',
  valuation DECIMAL(15, 2),

  -- Investors
  investors JSONB DEFAULT '[]', -- Array of investor objects
  lead_investor TEXT,

  -- Dates
  announcement_date DATE,
  close_date DATE,

  -- Source and verification
  source TEXT NOT NULL, -- 'news_api', 'manual', 'crunchbase', etc.
  source_url TEXT,
  confidence_score DECIMAL(3, 2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  verified BOOLEAN DEFAULT false,

  -- Impact analysis
  budget_impact_score INTEGER DEFAULT 50 CHECK (budget_impact_score >= 0 AND budget_impact_score <= 100),
  purchase_likelihood_increase INTEGER DEFAULT 0,

  -- Metadata
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_for_scoring BOOLEAN DEFAULT false,

  -- Indexes
  INDEX idx_funding_signals_company (company_id),
  INDEX idx_funding_signals_date (announcement_date DESC),
  INDEX idx_funding_signals_processed (processed_for_scoring) WHERE processed_for_scoring = false,
  UNIQUE(company_id, announcement_date, round_type)
);

-- ============================================
-- 4. INDUSTRY BENCHMARKS
-- ============================================

-- Create industry benchmarks table
CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Industry identification
  industry_code TEXT NOT NULL, -- SIC code or custom code
  industry_name TEXT NOT NULL,

  -- Metric definition
  metric_name TEXT NOT NULL,
  metric_category TEXT CHECK (metric_category IN (
    'financial', 'operational', 'growth', 'efficiency', 'engagement', 'other'
  )),

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Statistical values
  sample_size INTEGER,
  mean_value DECIMAL(15, 4),
  median_value DECIMAL(15, 4),
  min_value DECIMAL(15, 4),
  max_value DECIMAL(15, 4),
  std_deviation DECIMAL(15, 4),

  -- Percentiles
  p10_value DECIMAL(15, 4),
  p25_value DECIMAL(15, 4),
  p75_value DECIMAL(15, 4),
  p90_value DECIMAL(15, 4),

  -- Metadata
  data_source TEXT,
  calculation_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(industry_code, metric_name, period_start, period_end),
  INDEX idx_benchmarks_industry (industry_code),
  INDEX idx_benchmarks_metric (metric_name),
  INDEX idx_benchmarks_period (period_end DESC)
);

-- Create company benchmark comparisons table
CREATE TABLE IF NOT EXISTS company_benchmark_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Comparison details
  comparison_date DATE DEFAULT CURRENT_DATE,
  industry_code TEXT,

  -- Comparison results (JSONB for flexibility)
  metrics JSONB NOT NULL DEFAULT '{}', -- {metric_name: {value, percentile, vs_median, vs_mean}}

  -- Overall scores
  overall_percentile INTEGER CHECK (overall_percentile >= 0 AND overall_percentile <= 100),
  performance_rating TEXT CHECK (performance_rating IN (
    'top_performer', 'above_average', 'average', 'below_average', 'needs_improvement'
  )),

  -- Key insights
  strengths TEXT[],
  weaknesses TEXT[],
  opportunities TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(company_id, comparison_date),
  INDEX idx_company_benchmarks_company (company_id),
  INDEX idx_company_benchmarks_date (comparison_date DESC)
);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to calculate BANT qualification status
CREATE OR REPLACE FUNCTION calculate_bant_qualification(
  budget_score INTEGER,
  authority_score INTEGER,
  need_score INTEGER,
  timeline_score INTEGER
) RETURNS TEXT AS $$
DECLARE
  avg_score INTEGER;
BEGIN
  avg_score := (budget_score + authority_score + need_score + timeline_score) / 4;

  -- All factors must be present for high qualification
  IF budget_score >= 70 AND authority_score >= 70 AND need_score >= 70 AND timeline_score >= 70 THEN
    RETURN 'highly_qualified';
  ELSIF avg_score >= 60 AND budget_score >= 50 AND authority_score >= 50 THEN
    RETURN 'qualified';
  ELSIF avg_score >= 40 OR (need_score >= 60 AND (budget_score >= 40 OR authority_score >= 40)) THEN
    RETURN 'nurture';
  ELSE
    RETURN 'disqualified';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update stakeholder engagement score
CREATE OR REPLACE FUNCTION update_stakeholder_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
  eng_score INTEGER;
  event_count INTEGER;
  recent_events INTEGER;
  positive_events INTEGER;
BEGIN
  -- Count total events and recent events (last 30 days)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
    COUNT(*) FILTER (WHERE engagement_quality = 'positive')
  INTO event_count, recent_events, positive_events
  FROM stakeholder_engagement_events
  WHERE stakeholder_id = NEW.stakeholder_id;

  -- Calculate engagement score (simple formula, can be enhanced)
  eng_score := LEAST(100,
    (event_count * 2) +
    (recent_events * 5) +
    (positive_events * 10)
  );

  -- Update stakeholder record
  UPDATE stakeholders
  SET
    engagement_score = eng_score,
    contact_count = event_count,
    last_contacted = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.stakeholder_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stakeholder engagement score update
DROP TRIGGER IF EXISTS update_stakeholder_engagement ON stakeholder_engagement_events;
CREATE TRIGGER update_stakeholder_engagement
  AFTER INSERT ON stakeholder_engagement_events
  FOR EACH ROW
  EXECUTE FUNCTION update_stakeholder_engagement_score();

-- ============================================
-- 6. SAMPLE DATA FOR BENCHMARKS
-- ============================================

-- Insert sample industry benchmarks for SaaS companies
INSERT INTO industry_benchmarks (
  industry_code, industry_name, metric_name, metric_category,
  period_start, period_end,
  sample_size, mean_value, median_value, min_value, max_value, std_deviation,
  p10_value, p25_value, p75_value, p90_value,
  data_source
) VALUES
  ('62020', 'Computer consultancy activities', 'revenue_growth_rate', 'growth',
   '2024-01-01', '2024-12-31',
   500, 25.5, 22.0, -10.0, 150.0, 18.5,
   5.0, 15.0, 35.0, 55.0,
   'Industry Analysis'),

  ('62020', 'Computer consultancy activities', 'revenue_per_employee', 'efficiency',
   '2024-01-01', '2024-12-31',
   500, 125000, 110000, 50000, 500000, 45000,
   75000, 95000, 145000, 185000,
   'Industry Analysis'),

  ('62020', 'Computer consultancy activities', 'customer_acquisition_cost', 'financial',
   '2024-01-01', '2024-12-31',
   300, 5000, 3500, 500, 50000, 4500,
   1500, 2500, 6500, 12000,
   'Industry Analysis'),

  ('62020', 'Computer consultancy activities', 'gross_margin', 'financial',
   '2024-01-01', '2024-12-31',
   500, 72.5, 75.0, 40.0, 95.0, 12.0,
   55.0, 65.0, 82.0, 88.0,
   'Industry Analysis')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON stakeholders TO authenticated;
GRANT SELECT, INSERT ON stakeholder_engagement_events TO authenticated;
GRANT SELECT ON funding_signals TO authenticated;
GRANT SELECT ON industry_benchmarks TO authenticated;
GRANT SELECT ON company_benchmark_comparisons TO authenticated;

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_benchmark_comparisons ENABLE ROW LEVEL SECURITY;

-- Stakeholders policies
CREATE POLICY "Users can view stakeholders in their organization"
  ON stakeholders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN businesses b ON b.id = stakeholders.company_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage stakeholders"
  ON stakeholders FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Funding signals policy (read-only for all authenticated users)
CREATE POLICY "Users can view funding signals"
  ON funding_signals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Benchmark comparisons policy
CREATE POLICY "Users can view their benchmark comparisons"
  ON company_benchmark_comparisons FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================

-- Additional indexes for query performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_full_name ON stakeholders(full_name) WHERE full_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_engagement_score ON stakeholders(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_funding_signals_amount ON funding_signals(amount DESC) WHERE amount IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_metric ON industry_benchmarks(industry_code, metric_name);