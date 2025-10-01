-- Migration: Feature Interactions and Dashboard Views Tables
-- Purpose: Track user interactions with features and dashboard analytics
-- Created: 2025-10-01

-- Create interaction_type ENUM
CREATE TYPE interaction_type AS ENUM (
  'view',
  'click',
  'complete',
  'dismiss',
  'share'
);

-- Create feature_interactions table
CREATE TABLE IF NOT EXISTS feature_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Feature identification
  feature_name TEXT NOT NULL,
  interaction_type interaction_type NOT NULL,

  -- Interaction context
  context JSONB,
  /* Example:
  {
    "source": "feature_spotlight",
    "spotlight_position": 1,
    "time_to_interact_ms": 3500
  }
  */

  -- Session tracking
  session_id TEXT,
  page_url TEXT,
  referrer_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dashboard_views table
CREATE TABLE IF NOT EXISTS dashboard_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- View metadata
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,

  -- Device/browser info
  device_type TEXT,
  browser TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Performance metrics (Web Vitals)
  time_to_first_byte_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  time_to_interactive_ms INTEGER,
  largest_contentful_paint_ms INTEGER,
  cumulative_layout_shift NUMERIC(5,3),

  -- Engagement metrics
  time_on_page_seconds INTEGER,
  scroll_depth_percent INTEGER CHECK (scroll_depth_percent BETWEEN 0 AND 100),
  interactions_count INTEGER DEFAULT 0,

  -- Referrer
  referrer_source TEXT,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT
);

-- Create indexes for feature_interactions
CREATE INDEX idx_feature_int_user_feature ON feature_interactions(user_id, feature_name);
CREATE INDEX idx_feature_int_type_created ON feature_interactions(
  interaction_type, created_at DESC
);
CREATE INDEX idx_feature_int_created ON feature_interactions(created_at DESC);
CREATE INDEX idx_feature_int_session ON feature_interactions(session_id) WHERE session_id IS NOT NULL;

-- Create indexes for dashboard_views
CREATE INDEX idx_dashboard_views_user_date ON dashboard_views(user_id, viewed_at DESC);
CREATE INDEX idx_dashboard_views_device ON dashboard_views(device_type, viewed_at DESC);
CREATE INDEX idx_dashboard_views_session ON dashboard_views(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_dashboard_views_performance ON dashboard_views(
  time_to_interactive_ms
) WHERE time_to_interactive_ms IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE feature_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_interactions
CREATE POLICY "Users can view own interactions"
  ON feature_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON feature_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for dashboard_views
CREATE POLICY "Users can view own analytics"
  ON dashboard_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own views"
  ON dashboard_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analytics Views
CREATE OR REPLACE VIEW feature_discovery_rate AS
SELECT
  feature_name,
  COUNT(DISTINCT user_id) FILTER (WHERE interaction_type = 'click') * 100.0 /
    NULLIF(COUNT(DISTINCT user_id), 0) AS discovery_rate_pct,
  AVG(
    EXTRACT(EPOCH FROM created_at - (
      SELECT created_at FROM profiles WHERE id = feature_interactions.user_id
    )) / 86400
  ) AS avg_days_to_discover,
  COUNT(*) FILTER (WHERE interaction_type = 'click') AS total_clicks,
  COUNT(*) FILTER (WHERE interaction_type = 'complete') AS total_completions
FROM feature_interactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature_name;

CREATE OR REPLACE VIEW dashboard_performance_stats AS
SELECT
  DATE_TRUNC('day', viewed_at) AS date,
  device_type,
  COUNT(*) AS total_views,
  AVG(first_contentful_paint_ms) AS avg_fcp_ms,
  AVG(time_to_interactive_ms) AS avg_tti_ms,
  AVG(largest_contentful_paint_ms) AS avg_lcp_ms,
  AVG(cumulative_layout_shift) AS avg_cls,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY time_to_interactive_ms) AS p75_tti_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY time_to_interactive_ms) AS p95_tti_ms
FROM dashboard_views
WHERE viewed_at >= NOW() - INTERVAL '30 days'
  AND time_to_interactive_ms IS NOT NULL
GROUP BY DATE_TRUNC('day', viewed_at), device_type
ORDER BY date DESC, device_type;

-- Function to cleanup old analytics data (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM feature_interactions WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM dashboard_views WHERE viewed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Add constraints
ALTER TABLE dashboard_views
  ADD CONSTRAINT check_device_type
  CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop'));

-- Comments on tables
COMMENT ON TABLE feature_interactions IS 'Tracks user interactions with features for analytics and spotlight rotation';
COMMENT ON TABLE dashboard_views IS 'Tracks dashboard page views with performance metrics and engagement data';
COMMENT ON VIEW feature_discovery_rate IS 'Analytics view showing feature discovery rates and adoption metrics';
COMMENT ON VIEW dashboard_performance_stats IS 'Analytics view showing dashboard performance metrics by day and device type';
