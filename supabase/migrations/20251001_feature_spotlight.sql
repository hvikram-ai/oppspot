-- Migration: Feature Spotlight Config Table
-- Purpose: Configure which features to spotlight in the dashboard
-- Created: 2025-10-01

-- Create feature_spotlight_config table
CREATE TABLE IF NOT EXISTS feature_spotlight_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Feature details
  feature_id TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Try It Now',
  cta_url TEXT NOT NULL,

  -- Targeting
  target_audience TEXT[] DEFAULT ARRAY['all'],
  min_account_age_days INTEGER DEFAULT 0,
  exclude_users_who_used BOOLEAN DEFAULT TRUE,

  -- Spotlight priority
  priority INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT TRUE,

  -- Visual
  icon_name TEXT,
  badge_text TEXT,
  badge_color TEXT DEFAULT 'blue',

  -- Lifecycle
  start_date DATE,
  end_date DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_spotlight_active ON feature_spotlight_config(active, priority DESC);
CREATE INDEX idx_spotlight_dates ON feature_spotlight_config(start_date, end_date) WHERE active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_feature_spotlight_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feature_spotlight_updated_at
  BEFORE UPDATE ON feature_spotlight_config
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_spotlight_updated_at();

-- Add constraints
ALTER TABLE feature_spotlight_config
  ADD CONSTRAINT check_spotlight_dates_logical
  CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE feature_spotlight_config
  ADD CONSTRAINT check_badge_color
  CHECK (badge_color IN ('blue', 'green', 'purple', 'pink', 'red', 'yellow', 'gray'));

ALTER TABLE feature_spotlight_config
  ADD CONSTRAINT check_priority_range
  CHECK (priority BETWEEN 0 AND 100);

-- Seed initial spotlight configs
INSERT INTO feature_spotlight_config (
  feature_id, feature_name, description, cta_text, cta_url,
  target_audience, icon_name, badge_text, badge_color, priority, active, start_date
) VALUES
  (
    'research_gpt',
    'ResearchGPT™',
    'Generate deep company intelligence in 30 seconds with AI-powered research',
    'Try ResearchGPT™',
    '/research',
    ARRAY['all'],
    'brain',
    'NEW',
    'purple',
    100,
    true,
    CURRENT_DATE
  ),
  (
    'opp_scan',
    'Opp Scan',
    'Find acquisition opportunities with comprehensive AI analysis and market insights',
    'Start Opp Scan',
    '/opp-scan',
    ARRAY['power_users', 'role:manager'],
    'target',
    'PREMIUM',
    'pink',
    90,
    true,
    CURRENT_DATE
  ),
  (
    'ai_scoring',
    'AI Lead Scoring',
    'Predict deal probability and optimal timing with predictive analytics',
    'View AI Scores',
    '/ai-scoring',
    ARRAY['all'],
    'sparkles',
    NULL,
    'blue',
    80,
    true,
    CURRENT_DATE
  ),
  (
    'benchmarking',
    'Company Benchmarking',
    'Compare company performance against industry standards and peer companies',
    'Start Benchmarking',
    '/benchmarking',
    ARRAY['role:manager', 'role:analyst'],
    'bar-chart-3',
    NULL,
    'blue',
    70,
    true,
    CURRENT_DATE
  ),
  (
    'stakeholders',
    'Stakeholder Tracking',
    'Track key relationships, identify champions, and measure influence scores',
    'Manage Stakeholders',
    '/stakeholders',
    ARRAY['role:account_manager', 'role:sales'],
    'users',
    NULL,
    'green',
    60,
    true,
    CURRENT_DATE
  )
ON CONFLICT (feature_id) DO NOTHING;

-- Function to get spotlight items for a user (application layer will call this)
CREATE OR REPLACE FUNCTION get_user_spotlight_items(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  feature_id TEXT,
  feature_name TEXT,
  description TEXT,
  cta_text TEXT,
  cta_url TEXT,
  icon_name TEXT,
  badge_text TEXT,
  badge_color TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.feature_id,
    sc.feature_name,
    sc.description,
    sc.cta_text,
    sc.cta_url,
    sc.icon_name,
    sc.badge_text,
    sc.badge_color,
    sc.priority
  FROM feature_spotlight_config sc
  WHERE sc.active = true
    AND (sc.start_date IS NULL OR sc.start_date <= CURRENT_DATE)
    AND (sc.end_date IS NULL OR sc.end_date >= CURRENT_DATE)
    -- Exclude features user has already used (if configured)
    AND (
      sc.exclude_users_who_used = false
      OR NOT EXISTS (
        SELECT 1 FROM feature_interactions fi
        WHERE fi.user_id = p_user_id
          AND fi.feature_name = sc.feature_id
          AND fi.interaction_type = 'click'
      )
    )
  ORDER BY sc.priority DESC, sc.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_spotlight_items(UUID, INTEGER) TO authenticated;

-- Comment on table
COMMENT ON TABLE feature_spotlight_config IS 'Admin-configured feature spotlight items for dashboard discovery carousel';
COMMENT ON FUNCTION get_user_spotlight_items IS 'Returns personalized spotlight items for a user, excluding features they have already used';
