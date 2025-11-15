-- ============================================================================
-- WEEKLY UPDATES FEATURE
-- Creates tables for "Deal Intel Weekly" updates system
-- ============================================================================

-- Weekly updates table
CREATE TABLE IF NOT EXISTS weekly_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  featured_image TEXT,
  featured_video TEXT,
  estimated_time_saved TEXT,
  roi_metric TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_weekly_updates_published ON weekly_updates(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_updates_slug ON weekly_updates(slug);
CREATE INDEX IF NOT EXISTS idx_weekly_updates_week_year ON weekly_updates(week_number DESC, year DESC);

-- Update items (features, improvements, fixes, coming soon)
CREATE TABLE IF NOT EXISTS update_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES weekly_updates(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('feature', 'improvement', 'fix', 'coming-soon')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_before TEXT,
  impact_after TEXT,
  improvement_pct NUMERIC,
  media_type TEXT CHECK (media_type IN ('image', 'gif', 'video')),
  media_url TEXT,
  media_alt TEXT,
  cta_label TEXT,
  cta_href TEXT,
  badge TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_items_update ON update_items(update_id);
CREATE INDEX IF NOT EXISTS idx_update_items_category ON update_items(category);
CREATE INDEX IF NOT EXISTS idx_update_items_sort ON update_items(update_id, sort_order);

-- Metrics snapshots
CREATE TABLE IF NOT EXISTS update_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES weekly_updates(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_change TEXT,
  trend_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_metrics_update ON update_metrics(update_id);

-- User spotlights
CREATE TABLE IF NOT EXISTS update_spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES weekly_updates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quote TEXT NOT NULL,
  attribution TEXT NOT NULL,
  company_name TEXT,
  stats JSONB NOT NULL,
  case_study_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_spotlights_update ON update_spotlights(update_id);

-- Email subscriptions
CREATE TABLE IF NOT EXISTS update_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_update_subscriptions_email ON update_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_update_subscriptions_active ON update_subscriptions(subscribed_at) WHERE unsubscribed_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE weekly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_spotlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read access for published updates
DROP POLICY IF EXISTS "Anyone can view published updates" ON weekly_updates;
CREATE POLICY "Anyone can view published updates"
  ON weekly_updates FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= NOW());

DROP POLICY IF EXISTS "Anyone can view update items" ON update_items;
CREATE POLICY "Anyone can view update items"
  ON update_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM weekly_updates
    WHERE id = update_items.update_id
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  ));

DROP POLICY IF EXISTS "Anyone can view metrics" ON update_metrics;
CREATE POLICY "Anyone can view metrics"
  ON update_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM weekly_updates
    WHERE id = update_metrics.update_id
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  ));

DROP POLICY IF EXISTS "Anyone can view spotlights" ON update_spotlights;
CREATE POLICY "Anyone can view spotlights"
  ON update_spotlights FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM weekly_updates
    WHERE id = update_spotlights.update_id
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  ));

-- Users can manage their own subscriptions
DROP POLICY IF EXISTS "Users manage own subscriptions" ON update_subscriptions;
CREATE POLICY "Users manage own subscriptions"
  ON update_subscriptions FOR ALL
  USING (
    auth.uid() = user_id
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow anyone to subscribe (insert only)
DROP POLICY IF EXISTS "Anyone can subscribe" ON update_subscriptions;
CREATE POLICY "Anyone can subscribe"
  ON update_subscriptions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_update_views(p_update_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE weekly_updates
  SET view_count = view_count + 1
  WHERE id = p_update_id;
END;
$$;

-- Function to get latest published update
CREATE OR REPLACE FUNCTION get_latest_update()
RETURNS TABLE (
  id UUID,
  week_number INTEGER,
  year INTEGER,
  slug TEXT,
  headline TEXT,
  summary TEXT,
  published_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wu.id,
    wu.week_number,
    wu.year,
    wu.slug,
    wu.headline,
    wu.summary,
    wu.published_at
  FROM weekly_updates wu
  WHERE wu.published_at IS NOT NULL
    AND wu.published_at <= NOW()
  ORDER BY wu.published_at DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON weekly_updates TO anon, authenticated;
GRANT SELECT ON update_items TO anon, authenticated;
GRANT SELECT ON update_metrics TO anon, authenticated;
GRANT SELECT ON update_spotlights TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON update_subscriptions TO anon, authenticated;

GRANT EXECUTE ON FUNCTION increment_update_views(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_latest_update() TO anon, authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Weekly Updates Feature Migration Completed Successfully!' AS status;
