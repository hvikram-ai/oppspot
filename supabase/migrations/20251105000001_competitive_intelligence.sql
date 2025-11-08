-- Competitive Intelligence Feature
-- Migration: Create tables for competitive analysis tracking

-- =============================================================================
-- TABLES
-- =============================================================================

-- Main competitive analyses table
CREATE TABLE IF NOT EXISTS competitive_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  target_company_name TEXT NOT NULL CHECK (char_length(target_company_name) <= 200),
  target_company_website TEXT CHECK (target_company_website ~* '^https://.*'),
  description TEXT CHECK (char_length(description) <= 2000),
  market_segment TEXT CHECK (char_length(market_segment) <= 100),
  geography TEXT CHECK (char_length(geography) <= 100),

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

  -- Metrics (calculated from competitors)
  average_feature_parity NUMERIC(5,2) DEFAULT 0,
  moat_score NUMERIC(5,2) DEFAULT 0,
  deal_status TEXT DEFAULT 'discovery' CHECK (deal_status IN ('discovery', 'evaluation', 'negotiation', 'closed_won', 'closed_lost')),

  -- Data freshness
  last_refreshed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Core fields
  competitor_name TEXT NOT NULL CHECK (char_length(competitor_name) <= 200),
  competitor_website TEXT CHECK (competitor_website ~* '^https://.*'),

  -- Classification
  relationship_type TEXT DEFAULT 'direct_competitor' CHECK (relationship_type IN ('direct_competitor', 'adjacent_market', 'potential_threat', 'substitute')),
  threat_level TEXT DEFAULT 'medium' CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),

  -- Analysis data
  feature_parity_score NUMERIC(5,2),
  pricing_position TEXT CHECK (pricing_position IN ('lower', 'similar', 'higher', 'premium', 'freemium')),
  market_share_estimate NUMERIC(5,2),

  -- Notes
  notes TEXT CHECK (char_length(notes) <= 1000),
  strengths TEXT[],
  weaknesses TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(analysis_id, competitor_name)
);

-- Access grants for sharing analyses
CREATE TABLE IF NOT EXISTS competitive_analysis_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Access level
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit', 'admin')),

  -- Invitation metadata
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(analysis_id, user_id)
);

-- Refresh jobs tracking
CREATE TABLE IF NOT EXISTS competitive_analysis_refresh_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

  -- Progress tracking
  total_competitors INTEGER NOT NULL,
  completed_competitors INTEGER NOT NULL DEFAULT 0,

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  triggered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_competitive_analyses_created_by ON competitive_analyses(created_by);
CREATE INDEX IF NOT EXISTS idx_competitive_analyses_status ON competitive_analyses(status);
CREATE INDEX IF NOT EXISTS idx_competitive_analyses_created_at ON competitive_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitors_analysis_id ON competitors(analysis_id);
CREATE INDEX IF NOT EXISTS idx_competitors_created_at ON competitors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_grants_analysis_id ON competitive_analysis_access_grants(analysis_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON competitive_analysis_access_grants(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_jobs_analysis_id ON competitive_analysis_refresh_jobs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_refresh_jobs_status ON competitive_analysis_refresh_jobs(status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE competitive_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_analysis_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_analysis_refresh_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for competitive_analyses
CREATE POLICY "Users can view their own analyses"
  ON competitive_analyses FOR SELECT
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM competitive_analysis_access_grants
      WHERE analysis_id = competitive_analyses.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create analyses"
  ON competitive_analyses FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own analyses"
  ON competitive_analyses FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM competitive_analysis_access_grants
      WHERE analysis_id = competitive_analyses.id
      AND user_id = auth.uid()
      AND access_level IN ('edit', 'admin')
    )
  );

CREATE POLICY "Users can delete their own analyses"
  ON competitive_analyses FOR DELETE
  USING (created_by = auth.uid());

-- Policies for competitors
CREATE POLICY "Users can view competitors of accessible analyses"
  ON competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitors.analysis_id
      AND (
        created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM competitive_analysis_access_grants
          WHERE analysis_id = competitors.analysis_id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can add competitors to accessible analyses"
  ON competitors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitors.analysis_id
      AND (
        created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM competitive_analysis_access_grants
          WHERE analysis_id = competitors.analysis_id
          AND user_id = auth.uid()
          AND access_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can update competitors of accessible analyses"
  ON competitors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitors.analysis_id
      AND (
        created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM competitive_analysis_access_grants
          WHERE analysis_id = competitors.analysis_id
          AND user_id = auth.uid()
          AND access_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can delete competitors of accessible analyses"
  ON competitors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitors.analysis_id
      AND (
        created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM competitive_analysis_access_grants
          WHERE analysis_id = competitors.analysis_id
          AND user_id = auth.uid()
          AND access_level IN ('edit', 'admin')
        )
      )
    )
  );

-- Policies for access_grants
CREATE POLICY "Users can view grants for their analyses"
  ON competitive_analysis_access_grants FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_access_grants.analysis_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can grant access to their analyses"
  ON competitive_analysis_access_grants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_access_grants.analysis_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can revoke access from their analyses"
  ON competitive_analysis_access_grants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_access_grants.analysis_id
      AND created_by = auth.uid()
    )
  );

-- Policies for refresh_jobs
CREATE POLICY "Users can view refresh jobs for accessible analyses"
  ON competitive_analysis_refresh_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_refresh_jobs.analysis_id
      AND (
        created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM competitive_analysis_access_grants
          WHERE analysis_id = competitive_analysis_refresh_jobs.analysis_id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Owners can create refresh jobs"
  ON competitive_analysis_refresh_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_refresh_jobs.analysis_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "System can update refresh jobs"
  ON competitive_analysis_refresh_jobs FOR UPDATE
  USING (true);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitive_analyses_updated_at
  BEFORE UPDATE ON competitive_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to check if user has access to an analysis
CREATE OR REPLACE FUNCTION has_analysis_access(
  p_analysis_id UUID,
  p_user_id UUID,
  p_required_level TEXT DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
  is_owner BOOLEAN;
  user_access_level TEXT;
BEGIN
  -- Check if user is owner
  SELECT EXISTS (
    SELECT 1 FROM competitive_analyses
    WHERE id = p_analysis_id AND created_by = p_user_id
  ) INTO is_owner;

  IF is_owner THEN
    RETURN TRUE;
  END IF;

  -- Check access grant
  SELECT access_level INTO user_access_level
  FROM competitive_analysis_access_grants
  WHERE analysis_id = p_analysis_id AND user_id = p_user_id;

  IF user_access_level IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check access level
  IF p_required_level = 'view' THEN
    RETURN TRUE;
  ELSIF p_required_level = 'edit' THEN
    RETURN user_access_level IN ('edit', 'admin');
  ELSIF p_required_level = 'admin' THEN
    RETURN user_access_level = 'admin';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate average feature parity
CREATE OR REPLACE FUNCTION calculate_average_feature_parity(p_analysis_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_parity NUMERIC;
BEGIN
  SELECT AVG(feature_parity_score)
  INTO avg_parity
  FROM competitors
  WHERE analysis_id = p_analysis_id
  AND feature_parity_score IS NOT NULL;

  RETURN COALESCE(avg_parity, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate moat score (simplified version)
CREATE OR REPLACE FUNCTION calculate_moat_score(p_analysis_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  competitor_count INTEGER;
  avg_threat NUMERIC;
  moat NUMERIC;
BEGIN
  SELECT COUNT(*), AVG(
    CASE threat_level
      WHEN 'low' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'high' THEN 3
      WHEN 'critical' THEN 4
      ELSE 2
    END
  )
  INTO competitor_count, avg_threat
  FROM competitors
  WHERE analysis_id = p_analysis_id;

  IF competitor_count = 0 THEN
    RETURN 0;
  END IF;

  -- Simple moat score: lower threat = higher moat
  -- Scale: 0-100, inversely proportional to average threat
  moat := 100 - ((avg_threat - 1) * 33.33);

  RETURN GREATEST(0, LEAST(100, moat));
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA (for development/testing)
-- =============================================================================

-- Uncomment to insert sample data
-- INSERT INTO competitive_analyses (created_by, title, target_company_name, target_company_website, description, market_segment, geography, status)
-- VALUES (
--   (SELECT id FROM auth.users LIMIT 1),
--   'Q4 2024 SaaS Analytics Competitive Analysis',
--   'Acme Analytics Inc.',
--   'https://acmeanalytics.com',
--   'Comprehensive competitive landscape analysis for our SaaS analytics product launch in Q4 2024.',
--   'B2B SaaS Analytics',
--   'North America',
--   'active'
-- );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE competitive_analyses IS 'Competitive analysis tracking for deals and market intelligence';
COMMENT ON TABLE competitors IS 'Individual competitors tracked within each analysis';
COMMENT ON TABLE competitive_analysis_access_grants IS 'Sharing and collaboration access control';
COMMENT ON TABLE competitive_analysis_refresh_jobs IS 'Background job tracking for data refresh operations';

COMMENT ON FUNCTION has_analysis_access IS 'Check if user has required access level to an analysis';
COMMENT ON FUNCTION calculate_average_feature_parity IS 'Calculate average feature parity score across all competitors';
COMMENT ON FUNCTION calculate_moat_score IS 'Calculate competitive moat score based on threat levels';
