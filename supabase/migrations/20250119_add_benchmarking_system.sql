-- ============================================
-- Benchmarking System Database Schema
-- ============================================
-- Comprehensive benchmarking tables for industry comparison,
-- peer analysis, and performance metrics
-- Author: oppSpot Engineering
-- Date: 2025-01-19
-- ============================================

-- ============================================
-- 1. Company Metrics Table
-- ============================================
-- Stores time-series financial and operational metrics for companies

CREATE TABLE IF NOT EXISTS company_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,

  -- Financial metrics (in GBP)
  revenue DECIMAL(15, 2),
  gross_profit DECIMAL(15, 2),
  operating_profit DECIMAL(15, 2),
  net_profit DECIMAL(15, 2),
  ebitda DECIMAL(15, 2),
  total_assets DECIMAL(15, 2),
  total_liabilities DECIMAL(15, 2),
  shareholders_equity DECIMAL(15, 2),
  cash_flow DECIMAL(15, 2),
  working_capital DECIMAL(15, 2),

  -- Operational metrics
  employee_count INTEGER,
  customer_count INTEGER,
  transaction_volume INTEGER,

  -- Efficiency metrics (calculated)
  revenue_per_employee DECIMAL(15, 2),
  profit_margin DECIMAL(5, 2), -- percentage
  gross_margin DECIMAL(5, 2), -- percentage
  operating_margin DECIMAL(5, 2), -- percentage
  asset_turnover DECIMAL(5, 2),
  current_ratio DECIMAL(5, 2),
  quick_ratio DECIMAL(5, 2),
  debt_to_equity DECIMAL(5, 2),
  return_on_assets DECIMAL(5, 2), -- percentage
  return_on_equity DECIMAL(5, 2), -- percentage

  -- Growth metrics
  revenue_growth_yoy DECIMAL(5, 2), -- percentage
  revenue_growth_qoq DECIMAL(5, 2), -- percentage
  customer_growth_yoy DECIMAL(5, 2), -- percentage
  employee_growth_yoy DECIMAL(5, 2), -- percentage

  -- Data source and quality
  data_source TEXT, -- 'companies_house', 'manual', 'api', etc.
  data_quality_score DECIMAL(3, 2), -- 0 to 1

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one metric per company per date
  UNIQUE(company_id, metric_date)
);

-- Indexes for company metrics
CREATE INDEX idx_company_metrics_company ON company_metrics(company_id);
CREATE INDEX idx_company_metrics_date ON company_metrics(metric_date DESC);
CREATE INDEX idx_company_metrics_company_date ON company_metrics(company_id, metric_date DESC);

-- ============================================
-- 2. Industry Benchmarks Table
-- ============================================
-- Stores aggregated industry statistics for benchmarking

CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code TEXT NOT NULL, -- SIC code or custom industry classification
  industry_name TEXT,
  metric_name TEXT NOT NULL,
  metric_date DATE NOT NULL,

  -- Statistical values
  mean_value DECIMAL(15, 4),
  median_value DECIMAL(15, 4),
  min_value DECIMAL(15, 4),
  max_value DECIMAL(15, 4),
  std_deviation DECIMAL(15, 4),

  -- Percentiles
  p10_value DECIMAL(15, 4), -- 10th percentile
  p25_value DECIMAL(15, 4), -- 25th percentile (Q1)
  p75_value DECIMAL(15, 4), -- 75th percentile (Q3)
  p90_value DECIMAL(15, 4), -- 90th percentile
  p95_value DECIMAL(15, 4), -- 95th percentile

  -- Sample information
  sample_size INTEGER,
  company_size_category TEXT, -- 'all', 'micro', 'small', 'medium', 'large'
  geographic_scope TEXT, -- 'uk', 'ireland', 'uk_ireland', etc.
  data_quality_score DECIMAL(3, 2),

  -- Metadata
  calculation_method TEXT,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(industry_code, metric_name, metric_date, company_size_category, geographic_scope)
);

-- Indexes for industry benchmarks
CREATE INDEX idx_industry_benchmarks_code ON industry_benchmarks(industry_code);
CREATE INDEX idx_industry_benchmarks_metric ON industry_benchmarks(metric_name);
CREATE INDEX idx_industry_benchmarks_date ON industry_benchmarks(metric_date DESC);
CREATE INDEX idx_industry_benchmarks_lookup ON industry_benchmarks(industry_code, metric_name, metric_date DESC);

-- ============================================
-- 3. Peer Groups Table
-- ============================================
-- Defines peer groups for comparative analysis

CREATE TABLE IF NOT EXISTS peer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  org_id UUID, -- Optional: organization-specific peer groups

  -- Group configuration
  selection_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Example selection_criteria:
  {
    "industry_codes": ["62", "63"],
    "size_range": {"min_revenue": 1000000, "max_revenue": 10000000},
    "geography": ["UK", "Ireland"],
    "growth_stage": "scaleup",
    "custom_filters": []
  }
  */

  -- Auto-update settings
  auto_update BOOLEAN DEFAULT false,
  update_frequency TEXT, -- 'daily', 'weekly', 'monthly'
  last_updated TIMESTAMPTZ,

  -- Group metadata
  member_count INTEGER DEFAULT 0,
  homogeneity_score DECIMAL(3, 2), -- 0 to 1, how similar are the members
  avg_similarity_score DECIMAL(3, 2),

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for peer groups
CREATE INDEX idx_peer_groups_org ON peer_groups(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_peer_groups_created_by ON peer_groups(created_by) WHERE created_by IS NOT NULL;

-- ============================================
-- 4. Peer Group Members Table
-- ============================================
-- Maps companies to peer groups

CREATE TABLE IF NOT EXISTS peer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peer_group_id UUID REFERENCES peer_groups(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Membership details
  inclusion_reason TEXT,
  similarity_score DECIMAL(3, 2), -- 0 to 1
  is_core_peer BOOLEAN DEFAULT false, -- Top tier peers
  is_aspirational BOOLEAN DEFAULT false, -- Best-in-class companies to aspire to
  is_competitor BOOLEAN DEFAULT false,

  -- Membership lifecycle
  added_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Unique constraint
  UNIQUE(peer_group_id, company_id)
);

-- Indexes for peer group members
CREATE INDEX idx_peer_members_group ON peer_group_members(peer_group_id);
CREATE INDEX idx_peer_members_company ON peer_group_members(company_id);
CREATE INDEX idx_peer_members_active ON peer_group_members(peer_group_id, is_active) WHERE is_active = true;

-- ============================================
-- 5. Benchmark Comparisons Table
-- ============================================
-- Stores results of benchmark comparisons

CREATE TABLE IF NOT EXISTS benchmark_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  comparison_date DATE NOT NULL,
  comparison_type TEXT CHECK (comparison_type IN ('industry', 'peer_group', 'custom', 'mixed')),

  -- Comparison scope
  peer_group_id UUID REFERENCES peer_groups(id),
  industry_code TEXT,
  custom_company_ids UUID[],

  -- Overall scores
  overall_score DECIMAL(3, 2), -- 0 to 100
  percentile_rank INTEGER, -- 1 to 100
  quartile INTEGER CHECK (quartile IN (1, 2, 3, 4)),

  -- Detailed results (JSONB for flexibility)
  comparison_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Example structure:
  {
    "financial_metrics": {
      "revenue": {"value": 5000000, "percentile": 75, "vs_median": 1.2},
      "profit_margin": {"value": 15, "percentile": 60, "vs_median": 0.9}
    },
    "operational_metrics": {...},
    "growth_metrics": {...}
  }
  */

  percentile_rankings JSONB DEFAULT '{}'::jsonb,
  gap_analysis JSONB DEFAULT '{}'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  opportunities JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- AI analysis (if enabled)
  ai_insights TEXT,
  ai_confidence_score DECIMAL(3, 2),

  -- Cache control
  cache_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for benchmark comparisons
CREATE INDEX idx_benchmark_comparisons_company ON benchmark_comparisons(company_id, comparison_date DESC);
CREATE INDEX idx_benchmark_comparisons_date ON benchmark_comparisons(comparison_date DESC);
CREATE INDEX idx_benchmark_comparisons_peer_group ON benchmark_comparisons(peer_group_id) WHERE peer_group_id IS NOT NULL;

-- ============================================
-- 6. Growth Benchmarks Table
-- ============================================
-- Specialized table for growth metrics and trends

CREATE TABLE IF NOT EXISTS growth_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT CHECK (period_type IN ('month', 'quarter', 'year', 'custom')),

  -- Growth metrics (percentages)
  revenue_cagr DECIMAL(5, 2), -- Compound Annual Growth Rate
  revenue_growth DECIMAL(5, 2),
  customer_cagr DECIMAL(5, 2),
  customer_growth DECIMAL(5, 2),
  employee_cagr DECIMAL(5, 2),
  employee_growth DECIMAL(5, 2),

  -- Growth quality metrics
  organic_growth_rate DECIMAL(5, 2),
  acquisition_growth_rate DECIMAL(5, 2),
  profitable_growth_score DECIMAL(3, 2), -- 0 to 100
  growth_consistency_score DECIMAL(3, 2), -- 0 to 100
  growth_efficiency_ratio DECIMAL(5, 2), -- Revenue growth / Cost growth

  -- Comparative growth
  vs_industry_percentile INTEGER,
  vs_peers_percentile INTEGER,
  growth_trajectory TEXT, -- 'accelerating', 'steady', 'decelerating', 'volatile'
  growth_stage TEXT, -- 'startup', 'scaleup', 'growth', 'mature', 'decline'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, period_start, period_end)
);

-- Indexes for growth benchmarks
CREATE INDEX idx_growth_benchmarks_company ON growth_benchmarks(company_id);
CREATE INDEX idx_growth_benchmarks_period ON growth_benchmarks(period_start, period_end);

-- ============================================
-- 7. Efficiency Scores Table
-- ============================================
-- Stores calculated efficiency metrics

CREATE TABLE IF NOT EXISTS efficiency_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,

  -- Efficiency dimensions (0 to 100 scores)
  operational_efficiency DECIMAL(3, 2),
  financial_efficiency DECIMAL(3, 2),
  labor_efficiency DECIMAL(3, 2),
  asset_efficiency DECIMAL(3, 2),
  digital_efficiency DECIMAL(3, 2),
  overall_efficiency DECIMAL(3, 2),

  -- Detailed metrics
  efficiency_breakdown JSONB DEFAULT '{}'::jsonb,
  /* Example:
  {
    "cost_per_employee": 45000,
    "revenue_per_employee": 125000,
    "asset_turnover": 2.1,
    "working_capital_days": 45
  }
  */

  improvement_areas JSONB DEFAULT '[]'::jsonb,
  best_practices JSONB DEFAULT '[]'::jsonb,
  automation_opportunities JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, calculation_date)
);

-- Indexes for efficiency scores
CREATE INDEX idx_efficiency_scores_company ON efficiency_scores(company_id, calculation_date DESC);

-- ============================================
-- 8. Market Position Table
-- ============================================
-- Tracks market positioning and competitive landscape

CREATE TABLE IF NOT EXISTS market_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,

  -- Market metrics
  market_share DECIMAL(5, 4), -- percentage (0.0000 to 1.0000)
  market_rank INTEGER,
  total_competitors INTEGER,
  competitive_strength_score DECIMAL(3, 2), -- 0 to 100

  -- Strategic positioning
  strategic_group TEXT,
  market_segment TEXT,
  value_proposition_score DECIMAL(3, 2), -- 0 to 100
  differentiation_index DECIMAL(3, 2), -- 0 to 100
  brand_strength_score DECIMAL(3, 2), -- 0 to 100

  -- Competitive analysis
  positioning_analysis JSONB DEFAULT '{}'::jsonb,
  competitive_advantages JSONB DEFAULT '[]'::jsonb,
  competitive_threats JSONB DEFAULT '[]'::jsonb,
  strategic_gaps JSONB DEFAULT '[]'::jsonb,

  -- Market dynamics
  market_growth_rate DECIMAL(5, 2), -- percentage
  market_maturity TEXT, -- 'emerging', 'growing', 'mature', 'declining'
  disruption_risk DECIMAL(3, 2), -- 0 to 100

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, analysis_date)
);

-- Indexes for market positions
CREATE INDEX idx_market_positions_company ON market_positions(company_id, analysis_date DESC);
CREATE INDEX idx_market_positions_rank ON market_positions(market_rank) WHERE market_rank IS NOT NULL;

-- ============================================
-- 9. Benchmark Alerts Table
-- ============================================
-- Tracks significant changes and alerts

CREATE TABLE IF NOT EXISTS benchmark_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'threshold_crossed', 'rank_change', 'peer_movement', etc.
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Alert details
  metric_name TEXT,
  previous_value DECIMAL(15, 4),
  current_value DECIMAL(15, 4),
  threshold_value DECIMAL(15, 4),
  change_percentage DECIMAL(5, 2),

  -- Comparison context
  peer_average DECIMAL(15, 4),
  industry_median DECIMAL(15, 4),

  -- Alert content
  title TEXT NOT NULL,
  message TEXT,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Alert lifecycle
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Notification status
  email_sent BOOLEAN DEFAULT false,
  in_app_shown BOOLEAN DEFAULT false
);

-- Indexes for benchmark alerts
CREATE INDEX idx_benchmark_alerts_company ON benchmark_alerts(company_id);
CREATE INDEX idx_benchmark_alerts_triggered ON benchmark_alerts(triggered_at DESC);
CREATE INDEX idx_benchmark_alerts_unresolved ON benchmark_alerts(company_id, triggered_at DESC)
  WHERE resolved_at IS NULL;

-- ============================================
-- 10. Helper Functions
-- ============================================

-- Function to calculate percentile rank
CREATE OR REPLACE FUNCTION calculate_percentile_rank(
  p_company_id UUID,
  p_metric_name TEXT,
  p_metric_value DECIMAL,
  p_industry_code TEXT DEFAULT NULL,
  p_peer_group_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_percentile INTEGER;
BEGIN
  -- Implementation would calculate percentile based on comparison group
  -- This is a placeholder that returns a mock value
  RETURN FLOOR(RANDOM() * 100 + 1);
END;
$$ LANGUAGE plpgsql;

-- Function to identify peers automatically
CREATE OR REPLACE FUNCTION identify_peers(
  p_company_id UUID,
  p_max_peers INTEGER DEFAULT 20
) RETURNS TABLE(peer_company_id UUID, similarity_score DECIMAL) AS $$
BEGIN
  -- Implementation would use ML/statistical methods to find similar companies
  -- This is a placeholder
  RETURN QUERY
  SELECT id AS peer_company_id, RANDOM()::DECIMAL AS similarity_score
  FROM businesses
  WHERE id != p_company_id
  LIMIT p_max_peers;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. Row Level Security (RLS)
-- ============================================

-- Enable RLS on all benchmarking tables
ALTER TABLE company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE efficiency_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for company_metrics)
CREATE POLICY "Users can view company metrics" ON company_metrics
  FOR SELECT USING (true); -- Adjust based on your auth requirements

CREATE POLICY "Users can manage their company metrics" ON company_metrics
  FOR ALL USING (true); -- Adjust based on your auth requirements

-- ============================================
-- 12. Indexes for Performance
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_company_metrics_revenue ON company_metrics(revenue) WHERE revenue IS NOT NULL;
CREATE INDEX idx_company_metrics_growth ON company_metrics(revenue_growth_yoy) WHERE revenue_growth_yoy IS NOT NULL;
CREATE INDEX idx_benchmark_comparisons_score ON benchmark_comparisons(overall_score DESC) WHERE overall_score IS NOT NULL;

-- ============================================
-- 13. Initial Seed Data (Optional)
-- ============================================

-- Insert some standard industry codes for UK
INSERT INTO industry_benchmarks (industry_code, industry_name, metric_name, metric_date, median_value, sample_size)
VALUES
  ('62', 'Computer programming activities', 'profit_margin', CURRENT_DATE, 15.5, 100),
  ('62', 'Computer programming activities', 'revenue_growth_yoy', CURRENT_DATE, 12.3, 100),
  ('47', 'Retail trade', 'profit_margin', CURRENT_DATE, 8.2, 150),
  ('47', 'Retail trade', 'revenue_growth_yoy', CURRENT_DATE, 5.7, 150)
ON CONFLICT DO NOTHING;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE company_metrics IS 'Stores time-series financial and operational metrics for companies';
COMMENT ON TABLE industry_benchmarks IS 'Aggregated industry statistics for benchmarking comparisons';
COMMENT ON TABLE peer_groups IS 'Defines peer groups for comparative analysis';
COMMENT ON TABLE benchmark_comparisons IS 'Stores results of benchmark comparison analyses';
COMMENT ON TABLE growth_benchmarks IS 'Specialized metrics for growth rate benchmarking';
COMMENT ON TABLE efficiency_scores IS 'Calculated efficiency metrics and improvement opportunities';
COMMENT ON TABLE market_positions IS 'Market positioning and competitive landscape analysis';
COMMENT ON TABLE benchmark_alerts IS 'Alerts for significant benchmark changes and thresholds';

-- Migration completed successfully